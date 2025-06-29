import { Router, Request, Response } from 'express';
import { authenticateToken } from '../middleware/auth';
import { validateSymbol, createSecureApiResponse } from '../utils/security';
import { apiLimitMiddleware, addLimitStatusToResponse } from '../middleware/apiLimitMiddleware';
import { sqliteDb } from '../config/sqlite';

const router = Router();

export interface ChartDataPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface TechnicalOverlay {
  date: string;
  sma20?: number;
  sma50?: number;
  ema12?: number;
  ema26?: number;
  bollingerUpper?: number;
  bollingerLower?: number;
  rsi?: number;
  macd?: number;
  signal?: number;
}

router.use(authenticateToken);

/**
 * チャート用価格履歴データ取得
 * GET /api/chart-data/:symbol/price-history
 */
router.get('/:symbol/price-history',
  apiLimitMiddleware(),
  addLimitStatusToResponse,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { period = '1M', interval = '1d' } = req.query;

      if (!validateSymbol(symbol)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid symbol format')
        );
      }

      const priceData = await getPriceHistory(symbol, period as string, interval as string);
      
      res.json(createSecureApiResponse(true, {
        symbol,
        period,
        interval,
        data: priceData
      }));

    } catch (error: any) {
      console.error('Chart data error:', error);
      res.status(500).json(
        createSecureApiResponse(false, undefined, 'Failed to get chart data')
      );
    }
  }
);

/**
 * テクニカル指標オーバーレイデータ取得
 * GET /api/chart-data/:symbol/technical-overlay
 */
router.get('/:symbol/technical-overlay',
  apiLimitMiddleware(),
  addLimitStatusToResponse,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      const { period = '1M' } = req.query;

      if (!validateSymbol(symbol)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid symbol format')
        );
      }

      const overlayData = await getTechnicalOverlay(symbol, period as string);
      
      res.json(createSecureApiResponse(true, {
        symbol,
        period,
        data: overlayData
      }));

    } catch (error: any) {
      console.error('Technical overlay error:', error);
      res.status(500).json(
        createSecureApiResponse(false, undefined, 'Failed to get technical overlay data')
      );
    }
  }
);

/**
 * 価格履歴データを取得
 */
async function getPriceHistory(symbol: string, period: string, interval: string): Promise<ChartDataPoint[]> {
  // 期間に応じた日数計算
  const periodDays = getPeriodDays(period);
  
  // SQLiteから履歴データを取得
  const query = `
    SELECT date, open_price, high_price, low_price, close_price, volume
    FROM stock_prices 
    WHERE symbol = ? 
    ORDER BY date DESC 
    LIMIT ?
  `;
  
  try {
    const result = await sqliteDb.query(query, [symbol, periodDays]);
    
    if (result.rows && result.rows.length > 0) {
      return result.rows.reverse().map((row: any) => ({
        date: row.date,
        open: parseFloat(row.open_price) || 0,
        high: parseFloat(row.high_price) || 0,
        low: parseFloat(row.low_price) || 0,
        close: parseFloat(row.close_price) || 0,
        volume: parseInt(row.volume) || 0
      }));
    }
  } catch (error) {
    console.error('Database query error:', error);
  }

  // フォールバック: 模擬データ生成
  return generateMockPriceHistory(symbol, periodDays);
}

/**
 * テクニカル指標オーバーレイデータを取得
 */
async function getTechnicalOverlay(symbol: string, period: string): Promise<TechnicalOverlay[]> {
  const priceData = await getPriceHistory(symbol, period, '1d');
  
  if (priceData.length === 0) {
    return [];
  }

  return priceData.map((point, index) => {
    const prices = priceData.slice(Math.max(0, index - 49), index + 1).map(p => p.close);
    
    return {
      date: point.date,
      sma20: index >= 19 ? calculateSMA(prices.slice(-20)) : undefined,
      sma50: index >= 49 ? calculateSMA(prices.slice(-50)) : undefined,
      ema12: index >= 11 ? calculateEMA(prices.slice(-12), 12) : undefined,
      ema26: index >= 25 ? calculateEMA(prices.slice(-26), 26) : undefined,
      bollingerUpper: index >= 19 ? calculateBollingerBands(prices.slice(-20)).upper : undefined,
      bollingerLower: index >= 19 ? calculateBollingerBands(prices.slice(-20)).lower : undefined,
      rsi: index >= 13 ? calculateRSI(prices.slice(-14)) : undefined
    };
  });
}

/**
 * 期間文字列を日数に変換
 */
function getPeriodDays(period: string): number {
  switch (period) {
    case '1D': return 1;
    case '1W': return 7;
    case '1M': return 30;
    case '3M': return 90;
    case '6M': return 180;
    case '1Y': return 365;
    case '2Y': return 730;
    case '5Y': return 1825;
    default: return 30;
  }
}

/**
 * 模擬価格履歴データ生成
 */
function generateMockPriceHistory(symbol: string, days: number): ChartDataPoint[] {
  const data: ChartDataPoint[] = [];
  const seed = symbol.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  let basePrice = seed % 1000 + 500; // 500-1500の範囲
  
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  for (let i = 0; i < days; i++) {
    const date = new Date(startDate);
    date.setDate(date.getDate() + i);
    
    // 価格変動をシミュレート
    const volatility = 0.03; // 3%のボラティリティ
    const random = Math.sin(seed + i) * 0.5 + 0.5; // 0-1の範囲
    const change = (random - 0.5) * volatility;
    
    basePrice *= (1 + change);
    
    const open = basePrice;
    const high = open * (1 + Math.abs(change) * 0.5);
    const low = open * (1 - Math.abs(change) * 0.5);
    const close = open + (high - low) * (random - 0.5);
    const volume = Math.floor((random * 50000000) + 5000000);

    data.push({
      date: date.toISOString().split('T')[0],
      open: Math.round(open * 100) / 100,
      high: Math.round(high * 100) / 100,
      low: Math.round(low * 100) / 100,
      close: Math.round(close * 100) / 100,
      volume
    });
  }

  return data;
}

// テクニカル指標計算ヘルパー関数
function calculateSMA(prices: number[]): number {
  return prices.reduce((sum, price) => sum + price, 0) / prices.length;
}

function calculateEMA(prices: number[], period: number): number {
  const multiplier = 2 / (period + 1);
  let ema = prices[0];
  
  for (let i = 1; i < prices.length; i++) {
    ema = (prices[i] * multiplier) + (ema * (1 - multiplier));
  }
  
  return ema;
}

function calculateBollingerBands(prices: number[]): { upper: number; lower: number } {
  const sma = calculateSMA(prices);
  const variance = prices.reduce((sum, price) => sum + Math.pow(price - sma, 2), 0) / prices.length;
  const stdDev = Math.sqrt(variance);
  
  return {
    upper: sma + (stdDev * 2),
    lower: sma - (stdDev * 2)
  };
}

function calculateRSI(prices: number[]): number {
  if (prices.length < 2) return 50;
  
  let gains = 0;
  let losses = 0;
  
  for (let i = 1; i < prices.length; i++) {
    const change = prices[i] - prices[i - 1];
    if (change > 0) {
      gains += change;
    } else {
      losses += Math.abs(change);
    }
  }
  
  const avgGain = gains / (prices.length - 1);
  const avgLoss = losses / (prices.length - 1);
  
  if (avgLoss === 0) return 100;
  
  const rs = avgGain / avgLoss;
  return 100 - (100 / (1 + rs));
}

export default router;