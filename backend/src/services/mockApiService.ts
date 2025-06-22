/**
 * モックAPIサービス
 * テスト環境での安全なAPI呼び出しシミュレーション
 */

import { FinancialData, Company } from '../types';
import { TestLogger } from '../utils/testLogger';

export interface MockApiConfig {
  provider: string;
  simulateDelay?: boolean;
  delayMs?: number;
  simulateFailure?: boolean;
  failureRate?: number; // 0-1の確率
  simulateRateLimit?: boolean;
  rateLimitAfter?: number; // この回数後に制限をシミュレート
}

export interface MockApiCall {
  timestamp: Date;
  provider: string;
  method: string;
  symbol?: string;
  query?: string;
  success: boolean;
  responseTime: number;
  mockData?: any;
  error?: string;
}

class MockApiService {
  private callHistory: MockApiCall[] = [];
  private callCounts: Map<string, number> = new Map();
  private logger: TestLogger;

  constructor() {
    this.logger = new TestLogger('MockApiService');
  }

  /**
   * Yahoo Finance APIのモック
   */
  async mockYahooFinanceGetStock(symbol: string, config: MockApiConfig = { provider: 'yahoo' }): Promise<FinancialData> {
    const startTime = Date.now();
    
    await this.simulateApiCall(config);
    
    const mockData = this.generateMockFinancialData(symbol);
    const responseTime = Date.now() - startTime;
    
    const call: MockApiCall = {
      timestamp: new Date(),
      provider: config.provider,
      method: 'getStock',
      symbol,
      success: true,
      responseTime,
      mockData
    };
    
    this.recordCall(call);
    this.logger.info(`Mock Yahoo Finance API call: ${symbol}`, {
      responseTime,
      mockPrice: mockData.price,
      changePercent: mockData.changePercent
    });
    
    return mockData;
  }

  /**
   * Yahoo Finance検索APIのモック
   */
  async mockYahooFinanceSearch(query: string, config: MockApiConfig = { provider: 'yahoo' }): Promise<Company[]> {
    const startTime = Date.now();
    
    await this.simulateApiCall(config);
    
    const mockData = this.generateMockSearchResults(query);
    const responseTime = Date.now() - startTime;
    
    const call: MockApiCall = {
      timestamp: new Date(),
      provider: config.provider,
      method: 'search',
      query,
      success: true,
      responseTime,
      mockData
    };
    
    this.recordCall(call);
    this.logger.info(`Mock Yahoo Finance search: "${query}"`, {
      responseTime,
      resultCount: mockData.length
    });
    
    return mockData;
  }

  /**
   * Alpha Vantage APIのモック
   */
  async mockAlphaVantageGetStock(symbol: string, config: MockApiConfig = { provider: 'alphavantage' }): Promise<FinancialData> {
    const startTime = Date.now();
    
    await this.simulateApiCall(config);
    
    const mockData = this.generateMockFinancialData(symbol, 'alphavantage');
    const responseTime = Date.now() - startTime;
    
    const call: MockApiCall = {
      timestamp: new Date(),
      provider: config.provider,
      method: 'getStock',
      symbol,
      success: true,
      responseTime,
      mockData
    };
    
    this.recordCall(call);
    this.logger.info(`Mock Alpha Vantage API call: ${symbol}`, {
      responseTime,
      mockPrice: mockData.price
    });
    
    return mockData;
  }

  /**
   * 制限エラーのシミュレーション
   */
  async simulateRateLimitError(provider: string): Promise<never> {
    const call: MockApiCall = {
      timestamp: new Date(),
      provider,
      method: 'rateLimitError',
      success: false,
      responseTime: 100,
      error: 'API rate limit exceeded'
    };
    
    this.recordCall(call);
    this.logger.warn(`Mock rate limit error: ${provider}`, { 
      callCount: this.callCounts.get(provider) || 0 
    });
    
    throw new Error(`Mock API rate limit exceeded for ${provider}`);
  }

  /**
   * ネットワークエラーのシミュレーション
   */
  async simulateNetworkError(provider: string): Promise<never> {
    const call: MockApiCall = {
      timestamp: new Date(),
      provider,
      method: 'networkError',
      success: false,
      responseTime: 5000,
      error: 'Network timeout'
    };
    
    this.recordCall(call);
    this.logger.error(`Mock network error: ${provider}`);
    
    throw new Error(`Mock network error for ${provider}`);
  }

  private async simulateApiCall(config: MockApiConfig): Promise<void> {
    const callCount = this.callCounts.get(config.provider) || 0;
    this.callCounts.set(config.provider, callCount + 1);

    // 制限シミュレーション
    if (config.simulateRateLimit && config.rateLimitAfter && callCount >= config.rateLimitAfter) {
      throw new Error(`Mock rate limit exceeded after ${config.rateLimitAfter} calls`);
    }

    // 失敗シミュレーション
    if (config.simulateFailure && config.failureRate) {
      if (Math.random() < config.failureRate) {
        throw new Error('Mock API failure');
      }
    }

    // 遅延シミュレーション
    if (config.simulateDelay) {
      const delay = config.delayMs || Math.random() * 1000 + 500;
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }

  private generateMockFinancialData(symbol: string, provider: string = 'yahoo'): FinancialData {
    // シンボルベースの安定したランダム値を生成
    const seed = symbol.charCodeAt(0) + symbol.charCodeAt(symbol.length - 1);
    const random = (seed * 9301 + 49297) % 233280;
    const basePrice = provider === 'alphavantage' ? 100 + (random % 200) : 50 + (random % 150);
    
    const change = (Math.sin(seed) * 20);
    const changePercent = (change / basePrice) * 100;
    
    return {
      symbol,
      price: Math.round(basePrice * 100) / 100,
      previousClose: Math.round((basePrice - change) * 100) / 100,
      change: Math.round(change * 100) / 100,
      changePercent: Math.round(changePercent * 100) / 100,
      volume: Math.floor(Math.abs(random) * 10000) + 100000,
      avgVolume: Math.floor(Math.abs(random) * 8000) + 120000,
      marketCap: Math.floor(Math.abs(random) * 1000000000) + 1000000000,
      pe: Math.round((15 + Math.abs(Math.sin(seed)) * 20) * 10) / 10,
      eps: Math.round((basePrice / (15 + Math.abs(Math.sin(seed)) * 20)) * 100) / 100,
      dividendYield: Math.round(Math.abs(Math.sin(seed * 2)) * 5 * 100) / 100,
      week52High: Math.round(basePrice * (1 + Math.abs(Math.sin(seed * 3)) * 0.4) * 100) / 100,
      week52Low: Math.round(basePrice * (1 - Math.abs(Math.sin(seed * 4)) * 0.3) * 100) / 100
    };
  }

  private generateMockSearchResults(query: string): Company[] {
    const mockCompanies = [
      { symbol: 'AAPL', name: 'Apple Inc.', industry: 'Technology', sector: 'Consumer Electronics' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.', industry: 'Technology', sector: 'Internet Services' },
      { symbol: 'MSFT', name: 'Microsoft Corporation', industry: 'Technology', sector: 'Software' },
      { symbol: 'TSLA', name: 'Tesla, Inc.', industry: 'Automotive', sector: 'Electric Vehicles' },
      { symbol: 'AMZN', name: 'Amazon.com, Inc.', industry: 'Technology', sector: 'E-commerce' }
    ];

    return mockCompanies
      .filter(company => 
        company.name.toLowerCase().includes(query.toLowerCase()) ||
        company.symbol.toLowerCase().includes(query.toLowerCase())
      )
      .map(company => ({
        ...company,
        country: 'US',
        marketCap: Math.floor(Math.random() * 1000000000000) + 100000000000,
        marketSegment: 'Large Cap',
        exchange: 'NASDAQ'
      }));
  }

  private recordCall(call: MockApiCall): void {
    this.callHistory.push(call);
    
    // 最新1000件のみ保持
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-1000);
    }
  }

  /**
   * テスト用統計情報の取得
   */
  public getTestStats(): {
    totalCalls: number;
    callsByProvider: { [provider: string]: number };
    successRate: number;
    averageResponseTime: number;
    recentCalls: MockApiCall[];
  } {
    const callsByProvider: { [provider: string]: number } = {};
    let totalResponseTime = 0;
    let successCount = 0;

    this.callHistory.forEach(call => {
      callsByProvider[call.provider] = (callsByProvider[call.provider] || 0) + 1;
      totalResponseTime += call.responseTime;
      if (call.success) successCount++;
    });

    return {
      totalCalls: this.callHistory.length,
      callsByProvider,
      successRate: this.callHistory.length > 0 ? successCount / this.callHistory.length : 0,
      averageResponseTime: this.callHistory.length > 0 ? totalResponseTime / this.callHistory.length : 0,
      recentCalls: this.callHistory.slice(-10)
    };
  }

  /**
   * テスト環境リセット
   */
  public resetTestEnvironment(): void {
    this.callHistory = [];
    this.callCounts.clear();
    this.logger.info('Mock API test environment reset');
  }

  /**
   * テストログのエクスポート
   */
  public exportTestLog(): string {
    const stats = this.getTestStats();
    const logData = {
      timestamp: new Date().toISOString(),
      testSession: {
        duration: this.callHistory.length > 0 ? 
          this.callHistory[this.callHistory.length - 1].timestamp.getTime() - this.callHistory[0].timestamp.getTime() : 0,
        ...stats
      },
      calls: this.callHistory
    };
    
    return JSON.stringify(logData, null, 2);
  }
}

export const mockApiService = new MockApiService();