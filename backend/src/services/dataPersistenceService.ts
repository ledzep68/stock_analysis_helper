import { db } from '../config/database';
import { realTimePriceService } from './realTimePriceService';
import { APP_CONSTANTS } from '../utils/constants';
import { DatabaseHelper } from '../utils/database.helper';
import { ErrorHandler } from '../utils/error.handler';

export interface PriceRecord {
  id?: string;
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  volume: number;
  marketCap?: number;
  pe?: number;
  eps?: number;
  dividendYield?: number;
  week52High?: number;
  week52Low?: number;
  timestamp: Date;
  source: 'live' | 'mock';
}

export interface HistoricalDataPoint {
  symbol: string;
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  adjustedClose: number;
}

class DataPersistenceService {
  private persistenceInterval: NodeJS.Timeout | null = null;
  private batchSize = APP_CONSTANTS.BATCH_SIZE.PRICE_PERSISTENCE;
  private persistenceIntervalMs = APP_CONSTANTS.MONITORING.METRICS_FLUSH_INTERVAL;

  /**
   * 永続化サービス開始
   */
  startPersistence(): void {
    if (this.persistenceInterval) {
      return;
    }

    console.log('💾 Starting data persistence service...');

    // 1分間隔でリアルタイムデータを永続化
    this.persistenceInterval = setInterval(async () => {
      await this.persistRealTimePrices();
    }, this.persistenceIntervalMs);

    // 起動時に即座に実行
    this.persistRealTimePrices();

    console.log('✅ Data persistence service started');
  }

  /**
   * 永続化サービス停止
   */
  stopPersistence(): void {
    if (this.persistenceInterval) {
      clearInterval(this.persistenceInterval);
      this.persistenceInterval = null;
      console.log('⏹️ Data persistence service stopped');
    }
  }

  /**
   * リアルタイム価格データ永続化
   */
  private async persistRealTimePrices(): Promise<void> {
    try {
      console.log('💾 Persisting real-time price data...');

      // アクティブシンボル取得
      const activeSymbols = await this.getActiveSymbols();
      
      if (activeSymbols.length === 0) {
        console.log('No active symbols to persist');
        return;
      }

      let persistedCount = 0;

      for (const symbol of activeSymbols) {
        try {
          const priceUpdate = await realTimePriceService.getPriceUpdate(symbol);
          
          if (priceUpdate) {
            await this.savePriceRecord({
              symbol: priceUpdate.symbol,
              price: priceUpdate.price,
              change: priceUpdate.change,
              changePercent: priceUpdate.changePercent,
              volume: priceUpdate.volume,
              timestamp: priceUpdate.timestamp,
              source: priceUpdate.source
            });
            persistedCount++;
          }
        } catch (error) {
          console.error(`Failed to persist data for ${symbol}:`, error);
        }
      }

      console.log(`💾 Persisted ${persistedCount}/${activeSymbols.length} price records`);

      // 古いデータのクリーンアップ
      await this.cleanupOldData();

    } catch (error) {
      console.error('❌ Error in data persistence:', error);
    }
  }

  /**
   * 価格レコード保存
   */
  async savePriceRecord(record: PriceRecord): Promise<void> {
    const recordId = `price_${record.symbol}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

    await db.run(`
      INSERT INTO real_time_prices (
        id, symbol, price, change_amount, change_percent, volume, 
        market_cap, pe_ratio, eps, dividend_yield, week_52_high, week_52_low,
        timestamp, source, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      recordId,
      record.symbol,
      record.price,
      record.change,
      record.changePercent,
      record.volume,
      record.marketCap || null,
      record.pe || null,
      record.eps || null,
      record.dividendYield || null,
      record.week52High || null,
      record.week52Low || null,
      record.timestamp.toISOString(),
      record.source,
      new Date().toISOString()
    ]);
  }

  /**
   * 履歴データ保存
   */
  async saveHistoricalData(data: HistoricalDataPoint[]): Promise<void> {
    console.log(`💾 Saving ${data.length} historical data points...`);

    for (const point of data) {
      try {
        await db.run(`
          INSERT OR REPLACE INTO stock_prices (
            symbol, date, open_price, high_price, low_price, 
            close_price, volume, adjusted_close
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `, [
          point.symbol,
          point.date,
          point.open,
          point.high,
          point.low,
          point.close,
          point.volume,
          point.adjustedClose
        ]);
      } catch (error) {
        console.error(`Failed to save historical data for ${point.symbol} on ${point.date}:`, error);
      }
    }

    console.log('✅ Historical data saved successfully');
  }

  /**
   * 価格履歴取得
   */
  async getPriceHistory(symbol: string, days: number = 30): Promise<PriceRecord[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const rows = await db.all(`
      SELECT * FROM real_time_prices 
      WHERE symbol = ? AND timestamp >= ?
      ORDER BY timestamp DESC
      LIMIT 1000
    `, [symbol, cutoffDate.toISOString()]);

    return rows.map(row => ({
      id: row.id,
      symbol: row.symbol,
      price: row.price,
      change: row.change_amount,
      changePercent: row.change_percent,
      volume: row.volume,
      marketCap: row.market_cap,
      pe: row.pe_ratio,
      eps: row.eps,
      dividendYield: row.dividend_yield,
      week52High: row.week_52_high,
      week52Low: row.week_52_low,
      timestamp: new Date(row.timestamp),
      source: row.source
    }));
  }

  /**
   * 最新価格取得
   */
  async getLatestPrice(symbol: string): Promise<PriceRecord | null> {
    const row = await db.get(`
      SELECT * FROM real_time_prices 
      WHERE symbol = ? 
      ORDER BY timestamp DESC 
      LIMIT 1
    `, [symbol]);

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      symbol: row.symbol,
      price: row.price,
      change: row.change_amount,
      changePercent: row.change_percent,
      volume: row.volume,
      marketCap: row.market_cap,
      pe: row.pe_ratio,
      eps: row.eps,
      dividendYield: row.dividend_yield,
      week52High: row.week_52_high,
      week52Low: row.week_52_low,
      timestamp: new Date(row.timestamp),
      source: row.source
    };
  }

  /**
   * 価格統計取得
   */
  async getPriceStatistics(symbol: string, days: number = 30): Promise<any> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - days);

    const stats = await db.get(`
      SELECT 
        COUNT(*) as total_records,
        AVG(price) as avg_price,
        MIN(price) as min_price,
        MAX(price) as max_price,
        AVG(volume) as avg_volume,
        MIN(volume) as min_volume,
        MAX(volume) as max_volume,
        COUNT(CASE WHEN source = 'live' THEN 1 END) as live_data_count,
        COUNT(CASE WHEN source = 'mock' THEN 1 END) as mock_data_count
      FROM real_time_prices 
      WHERE symbol = ? AND timestamp >= ?
    `, [symbol, cutoffDate.toISOString()]);

    return {
      symbol,
      days,
      ...stats,
      data_quality: stats.live_data_count / Math.max(stats.total_records, 1)
    };
  }

  /**
   * アクティブシンボル取得
   */
  private async getActiveSymbols(): Promise<string[]> {
    // お気に入りと最近検索されたシンボルを取得
    const favoriteRows = await db.all(`
      SELECT DISTINCT symbol FROM favorites 
      WHERE updated_at >= datetime('now', '-7 days')
    `);

    const alertRows = await db.all(`
      SELECT DISTINCT symbol FROM price_alerts 
      WHERE is_active = 1
    `);

    const defaultSymbols = ['7203', '9984', '6758', '4689', '8306']; // 主要日本株

    const allSymbols = new Set([
      ...favoriteRows.map(row => row.symbol),
      ...alertRows.map(row => row.symbol),
      ...defaultSymbols
    ]);

    return Array.from(allSymbols);
  }

  /**
   * 古いデータクリーンアップ
   */
  async cleanupOldData(): Promise<void> {
    const retentionDays = APP_CONSTANTS.DATA_RETENTION_DAYS;
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await db.run(`
      DELETE FROM real_time_prices 
      WHERE timestamp < ?
    `, [cutoffDate.toISOString()]);

    if (result.changes > 0) {
      console.log(`🧹 Cleaned up ${result.changes} old price records`);
    }
  }

  /**
   * データベース最適化
   */
  async optimizeDatabase(): Promise<void> {
    console.log('🔧 Optimizing database...');

    try {
      // VACUUM実行
      await db.run('VACUUM');
      
      // ANALYZE実行
      await db.run('ANALYZE');

      console.log('✅ Database optimization completed');
    } catch (error) {
      console.error('❌ Database optimization failed:', error);
    }
  }

  /**
   * データ整合性チェック
   */
  async checkDataIntegrity(): Promise<any> {
    console.log('🔍 Checking data integrity...');

    const totalRecords = await db.get('SELECT COUNT(*) as total_records FROM real_time_prices');

    // 重複チェック
    const duplicates = await db.get(`
      SELECT COUNT(*) as duplicate_count 
      FROM (
        SELECT symbol, date(timestamp) as date, COUNT(*) as cnt
        FROM real_time_prices 
        GROUP BY symbol, date(timestamp)
        HAVING COUNT(*) > 100
      )
    `);

    // 不正価格チェック
    const invalidPrices = await db.get(`
      SELECT COUNT(*) as invalid_price_count
      FROM real_time_prices 
      WHERE price <= 0 OR price IS NULL
    `);
    
    // 古いデータチェック
    const oldData = await db.get(`
      SELECT COUNT(*) as old_data_count
      FROM real_time_prices 
      WHERE timestamp < datetime('now', '-90 days')
    `);

    const issues = [];
    if (duplicates.duplicate_count > 0) {
      issues.push(`${duplicates.duplicate_count} duplicate records found`);
    }
    if (invalidPrices.invalid_price_count > 0) {
      issues.push(`${invalidPrices.invalid_price_count} records with invalid prices`);
    }
    if (oldData.old_data_count > 0) {
      issues.push(`${oldData.old_data_count} records older than retention period`);
    }

    const report = {
      status: issues.length > 0 ? 'ISSUES_FOUND' : 'HEALTHY',
      totalRecords: totalRecords.total_records,
      issues,
      lastChecked: new Date().toISOString()
    };

    console.log('📊 Data integrity report:', report);
    return report;
  }

  /**
   * エクスポート機能
   */
  async exportData(symbol: string, format: 'csv' | 'json' = 'json'): Promise<string> {
    const data = await this.getPriceHistory(symbol, 30);

    if (format === 'csv') {
      const headers = ['timestamp', 'symbol', 'price', 'change', 'changePercent', 'volume', 'source'];
      const csvData = [
        headers.join(','),
        ...data.map(record => [
          record.timestamp.toISOString(),
          record.symbol,
          record.price,
          record.change,
          record.changePercent,
          record.volume,
          record.source
        ].join(','))
      ].join('\n');

      return csvData;
    }

    return JSON.stringify(data, null, 2);
  }
}

export const dataPersistenceService = new DataPersistenceService();