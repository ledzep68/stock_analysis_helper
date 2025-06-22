import { Router, Request, Response } from 'express';
import { TechnicalAnalysisService } from '../services/technicalAnalysisService';
import { authenticateToken } from '../middleware/auth';
import { validateInput } from '../utils/security';

const router = Router();

router.use(authenticateToken);

// Main technical analysis route - provides full analysis
router.get('/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }
    
    const analysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Technical analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform technical analysis' 
    });
  }
});

router.get('/:symbol/indicators', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { period = '100' } = req.query;
    
    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }
    
    const periodDays = parseInt(period as string);
    if (isNaN(periodDays) || periodDays < 30 || periodDays > 365) {
      return res.status(400).json({ error: 'Period must be between 30 and 365 days' });
    }
    
    const analysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
    
    res.json({
      success: true,
      data: analysis
    });
  } catch (error) {
    console.error('Technical analysis error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to perform technical analysis' 
    });
  }
});

router.get('/:symbol/signals', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }
    
    const analysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
    
    res.json({
      success: true,
      data: {
        symbol,
        signals: analysis.signals,
        timestamp: analysis.timestamp
      }
    });
  } catch (error) {
    console.error('Technical signals error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate technical signals' 
    });
  }
});

router.get('/:symbol/chart-data', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { days = '90' } = req.query;
    
    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }
    
    const periodDays = parseInt(days as string);
    if (isNaN(periodDays) || periodDays < 7 || periodDays > 365) {
      return res.status(400).json({ error: 'Days must be between 7 and 365' });
    }
    
    const priceData = await TechnicalAnalysisService.getHistoricalPrices(symbol, periodDays);
    const analysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
    
    const chartData = priceData.map((price, index) => {
      const closes = priceData.slice(0, index + 1).map(p => p.close);
      const sma20 = index >= 19 ? TechnicalAnalysisService['calculateSMA'](closes, 20) : null;
      const sma50 = index >= 49 ? TechnicalAnalysisService['calculateSMA'](closes, 50) : null;
      
      return {
        date: price.date,
        open: price.close,
        high: price.high,
        low: price.low,
        close: price.close,
        volume: price.volume,
        sma20,
        sma50
      };
    });
    
    res.json({
      success: true,
      data: {
        symbol,
        chartData,
        currentIndicators: analysis.indicators,
        period: periodDays
      }
    });
  } catch (error) {
    console.error('Chart data error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to retrieve chart data' 
    });
  }
});

router.get('/:symbol/summary', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    
    if (!validateInput.isValidSymbol(symbol)) {
      return res.status(400).json({ error: 'Invalid symbol format' });
    }
    
    const analysis = await TechnicalAnalysisService.performTechnicalAnalysis(symbol);
    
    const summary = {
      symbol,
      trend: analysis.signals.trend,
      strength: analysis.signals.strength,
      keyLevels: {
        resistance: [
          analysis.indicators.bollingerBands.upper,
          analysis.indicators.sma['50'],
          analysis.indicators.sma['200']
        ].filter(v => v > 0).sort((a, b) => a - b),
        support: [
          analysis.indicators.bollingerBands.lower,
          analysis.indicators.sma['20'],
          analysis.indicators.sma['50']
        ].filter(v => v > 0).sort((a, b) => b - a)
      },
      momentum: {
        rsi: analysis.indicators.rsi,
        rsiSignal: analysis.indicators.rsi > 70 ? 'Overbought' : 
                   analysis.indicators.rsi < 30 ? 'Oversold' : 'Neutral',
        macd: analysis.indicators.macd.histogram > 0 ? 'Bullish' : 'Bearish'
      },
      volatility: {
        atr: analysis.indicators.atr,
        bollingerWidth: analysis.indicators.bollingerBands.upper - analysis.indicators.bollingerBands.lower
      },
      volume: {
        trend: analysis.indicators.volume.ratio > 1.2 ? 'High' : 
               analysis.indicators.volume.ratio < 0.8 ? 'Low' : 'Normal',
        ratio: analysis.indicators.volume.ratio
      },
      recommendations: analysis.signals.recommendations,
      timestamp: analysis.timestamp
    };
    
    res.json({
      success: true,
      data: summary
    });
  } catch (error) {
    console.error('Technical summary error:', error);
    res.status(500).json({ 
      success: false,
      error: 'Failed to generate technical summary' 
    });
  }
});

export default router;