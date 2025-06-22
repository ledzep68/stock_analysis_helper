/**
 * ハイブリッドAPIサービス
 * モックAPIと実APIを環境に応じて切り替える統合サービス
 */

import { FinancialData, Company } from '../types';
import { mockApiService, MockApiConfig } from './mockApiService';
import { realApiService } from './realApiService';
import { testEnvironment } from '../config/testEnvironment';
import { apiLimitManager } from './apiLimitManager';
import { TestLogger } from '../utils/testLogger';

export interface HybridApiConfig {
  provider: string;
  preferredSource: 'mock' | 'real' | 'auto';
  fallbackEnabled: boolean;
  maxRetries: number;
}

class HybridApiService {
  private logger: TestLogger;

  constructor() {
    this.logger = new TestLogger('HybridApiService');
  }

  /**
   * 株価データの取得（環境に応じてモック/実API切り替え）
   */
  async getFinancialData(symbol: string, config?: HybridApiConfig): Promise<FinancialData | null> {
    const effectiveConfig: HybridApiConfig = {
      provider: 'yahoo',
      preferredSource: 'auto',
      fallbackEnabled: true,
      maxRetries: 2,
      ...config
    };

    this.logger.info(`Getting financial data for ${symbol}`, {
      provider: effectiveConfig.provider,
      source: effectiveConfig.preferredSource,
      environment: testEnvironment.getConfig().environment
    });

    try {
      // 1. 環境に基づく自動選択
      const shouldUseMock = this.shouldUseMockApi(effectiveConfig);
      
      if (shouldUseMock) {
        return await this.getDataFromMock(symbol, effectiveConfig);
      } else {
        return await this.getDataFromRealApi(symbol, effectiveConfig);
      }

    } catch (error: any) {
      this.logger.error(`Failed to get financial data for ${symbol}`, {
        error: error.message,
        provider: effectiveConfig.provider
      });

      // フォールバック処理
      if (effectiveConfig.fallbackEnabled) {
        const usedMock = this.shouldUseMockApi(effectiveConfig);
        return await this.fallbackToAlternativeSource(symbol, effectiveConfig, usedMock);
      }

      return null;
    }
  }

  /**
   * 企業検索（環境に応じてモック/実API切り替え）
   */
  async searchCompanies(query: string, config?: HybridApiConfig): Promise<Company[]> {
    const effectiveConfig: HybridApiConfig = {
      provider: 'yahoo',
      preferredSource: 'auto',
      fallbackEnabled: true,
      maxRetries: 2,
      ...config
    };

    this.logger.info(`Searching companies for "${query}"`, {
      provider: effectiveConfig.provider,
      environment: testEnvironment.getConfig().environment
    });

    try {
      const shouldUseMock = this.shouldUseMockApi(effectiveConfig);
      
      if (shouldUseMock) {
        return await this.searchFromMock(query, effectiveConfig);
      } else {
        return await this.searchFromRealApi(query, effectiveConfig);
      }

    } catch (error: any) {
      this.logger.error(`Failed to search companies for "${query}"`, {
        error: error.message,
        provider: effectiveConfig.provider
      });

      // フォールバック処理
      if (effectiveConfig.fallbackEnabled) {
        const usedMock = this.shouldUseMockApi(effectiveConfig);
        return await this.fallbackSearchToAlternativeSource(query, effectiveConfig, usedMock);
      }

      return [];
    }
  }

  private shouldUseMockApi(config: HybridApiConfig): boolean {
    // 強制設定がある場合
    if (config.preferredSource === 'mock') return true;
    if (config.preferredSource === 'real') return false;

    // 環境設定に基づく自動判定
    if (testEnvironment.shouldUseMockApis()) return true;
    if (!testEnvironment.shouldEnableRealApiCalls()) return true;

    // API制限状況の確認
    const availableProviders = apiLimitManager.getAvailableProviders();
    if (!availableProviders.includes(config.provider)) {
      this.logger.warn(`Provider ${config.provider} not available due to rate limits, using mock`);
      return true;
    }

    // 本番環境かつAPI制限なしの場合は実API使用
    return false;
  }

  private async getDataFromMock(symbol: string, config: HybridApiConfig): Promise<FinancialData> {
    this.logger.debug(`Using mock API for ${symbol}`);
    
    const mockConfig: MockApiConfig = {
      provider: config.provider,
      simulateDelay: testEnvironment.shouldSimulateDelay(),
      delayMs: 100 + Math.random() * 200,
      simulateFailure: testEnvironment.shouldSimulateFailures(),
      failureRate: 0.05 // 5%の失敗率
    };

    if (config.provider === 'alphavantage') {
      return await mockApiService.mockAlphaVantageGetStock(symbol, mockConfig);
    } else {
      return await mockApiService.mockYahooFinanceGetStock(symbol, mockConfig);
    }
  }

  private async getDataFromRealApi(symbol: string, config: HybridApiConfig): Promise<FinancialData> {
    this.logger.debug(`Using real API for ${symbol}`, { provider: config.provider });
    
    if (config.provider === 'alphavantage') {
      return await realApiService.alphaVantageGetStock(symbol);
    } else {
      return await realApiService.yahooFinanceGetStock(symbol);
    }
  }

  private async searchFromMock(query: string, config: HybridApiConfig): Promise<Company[]> {
    this.logger.debug(`Using mock search for "${query}"`);
    
    const mockConfig: MockApiConfig = {
      provider: config.provider,
      simulateDelay: testEnvironment.shouldSimulateDelay(),
      delayMs: 50 + Math.random() * 150
    };

    return await mockApiService.mockYahooFinanceSearch(query, mockConfig);
  }

  private async searchFromRealApi(query: string, config: HybridApiConfig): Promise<Company[]> {
    this.logger.debug(`Using real search API for "${query}"`);
    
    return await realApiService.yahooFinanceSearch(query);
  }

  private async fallbackToAlternativeSource(
    symbol: string, 
    config: HybridApiConfig, 
    originallyUsedMock: boolean
  ): Promise<FinancialData | null> {
    this.logger.warn(`Attempting fallback for ${symbol}`, {
      originalSource: originallyUsedMock ? 'mock' : 'real',
      fallbackTo: originallyUsedMock ? 'real' : 'mock'
    });

    try {
      if (originallyUsedMock) {
        // モックが失敗した場合、実APIを試す
        if (testEnvironment.shouldEnableRealApiCalls()) {
          return await this.getDataFromRealApi(symbol, config);
        }
      } else {
        // 実APIが失敗した場合、モックを試す
        return await this.getDataFromMock(symbol, config);
      }
    } catch (fallbackError: any) {
      this.logger.error(`Fallback also failed for ${symbol}`, {
        error: fallbackError.message
      });
    }

    return null;
  }

  private async fallbackSearchToAlternativeSource(
    query: string, 
    config: HybridApiConfig, 
    originallyUsedMock: boolean
  ): Promise<Company[]> {
    this.logger.warn(`Attempting search fallback for "${query}"`);

    try {
      if (originallyUsedMock) {
        if (testEnvironment.shouldEnableRealApiCalls()) {
          return await this.searchFromRealApi(query, config);
        }
      } else {
        return await this.searchFromMock(query, config);
      }
    } catch (fallbackError: any) {
      this.logger.error(`Search fallback also failed for "${query}"`, {
        error: fallbackError.message
      });
    }

    return [];
  }

  /**
   * システム全体のAPI統計
   */
  public getSystemApiStats(): {
    environment: string;
    mockApiStats: any;
    realApiStats: any;
    apiLimitStats: any;
    currentSource: 'mock' | 'real' | 'hybrid';
  } {
    const mockStats = mockApiService.getTestStats();
    const realStats = realApiService.getRealApiStats();
    const limitStats = apiLimitManager.getUsageStats();

    let currentSource: 'mock' | 'real' | 'hybrid' = 'hybrid';
    if (testEnvironment.shouldUseMockApis()) {
      currentSource = 'mock';
    } else if (testEnvironment.shouldEnableRealApiCalls()) {
      currentSource = 'real';
    }

    return {
      environment: testEnvironment.getConfig().environment,
      mockApiStats: mockStats,
      realApiStats: realStats,
      apiLimitStats: limitStats,
      currentSource
    };
  }

  /**
   * APIヘルスチェック（実API接続確認）
   */
  async performHealthCheck(): Promise<{
    timestamp: string;
    environment: string;
    mockApiAvailable: boolean;
    realApiHealth: any[];
    recommendations: string[];
  }> {
    this.logger.info('Performing API health check');

    const realApiHealth = testEnvironment.shouldEnableRealApiCalls() 
      ? await realApiService.healthCheck()
      : [];

    const recommendations: string[] = [];
    
    if (testEnvironment.isProduction() && testEnvironment.shouldUseMockApis()) {
      recommendations.push('Production environment is using mock APIs - consider enabling real APIs');
    }
    
    if (realApiHealth.some(api => !api.available)) {
      recommendations.push('Some real APIs are unavailable - check network connectivity and API keys');
    }

    const healthResult = {
      timestamp: new Date().toISOString(),
      environment: testEnvironment.getConfig().environment,
      mockApiAvailable: true, // モックAPIは常に利用可能
      realApiHealth,
      recommendations
    };

    this.logger.info('Health check completed', healthResult);
    return healthResult;
  }
}

export const hybridApiService = new HybridApiService();