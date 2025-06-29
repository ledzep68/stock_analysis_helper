/**
 * 実際の外部APIサービス
 * テスト済みモックAPIから本物APIへの安全な移行
 */

import axios, { AxiosResponse } from 'axios';
import { FinancialData, Company } from '../types';
import { TestLogger } from '../utils/testLogger';
import { testEnvironment } from '../config/testEnvironment';
import { apiLimitManager } from './apiLimitManager';

export interface RealApiCall {
  timestamp: Date;
  provider: string;
  method: string;
  symbol?: string;
  query?: string;
  success: boolean;
  responseTime: number;
  httpStatus?: number;
  error?: string;
  quotaUsed?: number;
}

class RealApiService {
  private logger: TestLogger;
  private callHistory: RealApiCall[] = [];

  constructor() {
    this.logger = new TestLogger('RealApiService');
  }

  /**
   * Yahoo Finance APIによる株価取得
   */
  async yahooFinanceGetStock(symbol: string): Promise<FinancialData> {
    const startTime = Date.now();
    
    // 制限チェック
    const limitCheck = apiLimitManager.canMakeRequest('yahoo');
    if (!limitCheck.allowed) {
      throw new Error(`Yahoo Finance rate limit: ${limitCheck.reason}`);
    }

    try {
      this.logger.info(`Yahoo Finance API call starting`, { symbol });
      
      // 日本株の場合、.Tサフィックスを追加
      const yahooSymbol = this.formatSymbolForYahoo(symbol);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${yahooSymbol}`,
        {
          timeout: testEnvironment.getApiConfig('yahooFinance').timeout,
          headers: {
            'User-Agent': 'Stock Analysis Helper/1.0',
            'Accept': 'application/json'
          }
        }
      );

      const responseTime = Date.now() - startTime;
      const data = this.parseYahooFinanceResponse(response.data, symbol);
      
      // 成功を記録
      this.recordApiCall({
        timestamp: new Date(),
        provider: 'yahoo',
        method: 'getStock',
        symbol,
        success: true,
        responseTime,
        httpStatus: response.status
      });

      apiLimitManager.recordApiCall('yahoo', true);
      
      this.logger.info(`Yahoo Finance API call successful`, {
        symbol,
        price: data.price,
        responseTime
      });

      return data;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      this.recordApiCall({
        timestamp: new Date(),
        provider: 'yahoo',
        method: 'getStock',
        symbol,
        success: false,
        responseTime,
        httpStatus: error.response?.status,
        error: error.message
      });

      apiLimitManager.recordApiCall('yahoo', false);
      
      this.logger.error(`Yahoo Finance API call failed`, {
        symbol,
        error: error.message,
        status: error.response?.status
      });

      throw new Error(`Yahoo Finance API error: ${error.message}`);
    }
  }

  /**
   * Yahoo Finance検索API
   */
  async yahooFinanceSearch(query: string): Promise<Company[]> {
    const startTime = Date.now();
    
    const limitCheck = apiLimitManager.canMakeRequest('yahoo');
    if (!limitCheck.allowed) {
      throw new Error(`Yahoo Finance rate limit: ${limitCheck.reason}`);
    }

    try {
      this.logger.info(`Yahoo Finance search starting`, { query });
      
      const response = await axios.get(
        'https://query1.finance.yahoo.com/v1/finance/search',
        {
          params: {
            q: query,
            lang: 'en-US',
            region: 'US',
            quotesCount: 10,
            newsCount: 0
          },
          timeout: testEnvironment.getApiConfig('yahooFinance').timeout,
          headers: {
            'User-Agent': 'Stock Analysis Helper/1.0',
            'Accept': 'application/json'
          }
        }
      );

      const responseTime = Date.now() - startTime;
      const companies = this.parseYahooSearchResponse(response.data);
      
      this.recordApiCall({
        timestamp: new Date(),
        provider: 'yahoo',
        method: 'search',
        query,
        success: true,
        responseTime,
        httpStatus: response.status
      });

      apiLimitManager.recordApiCall('yahoo', true);
      
      this.logger.info(`Yahoo Finance search successful`, {
        query,
        resultCount: companies.length,
        responseTime
      });

      return companies;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      this.recordApiCall({
        timestamp: new Date(),
        provider: 'yahoo',
        method: 'search',
        query,
        success: false,
        responseTime,
        httpStatus: error.response?.status,
        error: error.message
      });

      apiLimitManager.recordApiCall('yahoo', false);
      
      this.logger.error(`Yahoo Finance search failed`, {
        query,
        error: error.message,
        status: error.response?.status
      });

      throw new Error(`Yahoo Finance search error: ${error.message}`);
    }
  }

  /**
   * Alpha Vantage APIによる株価取得
   */
  async alphaVantageGetStock(symbol: string): Promise<FinancialData> {
    const config = testEnvironment.getApiConfig('alphaVantage');
    
    const apiKey = 'apiKey' in config ? config.apiKey : undefined;
    if (!apiKey) {
      throw new Error('Alpha Vantage API key not configured');
    }

    const limitCheck = apiLimitManager.canMakeRequest('alphavantage');
    if (!limitCheck.allowed) {
      throw new Error(`Alpha Vantage rate limit: ${limitCheck.reason}`);
    }

    const startTime = Date.now();

    try {
      this.logger.info(`Alpha Vantage API call starting`, { symbol });
      
      const response = await axios.get(
        'https://www.alphavantage.co/query',
        {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol,
            apikey: apiKey
          },
          timeout: config.timeout
        }
      );

      const responseTime = Date.now() - startTime;
      const data = this.parseAlphaVantageResponse(response.data, symbol);
      
      this.recordApiCall({
        timestamp: new Date(),
        provider: 'alphavantage',
        method: 'getStock',
        symbol,
        success: true,
        responseTime,
        httpStatus: response.status,
        quotaUsed: 1
      });

      apiLimitManager.recordApiCall('alphavantage', true);
      
      this.logger.info(`Alpha Vantage API call successful`, {
        symbol,
        price: data.price,
        responseTime
      });

      return data;

    } catch (error: any) {
      const responseTime = Date.now() - startTime;
      
      this.recordApiCall({
        timestamp: new Date(),
        provider: 'alphavantage',
        method: 'getStock',
        symbol,
        success: false,
        responseTime,
        httpStatus: error.response?.status,
        error: error.message
      });

      apiLimitManager.recordApiCall('alphavantage', false);
      
      this.logger.error(`Alpha Vantage API call failed`, {
        symbol,
        error: error.message,
        status: error.response?.status
      });

      throw new Error(`Alpha Vantage API error: ${error.message}`);
    }
  }

  private parseYahooFinanceResponse(data: any, symbol: string): FinancialData {
    try {
      const result = data?.chart?.result?.[0];
      const meta = result?.meta;
      const quote = result?.indicators?.quote?.[0];
      
      if (!meta || !quote) {
        throw new Error('Invalid Yahoo Finance response format');
      }

      const currentPrice = meta.regularMarketPrice || meta.previousClose || 0;
      const previousClose = meta.previousClose || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose !== 0 ? (change / previousClose) * 100 : 0;

      return {
        symbol: meta.symbol || symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: meta.regularMarketVolume || 0,
        avgVolume: meta.averageDailyVolume10Day || 0,
        marketCap: meta.marketCap || 0,
        pe: meta.trailingPE || 0,
        eps: meta.epsTrailingTwelveMonths || 0,
        dividendYield: meta.dividendYield ? meta.dividendYield * 100 : 0,
        week52High: meta.fiftyTwoWeekHigh || currentPrice,
        week52Low: meta.fiftyTwoWeekLow || currentPrice
      };
    } catch (error) {
      this.logger.error('Failed to parse Yahoo Finance response', { error, symbol });
      throw new Error('Failed to parse Yahoo Finance data');
    }
  }

  private parseYahooSearchResponse(data: any): Company[] {
    try {
      const quotes = data?.quotes || [];
      
      return quotes.map((quote: any) => ({
        symbol: quote.symbol,
        name: quote.longname || quote.shortname || quote.symbol,
        industry: quote.industry || 'Unknown',
        sector: quote.sector || 'Unknown',
        country: quote.region || 'Unknown',
        marketCap: quote.marketCap || 0,
        marketSegment: quote.quoteType || 'Unknown',
        exchange: quote.exchange || 'Unknown'
      })).slice(0, 10); // 最大10件
    } catch (error) {
      this.logger.error('Failed to parse Yahoo Finance search response', { error });
      return [];
    }
  }

  private parseAlphaVantageResponse(data: any, symbol: string): FinancialData {
    try {
      const quote = data['Global Quote'];
      
      if (!quote) {
        throw new Error('Invalid Alpha Vantage response format');
      }

      const price = parseFloat(quote['05. price']) || 0;
      const previousClose = parseFloat(quote['08. previous close']) || price;
      const change = parseFloat(quote['09. change']) || 0;
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

      return {
        symbol: quote['01. symbol'] || symbol,
        price: Math.round(price * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: parseInt(quote['06. volume']) || 0,
        avgVolume: parseInt(quote['06. volume']) || 0, // Alpha Vantageは平均出来高を提供しない
        marketCap: 0, // Alpha Vantageは時価総額を提供しない
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: parseFloat(quote['03. high']) || price,
        week52Low: parseFloat(quote['04. low']) || price
      };
    } catch (error) {
      this.logger.error('Failed to parse Alpha Vantage response', { error, symbol });
      throw new Error('Failed to parse Alpha Vantage data');
    }
  }

  private recordApiCall(call: RealApiCall): void {
    this.callHistory.push(call);
    
    // 最新1000件のみ保持
    if (this.callHistory.length > 1000) {
      this.callHistory = this.callHistory.slice(-1000);
    }
  }

  /**
   * API呼び出し統計の取得
   */
  public getRealApiStats(): {
    totalCalls: number;
    callsByProvider: { [provider: string]: number };
    successRate: number;
    averageResponseTime: number;
    recentErrors: RealApiCall[];
  } {
    const callsByProvider: { [provider: string]: number } = {};
    let totalResponseTime = 0;
    let successCount = 0;

    this.callHistory.forEach(call => {
      callsByProvider[call.provider] = (callsByProvider[call.provider] || 0) + 1;
      totalResponseTime += call.responseTime;
      if (call.success) successCount++;
    });

    const recentErrors = this.callHistory
      .filter(call => !call.success)
      .slice(-5); // 最新5件のエラー

    return {
      totalCalls: this.callHistory.length,
      callsByProvider,
      successRate: this.callHistory.length > 0 ? successCount / this.callHistory.length : 0,
      averageResponseTime: this.callHistory.length > 0 ? totalResponseTime / this.callHistory.length : 0,
      recentErrors
    };
  }

  /**
   * APIヘルスチェック
   */
  async healthCheck(): Promise<{
    provider: string;
    available: boolean;
    responseTime?: number;
    error?: string;
  }[]> {
    const results = [];
    
    // Yahoo Finance ヘルスチェック
    try {
      const startTime = Date.now();
      await axios.get('https://query1.finance.yahoo.com/v1/finance/search?q=AAPL', {
        timeout: 5000
      });
      
      results.push({
        provider: 'yahoo',
        available: true,
        responseTime: Date.now() - startTime
      });
    } catch (error: any) {
      results.push({
        provider: 'yahoo',
        available: false,
        error: error.message
      });
    }

    // Alpha Vantage ヘルスチェック（APIキーがある場合のみ）
    const alphaConfig = testEnvironment.getApiConfig('alphaVantage');
    const alphaApiKey = 'apiKey' in alphaConfig ? alphaConfig.apiKey : undefined;
    if (alphaApiKey) {
      try {
        const startTime = Date.now();
        await axios.get('https://www.alphavantage.co/query', {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: 'AAPL',
            apikey: alphaApiKey
          },
          timeout: 5000
        });
        
        results.push({
          provider: 'alphavantage',
          available: true,
          responseTime: Date.now() - startTime
        });
      } catch (error: any) {
        results.push({
          provider: 'alphavantage',
          available: false,
          error: error.message
        });
      }
    }

    this.logger.info('API health check completed', { results });
    return results;
  }

  /**
   * Yahoo Finance用にシンボルをフォーマット
   */
  private formatSymbolForYahoo(symbol: string): string {
    // 日本株の場合（4桁数字）、.Tサフィックスを追加
    if (/^\d{4}$/.test(symbol)) {
      return `${symbol}.T`;
    }
    
    // その他のシンボルはそのまま返す
    return symbol;
  }
}

export const realApiService = new RealApiService();