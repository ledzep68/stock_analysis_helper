/**
 * Multi-Source API Manager
 * 複数のAPI間の自動フェールオーバー、制限管理、レスポンス正規化を提供
 */

import axios, { AxiosResponse } from 'axios';
import { FinancialData, Company } from '../types';

// API プロバイダー設定
interface ApiProvider {
  name: string;
  priority: number;
  rateLimit: {
    requests: number;
    window: number; // milliseconds
  };
  isActive: boolean;
  lastFailure?: Date;
  failureCount: number;
}

interface ApiCall {
  timestamp: number;
  provider: string;
  endpoint: string;
  success: boolean;
}

interface CircuitBreakerState {
  isOpen: boolean;
  failureCount: number;
  lastFailure?: Date;
  nextRetryTime?: Date;
}

export class MultiSourceApiManager {
  private providers: Map<string, ApiProvider> = new Map();
  private callHistory: ApiCall[] = [];
  private circuitBreakers: Map<string, CircuitBreakerState> = new Map();
  private cache: Map<string, { data: any; timestamp: number; ttl: number }> = new Map();

  // Circuit Breaker設定
  private readonly FAILURE_THRESHOLD = 5;
  private readonly RETRY_DELAY = 30000; // 30秒
  private readonly CACHE_TTL = 300000; // 5分

  constructor() {
    this.initializeProviders();
    this.startCleanupInterval();
  }

  private initializeProviders(): void {
    // Yahoo Finance API設定
    this.providers.set('yahoo', {
      name: 'Yahoo Finance',
      priority: 1,
      rateLimit: { requests: 100, window: 60000 }, // 100 requests/分
      isActive: true,
      failureCount: 0
    });

    // Alpha Vantage API設定
    this.providers.set('alphavantage', {
      name: 'Alpha Vantage',
      priority: 2,
      rateLimit: { requests: 5, window: 60000 }, // 5 requests/分 (free tier)
      isActive: true,
      failureCount: 0
    });

    // Polygon.io API設定
    this.providers.set('polygon', {
      name: 'Polygon.io',
      priority: 3,
      rateLimit: { requests: 5, window: 60000 }, // 5 requests/分 (free tier)
      isActive: true,
      failureCount: 0
    });

    // IEX Cloud API設定
    this.providers.set('iex', {
      name: 'IEX Cloud',
      priority: 4,
      rateLimit: { requests: 100, window: 60000 }, // 実際の制限に応じて調整
      isActive: true,
      failureCount: 0
    });

    // 各プロバイダーのサーキットブレーカー初期化
    this.providers.forEach((_, key) => {
      this.circuitBreakers.set(key, {
        isOpen: false,
        failureCount: 0
      });
    });
  }

  /**
   * 企業検索API呼び出し
   */
  async searchCompanies(query: string): Promise<Company[]> {
    const cacheKey = `search:${query}`;
    
    // キャッシュチェック
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📋 Cache hit for search: ${query}`);
      return cached;
    }

    const availableProviders = this.getAvailableProviders();
    
    for (const provider of availableProviders) {
      try {
        console.log(`🔍 Trying ${provider.name} for search: ${query}`);
        
        let companies: Company[];
        switch (provider.name) {
          case 'Yahoo Finance':
            companies = await this.searchYahooFinance(query);
            break;
          case 'Alpha Vantage':
            companies = await this.searchAlphaVantage(query);
            break;
          case 'Polygon.io':
            companies = await this.searchPolygon(query);
            break;
          case 'IEX Cloud':
            companies = await this.searchIEX(query);
            break;
          default:
            continue;
        }

        // 成功時の処理
        this.recordSuccess(provider.name, 'search');
        this.setCache(cacheKey, companies, this.CACHE_TTL);
        console.log(`✅ ${provider.name} search successful for: ${query}`);
        return companies;

      } catch (error) {
        console.warn(`❌ ${provider.name} search failed for ${query}:`, error);
        this.recordFailure(provider.name, 'search');
        continue;
      }
    }

    // 全てのAPIが失敗した場合、データベースフォールバックを試行
    console.log(`🔄 All APIs failed, falling back to database for: ${query}`);
    return this.searchDatabase(query);
  }

  /**
   * 株価データAPI呼び出し
   */
  async getFinancialData(symbol: string): Promise<FinancialData | null> {
    const cacheKey = `stock:${symbol}`;
    
    // キャッシュチェック
    const cached = this.getFromCache(cacheKey);
    if (cached) {
      console.log(`📋 Cache hit for stock data: ${symbol}`);
      return cached;
    }

    const availableProviders = this.getAvailableProviders();
    
    for (const provider of availableProviders) {
      try {
        console.log(`📊 Trying ${provider.name} for stock data: ${symbol}`);
        
        let financialData: FinancialData | null;
        switch (provider.name) {
          case 'Yahoo Finance':
            financialData = await this.getYahooFinanceData(symbol);
            break;
          case 'Alpha Vantage':
            financialData = await this.getAlphaVantageData(symbol);
            break;
          case 'Polygon.io':
            financialData = await this.getPolygonData(symbol);
            break;
          case 'IEX Cloud':
            financialData = await this.getIEXData(symbol);
            break;
          default:
            continue;
        }

        if (financialData) {
          // 成功時の処理
          this.recordSuccess(provider.name, 'stock_data');
          this.setCache(cacheKey, financialData, this.CACHE_TTL);
          console.log(`✅ ${provider.name} stock data successful for: ${symbol}`);
          return financialData;
        }

      } catch (error) {
        console.warn(`❌ ${provider.name} stock data failed for ${symbol}:`, error);
        this.recordFailure(provider.name, 'stock_data');
        continue;
      }
    }

    // 全てのAPIが失敗した場合、データベースフォールバックを試行
    console.log(`🔄 All APIs failed, falling back to database for: ${symbol}`);
    return this.getFromDatabase(symbol);
  }

  // Yahoo Finance API実装
  private async searchYahooFinance(query: string): Promise<Company[]> {
    if (!this.checkRateLimit('yahoo')) {
      throw new Error('Rate limit exceeded');
    }

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&quotesCount=10`,
      {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockAnalysis/1.0)' }
      }
    );

    return this.normalizeYahooSearchResponse(response.data);
  }

  private async getYahooFinanceData(symbol: string): Promise<FinancialData | null> {
    if (!this.checkRateLimit('yahoo')) {
      throw new Error('Rate limit exceeded');
    }

    const response = await axios.get(
      `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
      {
        timeout: 3000,
        headers: { 'User-Agent': 'Mozilla/5.0 (compatible; StockAnalysis/1.0)' }
      }
    );

    return this.normalizeYahooStockResponse(response.data);
  }

  // Alpha Vantage API実装
  private async searchAlphaVantage(query: string): Promise<Company[]> {
    if (!this.checkRateLimit('alphavantage')) {
      throw new Error('Rate limit exceeded');
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${encodeURIComponent(query)}&apikey=${apiKey}`,
      { timeout: 10000 }
    );

    return this.normalizeAlphaVantageSearchResponse(response.data);
  }

  private async getAlphaVantageData(symbol: string): Promise<FinancialData | null> {
    if (!this.checkRateLimit('alphavantage')) {
      throw new Error('Rate limit exceeded');
    }

    const apiKey = process.env.ALPHA_VANTAGE_API_KEY || 'demo';
    const response = await axios.get(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${apiKey}`,
      { timeout: 10000 }
    );

    return this.normalizeAlphaVantageStockResponse(response.data);
  }

  // Polygon.io API実装
  private async searchPolygon(query: string): Promise<Company[]> {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || !this.checkRateLimit('polygon')) {
      throw new Error('API key missing or rate limit exceeded');
    }

    const response = await axios.get(
      `https://api.polygon.io/v3/reference/tickers?search=${encodeURIComponent(query)}&apikey=${apiKey}`,
      { timeout: 10000 }
    );

    return this.normalizePolygonSearchResponse(response.data);
  }

  private async getPolygonData(symbol: string): Promise<FinancialData | null> {
    const apiKey = process.env.POLYGON_API_KEY;
    if (!apiKey || !this.checkRateLimit('polygon')) {
      throw new Error('API key missing or rate limit exceeded');
    }

    const response = await axios.get(
      `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?apikey=${apiKey}`,
      { timeout: 10000 }
    );

    return this.normalizePolygonStockResponse(response.data);
  }

  // IEX Cloud API実装
  private async searchIEX(query: string): Promise<Company[]> {
    // IEX Cloudの検索APIは制限的なため、シンボル完全一致のみサポート
    if (query.length > 5) {
      return [];
    }
    
    const companies: Company[] = [];
    try {
      const data = await this.getIEXData(query.toUpperCase());
      if (data) {
        companies.push({
          symbol: query.toUpperCase(),
          name: query.toUpperCase(), // IEX doesn't provide company name in quote
          industry: 'Unknown',
          sector: 'Unknown',
          country: 'US',
          marketCap: data.marketCap || 0,
          exchange: 'NASDAQ'
        });
      }
    } catch (error) {
      // 検索失敗は正常（該当企業なし）
    }

    return companies;
  }

  private async getIEXData(symbol: string): Promise<FinancialData | null> {
    // IEX Cloud無料版を使用（サンドボックス）
    const response = await axios.get(
      `https://sandbox.iexapis.com/stable/stock/${symbol}/quote?token=Tsk_test`,
      { timeout: 10000 }
    );

    return this.normalizeIEXStockResponse(response.data);
  }

  // レスポンス正規化メソッド
  private normalizeYahooSearchResponse(data: any): Company[] {
    if (!data.quotes) return [];
    
    return data.quotes.slice(0, 10).map((quote: any) => ({
      symbol: quote.symbol,
      name: quote.longname || quote.shortname || quote.symbol,
      industry: quote.industry || 'Unknown',
      sector: quote.sector || 'Unknown',
      country: quote.region || 'Unknown',
      marketCap: quote.marketCap || 0,
      exchange: quote.exchange || 'Unknown'
    }));
  }

  private normalizeYahooStockResponse(data: any): FinancialData | null {
    const result = data.quoteResponse?.result?.[0];
    if (!result) return null;

    const currentPrice = result.regularMarketPrice || 0;
    const previousClose = result.regularMarketPreviousClose || 0;
    const change = currentPrice - previousClose;

    return {
      symbol: result.symbol,
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: result.regularMarketChangePercent || 0,
      volume: result.regularMarketVolume || 0,
      avgVolume: result.averageDailyVolume3Month || result.regularMarketVolume || 0,
      marketCap: result.marketCap || 0,
      pe: result.trailingPE || 0,
      eps: result.epsTrailingTwelveMonths || 0,
      dividendYield: (result.dividendYield || 0) * 100, // Convert to percentage
      week52High: result.fiftyTwoWeekHigh || 0,
      week52Low: result.fiftyTwoWeekLow || 0
    };
  }

  private normalizeAlphaVantageSearchResponse(data: any): Company[] {
    if (!data.bestMatches) return [];
    
    return data.bestMatches.slice(0, 10).map((match: any) => ({
      symbol: match['1. symbol'],
      name: match['2. name'],
      industry: 'Unknown',
      sector: 'Unknown',
      country: match['4. region'] || 'Unknown',
      marketCap: 0,
      exchange: 'Unknown'
    }));
  }

  private normalizeAlphaVantageStockResponse(data: any): FinancialData | null {
    const quote = data['Global Quote'];
    if (!quote) return null;

    const currentPrice = parseFloat(quote['05. price']) || 0;
    const previousClose = parseFloat(quote['08. previous close']) || 0;
    const change = parseFloat(quote['09. change']) || 0;
    const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

    return {
      symbol: quote['01. symbol'],
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: changePercent,
      volume: parseInt(quote['06. volume']) || 0,
      avgVolume: parseInt(quote['06. volume']) || 0, // Alpha Vantage doesn't provide avg volume
      marketCap: 0, // Not available in Global Quote
      pe: 0, // Not available in Global Quote
      eps: 0, // Not available in Global Quote
      dividendYield: 0, // Not available in Global Quote
      week52High: parseFloat(quote['03. high']) || 0,
      week52Low: parseFloat(quote['04. low']) || 0
    };
  }

  private normalizePolygonSearchResponse(data: any): Company[] {
    if (!data.results) return [];
    
    return data.results.slice(0, 10).map((result: any) => ({
      symbol: result.ticker,
      name: result.name,
      industry: result.sic_description || 'Unknown',
      sector: 'Unknown',
      country: result.locale === 'us' ? 'US' : 'Unknown',
      marketCap: result.market_cap || 0,
      exchange: result.primary_exchange || 'Unknown'
    }));
  }

  private normalizePolygonStockResponse(data: any): FinancialData | null {
    if (!data.results?.[0]) return null;
    
    const result = data.results[0];
    const currentPrice = result.c || 0;
    const openPrice = result.o || 0;
    const change = currentPrice - openPrice;
    const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

    return {
      symbol: data.ticker,
      price: currentPrice,
      previousClose: openPrice, // Using open as previous close approximation
      change: change,
      changePercent: changePercent,
      volume: result.v || 0,
      avgVolume: result.v || 0, // Polygon doesn't provide avg volume in this endpoint
      marketCap: 0, // Not available in this endpoint
      pe: 0, // Not available in this endpoint
      eps: 0, // Not available in this endpoint
      dividendYield: 0, // Not available in this endpoint
      week52High: result.h || 0,
      week52Low: result.l || 0
    };
  }

  private normalizeIEXStockResponse(data: any): FinancialData | null {
    if (!data) return null;

    const currentPrice = data.latestPrice || 0;
    const previousClose = data.previousClose || 0;
    const change = data.change || 0;

    return {
      symbol: data.symbol,
      price: currentPrice,
      previousClose: previousClose,
      change: change,
      changePercent: data.changePercent ? data.changePercent * 100 : 0,
      volume: data.latestVolume || 0,
      avgVolume: data.avgTotalVolume || data.latestVolume || 0,
      marketCap: data.marketCap || 0,
      pe: data.peRatio || 0,
      eps: 0, // IEX doesn't provide EPS in quote endpoint
      dividendYield: 0, // IEX doesn't provide dividend yield in quote endpoint
      week52High: data.week52High || 0,
      week52Low: data.week52Low || 0
    };
  }

  // ユーティリティメソッド
  private getAvailableProviders(): ApiProvider[] {
    return Array.from(this.providers.values())
      .filter(provider => provider.isActive && !this.isCircuitBreakerOpen(provider.name))
      .sort((a, b) => a.priority - b.priority);
  }

  private checkRateLimit(providerName: string): boolean {
    const provider = this.providers.get(providerName);
    if (!provider) return false;

    const now = Date.now();
    const windowStart = now - provider.rateLimit.window;
    
    const recentCalls = this.callHistory.filter(call => 
      call.provider === providerName && 
      call.timestamp > windowStart
    );

    return recentCalls.length < provider.rateLimit.requests;
  }

  private recordSuccess(providerName: string, endpoint: string): void {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.failureCount = 0;
      provider.lastFailure = undefined;
    }

    const circuitBreaker = this.circuitBreakers.get(providerName);
    if (circuitBreaker) {
      circuitBreaker.isOpen = false;
      circuitBreaker.failureCount = 0;
      circuitBreaker.lastFailure = undefined;
    }

    this.callHistory.push({
      timestamp: Date.now(),
      provider: providerName,
      endpoint,
      success: true
    });
  }

  private recordFailure(providerName: string, endpoint: string): void {
    const provider = this.providers.get(providerName);
    if (provider) {
      provider.failureCount++;
      provider.lastFailure = new Date();
    }

    const circuitBreaker = this.circuitBreakers.get(providerName);
    if (circuitBreaker) {
      circuitBreaker.failureCount++;
      circuitBreaker.lastFailure = new Date();
      
      if (circuitBreaker.failureCount >= this.FAILURE_THRESHOLD) {
        circuitBreaker.isOpen = true;
        circuitBreaker.nextRetryTime = new Date(Date.now() + this.RETRY_DELAY);
        console.warn(`🔴 Circuit breaker opened for ${providerName}`);
      }
    }

    this.callHistory.push({
      timestamp: Date.now(),
      provider: providerName,
      endpoint,
      success: false
    });
  }

  private isCircuitBreakerOpen(providerName: string): boolean {
    const circuitBreaker = this.circuitBreakers.get(providerName);
    if (!circuitBreaker) return false;

    if (circuitBreaker.isOpen && circuitBreaker.nextRetryTime) {
      if (Date.now() > circuitBreaker.nextRetryTime.getTime()) {
        // リトライ時間到達、サーキットブレーカーをハーフオープンに
        circuitBreaker.isOpen = false;
        console.log(`🟡 Circuit breaker half-open for ${providerName}`);
        return false;
      }
      return true;
    }

    return false;
  }

  private getFromCache(key: string): any | null {
    const cached = this.cache.get(key);
    if (!cached) return null;

    if (Date.now() - cached.timestamp > cached.ttl) {
      this.cache.delete(key);
      return null;
    }

    return cached.data;
  }

  private setCache(key: string, data: any, ttl: number): void {
    this.cache.set(key, {
      data,
      timestamp: Date.now(),
      ttl
    });
  }

  // フォールバック実装
  private async searchDatabase(query: string): Promise<Company[]> {
    // 既存のcompanyServiceを使用
    try {
      const { searchCompanies } = await import('./companyService');
      return await searchCompanies(query);
    } catch (error) {
      console.warn('Database fallback failed:', error);
      return [];
    }
  }

  private async getFromDatabase(symbol: string): Promise<FinancialData | null> {
    // 既存のcompanyServiceを使用
    try {
      const { getCompanyData } = await import('./companyService');
      return await getCompanyData(symbol);
    } catch (error) {
      console.warn('Database fallback failed:', error);
      return null;
    }
  }

  private startCleanupInterval(): void {
    // 1時間ごとにクリーンアップ
    setInterval(() => {
      this.cleanupCallHistory();
      this.cleanupCache();
    }, 3600000);
  }

  private cleanupCallHistory(): void {
    const oneHourAgo = Date.now() - 3600000;
    this.callHistory = this.callHistory.filter(call => call.timestamp > oneHourAgo);
  }

  private cleanupCache(): void {
    const now = Date.now();
    for (const [key, cached] of this.cache.entries()) {
      if (now - cached.timestamp > cached.ttl) {
        this.cache.delete(key);
      }
    }
  }

  // 統計情報の取得
  getStats() {
    return {
      providers: Array.from(this.providers.entries()).map(([key, provider]) => ({
        id: key,
        ...provider,
        circuitBreaker: this.circuitBreakers.get(key)
      })),
      cacheSize: this.cache.size,
      callHistorySize: this.callHistory.length
    };
  }
}

// シングルトンインスタンス
export const apiManager = new MultiSourceApiManager();