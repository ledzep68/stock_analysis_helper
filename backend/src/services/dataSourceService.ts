import axios from 'axios';
import { sqliteDb } from '../config/sqlite';
import { Company, FinancialData } from '../types';
import { FreeApiService } from './freeApiService';
import { ReliableApiService } from './reliableApiService';
import { PublicApiService } from './publicApiService';

// 複数のデータソースを管理するサービス
export class DataSourceService {
  // データソースの優先順位
  private static dataSources = [
    'database',
    'finnhub',
    'polygon',
    'alphaVantage',
    'yahooFinance',
    'mock'
  ];

  // APIキー（環境変数から取得）
  private static apiKeys = {
    finnhub: process.env.FINNHUB_API_KEY || '',
    polygon: process.env.POLYGON_API_KEY || '',
    alphaVantage: process.env.ALPHA_VANTAGE_API_KEY || ''
  };

  // データベースから企業データを取得
  static async getFromDatabase(symbol: string): Promise<FinancialData | null> {
    try {
      const result = await sqliteDb.query(
        'SELECT * FROM companies WHERE symbol = ?',
        [symbol]
      );
      const company = result.rows[0];

      if (!company) {
        return null;
      }

      // 価格履歴から最新データを取得
      const priceResult = await sqliteDb.query(
        `SELECT * FROM stock_prices 
         WHERE symbol = ? 
         ORDER BY date DESC 
         LIMIT 1`,
        [symbol]
      );
      const latestPrice = priceResult.rows[0];

      return {
        symbol: company.symbol,
        price: latestPrice?.close_price || company.current_price || 0,
        previousClose: latestPrice?.open_price || company.current_price - company.price_change,
        change: company.price_change || 0,
        changePercent: company.change_percentage || 0,
        volume: latestPrice?.volume || company.volume || 0,
        avgVolume: company.volume || 0,
        marketCap: company.market_cap || 0,
        pe: this.calculatePE(company.current_price, company.eps),
        eps: company.eps || this.estimateEPS(company.current_price),
        dividendYield: company.dividend_yield || 0,
        week52High: latestPrice?.high_price || company.current_price * 1.2,
        week52Low: latestPrice?.low_price || company.current_price * 0.8
      };
    } catch (error) {
      console.error('Database error:', error);
      return null;
    }
  }

  // Finnhub API（無料プラン対応）
  static async getFromFinnhub(symbol: string): Promise<FinancialData | null> {
    if (!this.apiKeys.finnhub) return null;

    try {
      const response = await axios.get(
        `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${this.apiKeys.finnhub}`,
        { timeout: 5000 }
      );

      const data = response.data;
      if (!data || data.c === 0) return null;

      return {
        symbol,
        price: data.c, // Current price
        previousClose: data.pc, // Previous close
        change: data.d, // Change
        changePercent: data.dp, // Change percent
        volume: 0, // Finnhub doesn't provide volume in quote
        avgVolume: 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: data.h, // High price of the day
        week52Low: data.l // Low price of the day
      };
    } catch (error) {
      console.error('Finnhub API error:', error);
      return null;
    }
  }

  // Polygon.io API（無料プラン対応）
  static async getFromPolygon(symbol: string): Promise<FinancialData | null> {
    if (!this.apiKeys.polygon) return null;

    try {
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apiKey=${this.apiKeys.polygon}`,
        { timeout: 5000 }
      );

      const data = response.data.results?.[0];
      if (!data) return null;

      return {
        symbol,
        price: data.c, // Close price
        previousClose: data.o, // Open price
        change: data.c - data.o,
        changePercent: ((data.c - data.o) / data.o) * 100,
        volume: data.v,
        avgVolume: data.v,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: data.h,
        week52Low: data.l
      };
    } catch (error) {
      console.error('Polygon API error:', error);
      return null;
    }
  }

  // Alpha Vantage API（無料プラン対応）
  static async getFromAlphaVantage(symbol: string): Promise<FinancialData | null> {
    if (!this.apiKeys.alphaVantage) return null;

    try {
      const response = await axios.get(
        `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${this.apiKeys.alphaVantage}`,
        { timeout: 5000 }
      );

      const data = response.data['Global Quote'];
      if (!data) return null;

      return {
        symbol: data['01. symbol'],
        price: parseFloat(data['05. price']),
        previousClose: parseFloat(data['08. previous close']),
        change: parseFloat(data['09. change']),
        changePercent: parseFloat(data['10. change percent'].replace('%', '')),
        volume: parseInt(data['06. volume']),
        avgVolume: parseInt(data['06. volume']),
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: parseFloat(data['03. high']),
        week52Low: parseFloat(data['04. low'])
      };
    } catch (error) {
      console.error('Alpha Vantage API error:', error);
      return null;
    }
  }

  // Yahoo Finance API（フォールバック）
  static async getFromYahooFinance(symbol: string): Promise<FinancialData | null> {
    try {
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        { timeout: 5000 }
      );

      const result = response.data.chart.result?.[0];
      if (!result) return null;

      const quote = result.indicators.quote[0];
      const meta = result.meta;

      return {
        symbol,
        price: meta.regularMarketPrice,
        previousClose: meta.previousClose,
        change: meta.regularMarketPrice - meta.previousClose,
        changePercent: ((meta.regularMarketPrice - meta.previousClose) / meta.previousClose) * 100,
        volume: quote.volume?.[quote.volume.length - 1] || 0,
        avgVolume: 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: meta.fiftyTwoWeekHigh || 0,
        week52Low: meta.fiftyTwoWeekLow || 0
      };
    } catch (error) {
      console.error('Yahoo Finance API error:', error);
      return null;
    }
  }

  // モックデータ生成
  static generateMockData(symbol: string): FinancialData {
    const isJapaneseStock = /^\d{4}$/.test(symbol);
    const basePrice = isJapaneseStock
      ? Math.random() * 5000 + 1000  // 1000-6000円
      : Math.random() * 200 + 50;     // $50-250

    const change = (Math.random() - 0.5) * basePrice * 0.05; // ±5%
    const changePercent = (change / basePrice) * 100;

    return {
      symbol,
      price: Math.round(basePrice * 100) / 100,
      previousClose: Math.round((basePrice - change) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.random() * 10000000) + 1000000,
      avgVolume: Math.floor(Math.random() * 8000000) + 1200000,
      marketCap: Math.floor(basePrice * (Math.random() * 1000000000 + 100000000)),
      pe: Math.round((Math.random() * 30 + 10) * 10) / 10,
      eps: Math.round((basePrice / (Math.random() * 20 + 15)) * 100) / 100,
      dividendYield: Math.round(Math.random() * 4 * 100) / 100,
      week52High: Math.round(basePrice * 1.3 * 100) / 100,
      week52Low: Math.round(basePrice * 0.7 * 100) / 100
    };
  }

  // メインの取得メソッド（複数ソースから順次試行）
  static async getFinancialData(symbol: string): Promise<FinancialData> {
    console.log(`🔍 Getting financial data for ${symbol}...`);

    // 1. 完全無料の公開APIを最優先で試行
    const publicApiData = await PublicApiService.getFinancialData(symbol);
    if (publicApiData) {
      console.log(`🌐 Data retrieved from public APIs for ${symbol}`);
      await this.cacheData(publicApiData);
      return publicApiData;
    }

    // 2. データベースから取得を試みる（キャッシュデータ）
    const dbData = await this.getFromDatabase(symbol);
    if (dbData) {
      console.log(`📦 Data retrieved from database cache for ${symbol}`);
      return dbData;
    }

    // 3. より確実な外部APIを試行
    const reliableApiData = await ReliableApiService.getFinancialData(symbol);
    if (reliableApiData) {
      console.log(`✅ Data retrieved from reliable APIs for ${symbol}`);
      await this.cacheData(reliableApiData);
      return reliableApiData;
    }

    // 4. 従来の無料APIを試行
    const freeApiData = await FreeApiService.getFinancialData(symbol);
    if (freeApiData) {
      console.log(`🆓 Data retrieved from other free APIs for ${symbol}`);
      await this.cacheData(freeApiData);
      return freeApiData;
    }

    // 5. 有料APIを試行（APIキーが設定されている場合のみ）
    if (this.apiKeys.finnhub && this.apiKeys.finnhub !== 'demo') {
      const finnhubData = await this.getFromFinnhub(symbol);
      if (finnhubData) {
        console.log(`💎 Data retrieved from Finnhub API for ${symbol}`);
        await this.cacheData(finnhubData);
        return finnhubData;
      }
    }

    // 6. すべて失敗した場合はモックデータを生成
    console.log(`🎭 Generating realistic mock data for ${symbol}`);
    const mockData = this.generateMockData(symbol);
    await this.cacheData(mockData);
    return mockData;
  }

  // データをキャッシュ（データベースに保存）
  private static async cacheData(data: FinancialData): Promise<void> {
    try {
      // 企業情報を更新
      await sqliteDb.query(
        `INSERT OR REPLACE INTO companies 
         (symbol, current_price, price_change, change_percentage, volume) 
         VALUES (?, ?, ?, ?, ?)`,
        [data.symbol, data.price, data.change, data.changePercent, data.volume]
      );

      // 価格履歴を追加
      const today = new Date().toISOString().split('T')[0];
      await sqliteDb.query(
        `INSERT OR REPLACE INTO stock_prices 
         (symbol, date, open_price, high_price, low_price, close_price, volume) 
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          data.symbol,
          today,
          data.previousClose,
          data.week52High,
          data.week52Low,
          data.price,
          data.volume
        ]
      );
    } catch (error) {
      console.error('Error caching data:', error);
    }
  }

  // ヘルパーメソッド
  private static calculatePE(price: number, eps: number): number {
    if (!eps || eps <= 0) return 0;
    return Math.round((price / eps) * 10) / 10;
  }

  private static estimateEPS(price: number): number {
    // 一般的なP/E比（15-20）を使用してEPSを推定
    const estimatedPE = Math.random() * 5 + 15;
    return Math.round((price / estimatedPE) * 100) / 100;
  }
}

export const dataSourceService = new DataSourceService();