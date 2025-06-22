import axios from 'axios';
import { FinancialData, Company } from '../types';

// 完全に公開されている無料APIサービス（APIキー不要）
export class PublicApiService {

  // Yahoo Finance V7 API (軽量版)
  static async getYahooQuickData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching Yahoo quick data for ${symbol}...`);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`,
        {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; StockAnalyzer/1.0)',
            'Accept': 'application/json'
          }
        }
      );

      const result = response.data?.quoteResponse?.result?.[0];
      if (!result) {
        console.log(`No Yahoo quick data for ${symbol}`);
        return null;
      }

      const data: FinancialData = {
        symbol: result.symbol || symbol,
        price: result.regularMarketPrice || 0,
        previousClose: result.regularMarketPreviousClose || 0,
        change: result.regularMarketChange || 0,
        changePercent: result.regularMarketChangePercent || 0,
        volume: result.regularMarketVolume || 0,
        avgVolume: result.averageDailyVolume3Month || 0,
        marketCap: result.marketCap || 0,
        pe: result.trailingPE || 0,
        eps: result.epsTrailingTwelveMonths || 0,
        dividendYield: result.dividendYield || 0,
        week52High: result.fiftyTwoWeekHigh || 0,
        week52Low: result.fiftyTwoWeekLow || 0
      };

      // データが有効かチェック
      if (data.price <= 0) {
        console.log(`Invalid price data for ${symbol}`);
        return null;
      }

      console.log(`✅ Yahoo quick data for ${symbol}: $${data.price}`);
      return data;

    } catch (error: any) {
      console.error(`Yahoo quick API error for ${symbol}:`, error.message);
      return null;
    }
  }

  // Marketstack (無料プラン) - EOD Data
  static async getMarketstackData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching Marketstack data for ${symbol}...`);
      
      // Marketstackの無料エンドポイント（少し制限あり）
      const response = await axios.get(
        `http://api.marketstack.com/v1/eod/latest?access_key=free&symbols=${symbol}`,
        { timeout: 5000 }
      );

      const data = response.data?.data?.[0];
      if (!data) {
        console.log(`No Marketstack data for ${symbol}`);
        return null;
      }

      const currentPrice = data.close || 0;
      const previousClose = data.open || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const result: FinancialData = {
        symbol: data.symbol || symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: data.volume || 0,
        avgVolume: data.volume || 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: data.high || currentPrice * 1.1,
        week52Low: data.low || currentPrice * 0.9
      };

      console.log(`✅ Marketstack data for ${symbol}: $${result.price}`);
      return result;

    } catch (error: any) {
      console.error(`Marketstack error for ${symbol}:`, error.message);
      return null;
    }
  }

  // World Trading Data (無料) - リアルタイムデータ
  static async getWorldTradingData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching World Trading data for ${symbol}...`);
      
      const response = await axios.get(
        `https://api.worldtradingdata.com/api/v1/stock?symbol=${symbol}&api_token=demo`,
        { timeout: 5000 }
      );

      const data = response.data?.data?.[0];
      if (!data) {
        console.log(`No World Trading data for ${symbol}`);
        return null;
      }

      const currentPrice = parseFloat(data.price) || 0;
      const change = parseFloat(data.change_pct) || 0;
      const previousClose = currentPrice / (1 + change / 100);

      const result: FinancialData = {
        symbol: data.symbol || symbol,
        price: currentPrice,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round((currentPrice - previousClose) * 100) / 100,
        changePercent: Math.round(change * 100) / 100,
        volume: parseInt(data.volume) || 0,
        avgVolume: parseInt(data.volume) || 0,
        marketCap: parseInt(data.market_cap) || 0,
        pe: parseFloat(data.pe) || 0,
        eps: parseFloat(data.eps) || 0,
        dividendYield: 0,
        week52High: parseFloat(data['52_week_high']) || currentPrice * 1.1,
        week52Low: parseFloat(data['52_week_low']) || currentPrice * 0.9
      };

      console.log(`✅ World Trading data for ${symbol}: $${result.price}`);
      return result;

    } catch (error: any) {
      console.error(`World Trading error for ${symbol}:`, error.message);
      return null;
    }
  }

  // FCS API (無料) - Forex & Stocks
  static async getFCSData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching FCS data for ${symbol}...`);
      
      const response = await axios.get(
        `https://fcsapi.com/api-v3/stock/latest?symbol=${symbol}&access_key=demo`,
        { timeout: 5000 }
      );

      const data = response.data?.response?.[0];
      if (!data) {
        console.log(`No FCS data for ${symbol}`);
        return null;
      }

      const currentPrice = parseFloat(data.c) || 0; // Current price
      const change = parseFloat(data.ch) || 0; // Change
      const changePercent = parseFloat(data.cp) || 0; // Change percent
      const previousClose = currentPrice - change;

      const result: FinancialData = {
        symbol: data.s || symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: 0,
        avgVolume: 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: currentPrice * 1.1,
        week52Low: currentPrice * 0.9
      };

      console.log(`✅ FCS data for ${symbol}: $${result.price}`);
      return result;

    } catch (error: any) {
      console.error(`FCS error for ${symbol}:`, error.message);
      return null;
    }
  }

  // メイン取得メソッド - 公開APIから順次試行
  static async getFinancialData(symbol: string): Promise<FinancialData | null> {
    console.log(`🔍 Getting public API data for ${symbol}...`);
    
    const apis = [
      () => this.getYahooQuickData(symbol),
      () => this.getFCSData(symbol),
      () => this.getWorldTradingData(symbol),
      () => this.getMarketstackData(symbol)
    ];

    for (let i = 0; i < apis.length; i++) {
      try {
        console.log(`Trying public API ${i + 1}/${apis.length} for ${symbol}...`);
        const data = await apis[i]();
        if (data && data.price > 0) {
          console.log(`✅ Successfully got public API data from source ${i + 1} for ${symbol}`);
          return data;
        }
      } catch (error) {
        console.log(`❌ Public API ${i + 1} failed for ${symbol}:`, (error as Error).message);
      }
      
      // API間で短い待機
      if (i < apis.length - 1) {
        await new Promise(resolve => setTimeout(resolve, 500));
      }
    }

    console.log(`🚫 All public APIs failed for ${symbol}`);
    return null;
  }

  // 検索機能 - Yahoo Finance検索
  static async searchCompanies(query: string): Promise<Company[]> {
    try {
      console.log(`Searching public APIs for: ${query}`);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}&lang=en-US&region=US&quotesCount=10&newsCount=0`,
        {
          timeout: 5000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; StockAnalyzer/1.0)'
          }
        }
      );

      const quotes = response.data?.quotes || [];
      
      return quotes
        .filter((quote: any) => quote.quoteType === 'EQUITY' && quote.symbol)
        .slice(0, 8)
        .map((quote: any) => ({
          symbol: quote.symbol,
          name: quote.longname || quote.shortname || quote.symbol,
          industry: quote.industry || 'Unknown',
          sector: quote.sector || 'Unknown',
          country: quote.region || 'Unknown',
          marketCap: quote.marketCap || 0,
          marketSegment: quote.exchange || 'Unknown',
          exchange: quote.exchange || 'Unknown'
        }));

    } catch (error: any) {
      console.error('Public API search error:', error.message);
      
      // フォールバック: 一般的な株式リスト
      const commonStocks = [
        { symbol: 'AAPL', name: 'Apple Inc.', industry: 'Technology', sector: 'Technology' },
        { symbol: 'MSFT', name: 'Microsoft Corporation', industry: 'Technology', sector: 'Technology' },
        { symbol: 'GOOGL', name: 'Alphabet Inc.', industry: 'Technology', sector: 'Communication Services' },
        { symbol: 'AMZN', name: 'Amazon.com Inc.', industry: 'E-Commerce', sector: 'Consumer Cyclical' },
        { symbol: 'TSLA', name: 'Tesla, Inc.', industry: 'Auto Manufacturers', sector: 'Consumer Cyclical' }
      ];

      return commonStocks
        .filter(stock => 
          stock.symbol.toLowerCase().includes(query.toLowerCase()) ||
          stock.name.toLowerCase().includes(query.toLowerCase())
        )
        .map(stock => ({
          ...stock,
          country: 'US',
          marketCap: 0,
          marketSegment: 'NASDAQ',
          exchange: 'NASDAQ'
        }));
    }
  }
}