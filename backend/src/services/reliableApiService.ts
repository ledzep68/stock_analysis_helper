import axios from 'axios';
import { FinancialData, Company } from '../types';

// より確実に動作する外部APIサービス
export class ReliableApiService {

  // Alpha Vantage 無料API (デイリー500回まで)
  static async getAlphaVantageData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching from Alpha Vantage for ${symbol}...`);
      
      // Alpha Vantageのデモ機能を使用
      const response = await axios.get(
        `https://www.alphavantage.co/query`,
        {
          params: {
            function: 'GLOBAL_QUOTE',
            symbol: symbol,
            apikey: 'demo'
          },
          timeout: 10000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; StockAnalyzer/1.0)'
          }
        }
      );

      const quote = response.data['Global Quote'];
      if (!quote || Object.keys(quote).length === 0) {
        console.log(`No Alpha Vantage data for ${symbol}`);
        return null;
      }

      const currentPrice = parseFloat(quote['05. price']) || 0;
      const previousClose = parseFloat(quote['08. previous close']) || 0;
      const change = parseFloat(quote['09. change']) || 0;
      const changePercent = parseFloat(quote['10. change percent']?.replace('%', '')) || 0;

      const result: FinancialData = {
        symbol: quote['01. symbol'] || symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: parseInt(quote['06. volume']) || 0,
        avgVolume: parseInt(quote['06. volume']) || 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: parseFloat(quote['03. high']) || currentPrice * 1.1,
        week52Low: parseFloat(quote['04. low']) || currentPrice * 0.9
      };

      console.log(`✅ Alpha Vantage data for ${symbol}: $${result.price}`);
      return result;

    } catch (error: any) {
      console.error(`Alpha Vantage error for ${symbol}:`, error.message);
      return null;
    }
  }

  // Polygon.io 無料API
  static async getPolygonData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching from Polygon for ${symbol}...`);
      
      // Polygon.ioの前日クローズデータ（無料）
      const response = await axios.get(
        `https://api.polygon.io/v2/aggs/ticker/${symbol}/prev?adjusted=true&apikey=demo`,
        {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; StockAnalyzer/1.0)'
          }
        }
      );

      const data = response.data;
      if (!data.results || data.results.length === 0) {
        console.log(`No Polygon data for ${symbol}`);
        return null;
      }

      const result = data.results[0];
      const currentPrice = result.c; // Close price
      const openPrice = result.o; // Open price
      const change = currentPrice - openPrice;
      const changePercent = openPrice > 0 ? (change / openPrice) * 100 : 0;

      const financialData: FinancialData = {
        symbol: symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(openPrice * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: result.v || 0,
        avgVolume: result.v || 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: result.h || currentPrice * 1.1,
        week52Low: result.l || currentPrice * 0.9
      };

      console.log(`✅ Polygon data for ${symbol}: $${financialData.price}`);
      return financialData;

    } catch (error: any) {
      console.error(`Polygon error for ${symbol}:`, error.message);
      return null;
    }
  }

  // Yahoo Finance 代替API（Rapid API経由）
  static async getYahooAlternativeData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching Yahoo alternative for ${symbol}...`);
      
      // より安定したYahoo Financeエンドポイント
      const response = await axios.get(
        `https://query2.finance.yahoo.com/v10/finance/quoteSummary/${symbol}`,
        {
          params: {
            modules: 'price'
          },
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        }
      );

      const result = response.data?.quoteSummary?.result?.[0];
      if (!result || !result.price) {
        console.log(`No Yahoo alternative data for ${symbol}`);
        return null;
      }

      const price = result.price;
      const currentPrice = price.regularMarketPrice?.raw || 0;
      const previousClose = price.regularMarketPreviousClose?.raw || 0;
      const change = price.regularMarketChange?.raw || 0;
      const changePercent = price.regularMarketChangePercent?.raw * 100 || 0;

      const financialData: FinancialData = {
        symbol: price.symbol || symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: price.regularMarketVolume?.raw || 0,
        avgVolume: price.averageDailyVolume10Day?.raw || 0,
        marketCap: price.marketCap?.raw || 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: price.fiftyTwoWeekHigh?.raw || currentPrice * 1.1,
        week52Low: price.fiftyTwoWeekLow?.raw || currentPrice * 0.9
      };

      console.log(`✅ Yahoo alternative data for ${symbol}: $${financialData.price}`);
      return financialData;

    } catch (error: any) {
      console.error(`Yahoo alternative error for ${symbol}:`, error.message);
      return null;
    }
  }

  // メイン取得メソッド - より確実なAPIから順次試行
  static async getFinancialData(symbol: string): Promise<FinancialData | null> {
    console.log(`🔍 Getting reliable data for ${symbol}...`);
    
    const apis = [
      () => this.getAlphaVantageData(symbol),
      () => this.getPolygonData(symbol),
      () => this.getYahooAlternativeData(symbol)
    ];

    for (let i = 0; i < apis.length; i++) {
      try {
        console.log(`Trying reliable API ${i + 1}/${apis.length} for ${symbol}...`);
        const data = await apis[i]();
        if (data && data.price > 0) {
          console.log(`✅ Successfully got reliable data from API ${i + 1} for ${symbol}`);
          return data;
        }
      } catch (error) {
        console.log(`❌ Reliable API ${i + 1} failed for ${symbol}:`, (error as Error).message);
      }
      
      // API間で少し待機してレート制限を避ける
      if (i < apis.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }

    console.log(`🚫 All reliable APIs failed for ${symbol}`);
    return null;
  }

  // 簡単な検索機能
  static async searchSymbol(query: string): Promise<Company[]> {
    // まず一般的なシンボルかチェック
    const commonSymbols = [
      { symbol: 'AAPL', name: 'Apple Inc.' },
      { symbol: 'MSFT', name: 'Microsoft Corporation' },
      { symbol: 'GOOGL', name: 'Alphabet Inc.' },
      { symbol: 'AMZN', name: 'Amazon.com Inc.' },
      { symbol: 'TSLA', name: 'Tesla, Inc.' },
      { symbol: 'META', name: 'Meta Platforms Inc.' },
      { symbol: 'NVDA', name: 'NVIDIA Corporation' },
      { symbol: 'JPM', name: 'JPMorgan Chase & Co.' },
      { symbol: 'V', name: 'Visa Inc.' },
      { symbol: 'JNJ', name: 'Johnson & Johnson' }
    ];

    const matches = commonSymbols.filter(
      item => item.symbol.toLowerCase().includes(query.toLowerCase()) ||
              item.name.toLowerCase().includes(query.toLowerCase())
    );

    return matches.map(item => ({
      symbol: item.symbol,
      name: item.name,
      industry: 'Technology',
      sector: 'Technology',
      country: 'US',
      marketCap: 0,
      marketSegment: 'NASDAQ',
      exchange: 'NASDAQ'
    }));
  }
}