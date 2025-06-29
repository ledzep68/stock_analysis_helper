/**
 * リアルタイム価格配信サービス
 */

import { TestLogger } from '../utils/testLogger';
import { hybridApiService } from './hybridApiService';
import { sqliteDb } from '../config/sqlite';
import { PriceUpdateMessage } from './webSocketService';

export interface PriceCache {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  lastUpdate: Date;
  source: 'live' | 'mock';
}

class RealTimePriceService {
  private logger: TestLogger;
  private priceCache: Map<string, PriceCache> = new Map();
  private updatePromises: Map<string, Promise<PriceCache>> = new Map();

  constructor() {
    this.logger = new TestLogger('RealTimePriceService');
  }

  /**
   * 複数銘柄の価格更新を並行取得
   */
  async getMultiplePriceUpdates(symbols: string[]): Promise<PriceUpdateMessage[]> {
    const updates: PriceUpdateMessage[] = [];
    
    // 並行処理で価格データ取得
    const promises = symbols.map(symbol => this.getPriceUpdate(symbol));
    const results = await Promise.allSettled(promises);

    results.forEach((result, index) => {
      if (result.status === 'fulfilled' && result.value) {
        updates.push(result.value);
      } else {
        this.logger.warn(`Failed to get price for ${symbols[index]}:`, result.status === 'rejected' ? result.reason : 'Unknown error');
      }
    });

    return updates;
  }

  /**
   * 単一銘柄の価格更新取得
   */
  async getPriceUpdate(symbol: string): Promise<PriceUpdateMessage | null> {
    try {
      symbol = symbol.toUpperCase();

      // キャッシュ確認（30秒以内は再利用）
      const cached = this.priceCache.get(symbol);
      if (cached && this.isCacheValid(cached)) {
        return this.convertToUpdateMessage(cached);
      }

      // 重複リクエスト防止
      if (this.updatePromises.has(symbol)) {
        const cachedResult = await this.updatePromises.get(symbol)!;
        return this.convertToUpdateMessage(cachedResult);
      }

      // 新しい価格データ取得
      const updatePromise = this.fetchFreshPriceData(symbol);
      this.updatePromises.set(symbol, updatePromise);

      try {
        const priceData = await updatePromise;
        this.priceCache.set(symbol, priceData);
        return this.convertToUpdateMessage(priceData);
      } finally {
        this.updatePromises.delete(symbol);
      }

    } catch (error) {
      this.logger.error(`Error getting price update for ${symbol}:`, error);
      
      // エラー時はキャッシュされた価格を返す（古くても）
      const cached = this.priceCache.get(symbol);
      if (cached) {
        return this.convertToUpdateMessage(cached);
      }
      
      return null;
    }
  }

  /**
   * 新しい価格データを外部APIから取得
   */
  private async fetchFreshPriceData(symbol: string): Promise<PriceCache> {
    try {
      // ハイブリッドAPIサービスを使用
      const financialData = await hybridApiService.getFinancialData(symbol);
      
      if (financialData) {
        const priceData: PriceCache = {
          symbol: financialData.symbol,
          price: financialData.price,
          change: financialData.change,
          changePercent: financialData.changePercent,
          volume: financialData.volume,
          lastUpdate: new Date(),
          source: 'live'
        };

        // データベースに価格履歴を保存
        await this.savePriceToDatabase(priceData);
        
        return priceData;
      }

    } catch (error) {
      this.logger.warn(`API fetch failed for ${symbol}, using mock data:`, error);
    }

    // APIが失敗した場合はモック価格生成
    return this.generateMockPriceData(symbol);
  }

  /**
   * モック価格データ生成（開発・テスト用）
   */
  private generateMockPriceData(symbol: string): PriceCache {
    const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const basePrice = (seed % 2000) + 500; // 500-2500の範囲
    
    // 前回価格があれば小幅変動、なければ新規
    const previousPrice = this.priceCache.get(symbol)?.price || basePrice;
    
    // -2%から+2%の範囲で変動
    const volatility = 0.02;
    const randomFactor = Math.sin(Date.now() / 1000 + seed) * volatility;
    const newPrice = previousPrice * (1 + randomFactor);
    
    const change = newPrice - previousPrice;
    const changePercent = previousPrice !== 0 ? (change / previousPrice) * 100 : 0;
    
    // 出来高もランダム生成
    const baseVolume = (seed % 50000000) + 5000000;
    const volumeVariation = Math.random() * 0.5 + 0.75; // 75%-125%
    const volume = Math.floor(baseVolume * volumeVariation);

    return {
      symbol,
      price: Math.round(newPrice * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 1000) / 1000,
      volume,
      lastUpdate: new Date(),
      source: 'mock'
    };
  }

  /**
   * 価格履歴をデータベースに保存
   */
  private async savePriceToDatabase(priceData: PriceCache) {
    try {
      const query = `
        INSERT OR REPLACE INTO stock_prices 
        (symbol, date, open_price, high_price, low_price, close_price, volume, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `;
      
      const today = new Date().toISOString().split('T')[0];
      
      await sqliteDb.query(query, [
        priceData.symbol,
        today,
        priceData.price, // 簡略化：Open = Current
        priceData.price * 1.02, // 簡略化：High = Current * 1.02
        priceData.price * 0.98, // 簡略化：Low = Current * 0.98
        priceData.price,
        priceData.volume,
        new Date().toISOString()
      ]);

    } catch (error) {
      this.logger.warn(`Failed to save price to database for ${priceData.symbol}:`, error);
    }
  }

  /**
   * キャッシュ有効性チェック
   */
  private isCacheValid(cache: PriceCache): boolean {
    const now = new Date();
    const ageMs = now.getTime() - cache.lastUpdate.getTime();
    const maxAgeMs = 30 * 1000; // 30秒
    
    return ageMs < maxAgeMs;
  }

  /**
   * PriceCacheをPriceUpdateMessageに変換
   */
  private convertToUpdateMessage(cache: PriceCache): PriceUpdateMessage {
    return {
      symbol: cache.symbol,
      price: cache.price,
      change: cache.change,
      changePercent: cache.changePercent,
      volume: cache.volume,
      timestamp: cache.lastUpdate,
      source: cache.source
    };
  }

  /**
   * 特定銘柄のキャッシュ削除
   */
  public clearCache(symbol?: string) {
    if (symbol) {
      this.priceCache.delete(symbol.toUpperCase());
      this.logger.info(`Cleared cache for ${symbol}`);
    } else {
      this.priceCache.clear();
      this.logger.info('Cleared all price cache');
    }
  }

  /**
   * キャッシュ統計情報
   */
  public getCacheStats() {
    const stats = {
      totalCached: this.priceCache.size,
      validCache: 0,
      expiredCache: 0,
      symbols: Array.from(this.priceCache.keys())
    };

    this.priceCache.forEach(cache => {
      if (this.isCacheValid(cache)) {
        stats.validCache++;
      } else {
        stats.expiredCache++;
      }
    });

    return stats;
  }

  /**
   * 期限切れキャッシュのクリーンアップ
   */
  public cleanupExpiredCache() {
    const expiredSymbols: string[] = [];
    
    this.priceCache.forEach((cache, symbol) => {
      if (!this.isCacheValid(cache)) {
        expiredSymbols.push(symbol);
      }
    });

    expiredSymbols.forEach(symbol => {
      this.priceCache.delete(symbol);
    });

    this.logger.debug(`Cleaned up ${expiredSymbols.length} expired cache entries`);
    return expiredSymbols.length;
  }
}

export const realTimePriceService = new RealTimePriceService();