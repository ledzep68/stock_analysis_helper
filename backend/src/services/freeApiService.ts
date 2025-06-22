import axios from 'axios';
import { FinancialData, Company } from '../types';

// 完全無料のAPIサービス（APIキー不要）
export class FreeApiService {

  // Yahoo Finance V8 API (公開エンドポイント)
  static async getYahooFinanceData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching data from Yahoo Finance for ${symbol}...`);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}`,
        {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      const result = response.data?.chart?.result?.[0];
      if (!result) {
        console.log(`No data found for ${symbol} from Yahoo Finance`);
        return null;
      }

      const meta = result.meta;
      const quote = result.indicators?.quote?.[0];
      const timestamps = result.timestamp;
      const lastIndex = quote?.close?.length - 1;

      if (!meta || !quote || lastIndex < 0) {
        console.log(`Invalid data structure for ${symbol}`);
        return null;
      }

      const currentPrice = meta.regularMarketPrice || quote.close[lastIndex];
      const previousClose = meta.previousClose || quote.close[lastIndex - 1] || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const data: FinancialData = {
        symbol: meta.symbol || symbol,
        price: Math.round(currentPrice * 100) / 100,
        previousClose: Math.round(previousClose * 100) / 100,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: quote.volume?.[lastIndex] || 0,
        avgVolume: meta.averageDailyVolume10Day || 0,
        marketCap: meta.marketCap || 0,
        pe: 0, // Not available in this endpoint
        eps: 0, // Not available in this endpoint
        dividendYield: 0, // Not available in this endpoint
        week52High: meta.fiftyTwoWeekHigh || currentPrice * 1.2,
        week52Low: meta.fiftyTwoWeekLow || currentPrice * 0.8
      };

      console.log(`Successfully fetched Yahoo Finance data for ${symbol}:`, data.price);
      return data;

    } catch (error: any) {
      console.error(`Yahoo Finance API error for ${symbol}:`, error.message);
      return null;
    }
  }

  // Financial Modeling Prep (デモデータ)
  static async getFMPData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching data from FMP for ${symbol}...`);
      
      // Financial Modeling Prep のデモエンドポイント
      const response = await axios.get(
        `https://financialmodelingprep.com/api/v3/quote/${symbol}?apikey=demo`,
        { timeout: 5000 }
      );

      const data = response.data?.[0];
      if (!data) {
        console.log(`No FMP data found for ${symbol}`);
        return null;
      }

      const result: FinancialData = {
        symbol: data.symbol || symbol,
        price: data.price || 0,
        previousClose: data.previousClose || 0,
        change: data.change || 0,
        changePercent: data.changesPercentage || 0,
        volume: data.volume || 0,
        avgVolume: data.avgVolume || 0,
        marketCap: data.marketCap || 0,
        pe: data.pe || 0,
        eps: data.eps || 0,
        dividendYield: 0,
        week52High: data.yearHigh || 0,
        week52Low: data.yearLow || 0
      };

      console.log(`Successfully fetched FMP data for ${symbol}:`, result.price);
      return result;

    } catch (error: any) {
      console.error(`FMP API error for ${symbol}:`, error.message);
      return null;
    }
  }

  // IEX Cloud (サンドボックス - 完全無料)
  static async getIEXData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching data from IEX Cloud for ${symbol}...`);
      
      const response = await axios.get(
        `https://sandbox.iexapis.com/stable/stock/${symbol}/quote?token=Tpk_059b97af715d417d9f49f50b51b1c448`,
        { timeout: 5000 }
      );

      const data = response.data;
      if (!data) {
        console.log(`No IEX data found for ${symbol}`);
        return null;
      }

      const result: FinancialData = {
        symbol: data.symbol || symbol,
        price: data.latestPrice || 0,
        previousClose: data.previousClose || 0,
        change: data.change || 0,
        changePercent: data.changePercent ? data.changePercent * 100 : 0,
        volume: data.latestVolume || 0,
        avgVolume: data.avgTotalVolume || 0,
        marketCap: data.marketCap || 0,
        pe: data.peRatio || 0,
        eps: 0,
        dividendYield: 0,
        week52High: data.week52High || 0,
        week52Low: data.week52Low || 0
      };

      console.log(`Successfully fetched IEX data for ${symbol}:`, result.price);
      return result;

    } catch (error: any) {
      console.error(`IEX API error for ${symbol}:`, error.message);
      return null;
    }
  }

  // Twelve Data (無料プラン)
  static async getTwelveData(symbol: string): Promise<FinancialData | null> {
    try {
      console.log(`Fetching data from Twelve Data for ${symbol}...`);
      
      const response = await axios.get(
        `https://api.twelvedata.com/quote?symbol=${symbol}&apikey=demo`,
        { timeout: 5000 }
      );

      const data = response.data;
      if (!data || data.status === 'error') {
        console.log(`No Twelve Data found for ${symbol}`);
        return null;
      }

      const currentPrice = parseFloat(data.close) || 0;
      const previousClose = parseFloat(data.previous_close) || currentPrice;
      const change = currentPrice - previousClose;
      const changePercent = previousClose > 0 ? (change / previousClose) * 100 : 0;

      const result: FinancialData = {
        symbol: data.symbol || symbol,
        price: currentPrice,
        previousClose: previousClose,
        change: Math.round(change * 100) / 100,
        changePercent: Math.round(changePercent * 100) / 100,
        volume: parseInt(data.volume) || 0,
        avgVolume: 0,
        marketCap: 0,
        pe: 0,
        eps: 0,
        dividendYield: 0,
        week52High: parseFloat(data.fifty_two_week.high) || 0,
        week52Low: parseFloat(data.fifty_two_week.low) || 0
      };

      console.log(`Successfully fetched Twelve Data for ${symbol}:`, result.price);
      return result;

    } catch (error: any) {
      console.error(`Twelve Data API error for ${symbol}:`, error.message);
      return null;
    }
  }

  // メイン取得メソッド - 複数の無料APIを順次試行
  static async getFinancialData(symbol: string): Promise<FinancialData | null> {
    const apis = [
      () => this.getYahooFinanceData(symbol),
      () => this.getFMPData(symbol),
      () => this.getIEXData(symbol),
      () => this.getTwelveData(symbol)
    ];

    for (let i = 0; i < apis.length; i++) {
      try {
        console.log(`Trying API ${i + 1}/4 for ${symbol}...`);
        const data = await apis[i]();
        if (data && data.price > 0) {
          console.log(`✅ Successfully got data from API ${i + 1} for ${symbol}`);
          return data;
        }
      } catch (error) {
        console.log(`❌ API ${i + 1} failed for ${symbol}:`, (error as Error).message);
      }
    }

    console.log(`🚫 All APIs failed for ${symbol}`);
    return null;
  }

  // 会社検索（Yahoo Finance経由）
  static async searchCompanies(query: string): Promise<Company[]> {
    try {
      console.log(`Searching companies for: ${query}`);
      
      const response = await axios.get(
        `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(query)}`,
        {
          timeout: 8000,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
          }
        }
      );

      const quotes = response.data?.quotes || [];
      
      return quotes
        .filter((quote: any) => quote.quoteType === 'EQUITY')
        .slice(0, 10)
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
      console.error('Search companies error:', error.message);
      return [];
    }
  }

  // 日本株対応の検索
  static async searchJapaneseCompanies(query: string): Promise<Company[]> {
    try {
      // 4桁の数字の場合は日本株として扱う
      if (/^\d{4}$/.test(query)) {
        const data = await this.getYahooFinanceData(`${query}.T`);
        if (data) {
          return [{
            symbol: query,
            name: `${query} (日本株)`,
            industry: 'Unknown',
            sector: 'Unknown',
            country: 'Japan',
            marketCap: 0,
            marketSegment: 'TSE',
            exchange: 'TSE'
          }];
        }
      }
      return [];
    } catch (error) {
      console.error('Japanese search error:', error);
      return [];
    }
  }
}