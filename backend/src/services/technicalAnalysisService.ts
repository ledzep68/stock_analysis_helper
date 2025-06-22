import { sqliteDb } from '../config/sqlite';

interface PriceData {
  date: string;
  close: number;
  high: number;
  low: number;
  volume: number;
}

interface TechnicalIndicators {
  sma: { [key: string]: number };
  ema: { [key: string]: number };
  rsi: number;
  macd: {
    macdLine: number;
    signalLine: number;
    histogram: number;
  };
  bollingerBands: {
    upper: number;
    middle: number;
    lower: number;
  };
  stochastic: {
    k: number;
    d: number;
  };
  atr: number;
  adx: number;
  volume: {
    average: number;
    ratio: number;
  };
}

interface TechnicalAnalysisResult {
  symbol: string;
  indicators: TechnicalIndicators;
  signals: {
    trend: 'bullish' | 'bearish' | 'neutral';
    strength: number;
    recommendations: string[];
  };
  timestamp: string;
}

export class TechnicalAnalysisService {
  private static calculateSMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    const sum = prices.slice(-period).reduce((a, b) => a + b, 0);
    return sum / period;
  }

  private static calculateEMA(prices: number[], period: number): number {
    if (prices.length < period) return 0;
    
    const multiplier = 2 / (period + 1);
    let ema = this.calculateSMA(prices.slice(0, period), period);
    
    for (let i = period; i < prices.length; i++) {
      ema = (prices[i] - ema) * multiplier + ema;
    }
    
    return ema;
  }

  private static calculateRSI(prices: number[], period: number = 14): number {
    if (prices.length < period + 1) return 50;
    
    let gains = 0;
    let losses = 0;
    
    for (let i = prices.length - period; i < prices.length; i++) {
      const change = prices[i] - prices[i - 1];
      if (change > 0) {
        gains += change;
      } else {
        losses += Math.abs(change);
      }
    }
    
    const avgGain = gains / period;
    const avgLoss = losses / period;
    
    if (avgLoss === 0) return 100;
    
    const rs = avgGain / avgLoss;
    const rsi = 100 - (100 / (1 + rs));
    
    return rsi;
  }

  private static calculateMACD(prices: number[]): { macdLine: number; signalLine: number; histogram: number } {
    const ema12 = this.calculateEMA(prices, 12);
    const ema26 = this.calculateEMA(prices, 26);
    const macdLine = ema12 - ema26;
    
    const macdValues = [];
    for (let i = 26; i < prices.length; i++) {
      const ema12Temp = this.calculateEMA(prices.slice(0, i + 1), 12);
      const ema26Temp = this.calculateEMA(prices.slice(0, i + 1), 26);
      macdValues.push(ema12Temp - ema26Temp);
    }
    
    const signalLine = this.calculateEMA(macdValues, 9);
    const histogram = macdLine - signalLine;
    
    return { macdLine, signalLine, histogram };
  }

  private static calculateBollingerBands(prices: number[], period: number = 20, stdDev: number = 2): { upper: number; middle: number; lower: number } {
    const sma = this.calculateSMA(prices, period);
    const relevantPrices = prices.slice(-period);
    
    const squaredDiffs = relevantPrices.map(price => Math.pow(price - sma, 2));
    const variance = squaredDiffs.reduce((a, b) => a + b, 0) / period;
    const standardDeviation = Math.sqrt(variance);
    
    return {
      upper: sma + (stdDev * standardDeviation),
      middle: sma,
      lower: sma - (stdDev * standardDeviation)
    };
  }

  private static calculateStochastic(highs: number[], lows: number[], closes: number[], period: number = 14): { k: number; d: number } {
    if (highs.length < period) return { k: 50, d: 50 };
    
    const recentHighs = highs.slice(-period);
    const recentLows = lows.slice(-period);
    const currentClose = closes[closes.length - 1];
    
    const lowestLow = Math.min(...recentLows);
    const highestHigh = Math.max(...recentHighs);
    
    const k = ((currentClose - lowestLow) / (highestHigh - lowestLow)) * 100;
    
    const kValues = [];
    for (let i = period - 1; i < closes.length; i++) {
      const periodHighs = highs.slice(i - period + 1, i + 1);
      const periodLows = lows.slice(i - period + 1, i + 1);
      const periodClose = closes[i];
      
      const periodLowestLow = Math.min(...periodLows);
      const periodHighestHigh = Math.max(...periodHighs);
      
      kValues.push(((periodClose - periodLowestLow) / (periodHighestHigh - periodLowestLow)) * 100);
    }
    
    const d = this.calculateSMA(kValues.slice(-3), 3);
    
    return { k, d };
  }

  private static calculateATR(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period + 1) return 0;
    
    const trueRanges = [];
    for (let i = 1; i < highs.length; i++) {
      const highLow = highs[i] - lows[i];
      const highClose = Math.abs(highs[i] - closes[i - 1]);
      const lowClose = Math.abs(lows[i] - closes[i - 1]);
      
      trueRanges.push(Math.max(highLow, highClose, lowClose));
    }
    
    return this.calculateSMA(trueRanges, period);
  }

  private static calculateADX(highs: number[], lows: number[], closes: number[], period: number = 14): number {
    if (highs.length < period * 2) return 0;
    
    const plusDM = [];
    const minusDM = [];
    
    for (let i = 1; i < highs.length; i++) {
      const highDiff = highs[i] - highs[i - 1];
      const lowDiff = lows[i - 1] - lows[i];
      
      if (highDiff > lowDiff && highDiff > 0) {
        plusDM.push(highDiff);
        minusDM.push(0);
      } else if (lowDiff > highDiff && lowDiff > 0) {
        plusDM.push(0);
        minusDM.push(lowDiff);
      } else {
        plusDM.push(0);
        minusDM.push(0);
      }
    }
    
    const atr = this.calculateATR(highs, lows, closes, period);
    const plusDI = (this.calculateEMA(plusDM, period) / atr) * 100;
    const minusDI = (this.calculateEMA(minusDM, period) / atr) * 100;
    
    const dx = Math.abs(plusDI - minusDI) / (plusDI + minusDI) * 100;
    
    return dx;
  }

  private static generateSignals(indicators: TechnicalIndicators, currentPrice: number, prices: number[]): { trend: 'bullish' | 'bearish' | 'neutral'; strength: number; recommendations: string[] } {
    const signals = [];
    let bullishCount = 0;
    let bearishCount = 0;
    
    if (currentPrice > indicators.sma['20']) {
      bullishCount++;
      signals.push('価格が20日移動平均線を上回っています');
    } else {
      bearishCount++;
    }
    
    if (indicators.sma['20'] > indicators.sma['50']) {
      bullishCount++;
      signals.push('短期移動平均線が中期移動平均線を上回っています（ゴールデンクロス）');
    } else {
      bearishCount++;
    }
    
    if (indicators.rsi < 30) {
      bullishCount++;
      signals.push('RSIが売られ過ぎゾーンにあります（反発の可能性）');
    } else if (indicators.rsi > 70) {
      bearishCount++;
      signals.push('RSIが買われ過ぎゾーンにあります（調整の可能性）');
    }
    
    if (indicators.macd.histogram > 0) {
      bullishCount++;
      signals.push('MACDヒストグラムがプラスです');
    } else {
      bearishCount++;
    }
    
    if (currentPrice < indicators.bollingerBands.lower) {
      bullishCount++;
      signals.push('価格がボリンジャーバンド下限を下回っています（反発の可能性）');
    } else if (currentPrice > indicators.bollingerBands.upper) {
      bearishCount++;
      signals.push('価格がボリンジャーバンド上限を上回っています（調整の可能性）');
    }
    
    if (indicators.stochastic.k > indicators.stochastic.d && indicators.stochastic.k < 20) {
      bullishCount++;
      signals.push('ストキャスティクスが売られ過ぎゾーンで買いシグナルを示しています');
    } else if (indicators.stochastic.k < indicators.stochastic.d && indicators.stochastic.k > 80) {
      bearishCount++;
      signals.push('ストキャスティクスが買われ過ぎゾーンで売りシグナルを示しています');
    }
    
    const totalSignals = bullishCount + bearishCount;
    const strength = Math.abs(bullishCount - bearishCount) / totalSignals * 100;
    
    let trend: 'bullish' | 'bearish' | 'neutral';
    if (bullishCount > bearishCount) {
      trend = 'bullish';
    } else if (bearishCount > bullishCount) {
      trend = 'bearish';
    } else {
      trend = 'neutral';
    }
    
    return { trend, strength, recommendations: signals };
  }

  static async analyzeTechnicalIndicators(symbol: string, priceData: PriceData[]): Promise<TechnicalAnalysisResult> {
    if (!priceData || priceData.length < 50) {
      throw new Error('Insufficient price data for technical analysis');
    }
    
    const closes = priceData.map(d => d.close);
    const highs = priceData.map(d => d.high);
    const lows = priceData.map(d => d.low);
    const volumes = priceData.map(d => d.volume);
    
    const currentPrice = closes[closes.length - 1];
    const avgVolume = this.calculateSMA(volumes, 20);
    const currentVolume = volumes[volumes.length - 1];
    
    const indicators: TechnicalIndicators = {
      sma: {
        '10': this.calculateSMA(closes, 10),
        '20': this.calculateSMA(closes, 20),
        '50': this.calculateSMA(closes, 50),
        '200': this.calculateSMA(closes, 200)
      },
      ema: {
        '12': this.calculateEMA(closes, 12),
        '26': this.calculateEMA(closes, 26),
        '50': this.calculateEMA(closes, 50)
      },
      rsi: this.calculateRSI(closes, 14),
      macd: this.calculateMACD(closes),
      bollingerBands: this.calculateBollingerBands(closes, 20, 2),
      stochastic: this.calculateStochastic(highs, lows, closes, 14),
      atr: this.calculateATR(highs, lows, closes, 14),
      adx: this.calculateADX(highs, lows, closes, 14),
      volume: {
        average: avgVolume,
        ratio: currentVolume / avgVolume
      }
    };
    
    const signals = this.generateSignals(indicators, currentPrice, closes);
    
    return {
      symbol,
      indicators,
      signals,
      timestamp: new Date().toISOString()
    };
  }

  static async getHistoricalPrices(symbol: string, days: number = 100): Promise<PriceData[]> {
    try {
      const query = `
        SELECT 
          date,
          close_price as close,
          high_price as high,
          low_price as low,
          volume
        FROM stock_prices
        WHERE symbol = ?
          AND date >= date('now', '-${days} days')
        ORDER BY date ASC
      `;
      
      const result = await sqliteDb.query(query, [symbol]);
      const rows = result.rows || [];
      
      if (rows.length === 0) {
        throw new Error(`No price data found for symbol: ${symbol}`);
      }
      
      return rows.map((row: any) => ({
        date: row.date,
        close: parseFloat(row.close),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        volume: parseInt(row.volume)
      }));
    } catch (error) {
      console.error('Error fetching historical prices:', error);
      throw error;
    }
  }

  static async performTechnicalAnalysis(symbol: string): Promise<TechnicalAnalysisResult> {
    try {
      const priceData = await this.getHistoricalPrices(symbol, 200);
      const analysis = await this.analyzeTechnicalIndicators(symbol, priceData);
      
      await sqliteDb.query(
        `INSERT OR REPLACE INTO technical_analysis_cache (symbol, analysis_data, created_at, updated_at)
         VALUES (?, ?, datetime('now'), datetime('now'))`,
        [symbol, JSON.stringify(analysis)]
      );
      
      return analysis;
    } catch (error) {
      console.error('Error performing technical analysis:', error);
      throw error;
    }
  }
}