import { Router, Request, Response } from 'express';
import { portfolioService } from '../services/portfolioService';
import { portfolioPerformanceService } from '../services/portfolioPerformanceService';
import { portfolioRiskService } from '../services/portfolioRiskService';
import { authenticateToken } from '../middleware/auth';
import { createSecureApiResponse } from '../utils/security';
import { ErrorHandler } from '../utils/error.handler';

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

/**
 * 企業検索（銘柄コードまたは企業名）
 * GET /api/portfolio/search?q=searchterm
 */
router.get('/search', async (req: Request, res: Response) => {
  try {
    const { q } = req.query;

    if (!q || typeof q !== 'string' || q.trim().length < 1) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Search query is required')
      );
    }

    const results = await portfolioService.searchCompanies(q.trim());
    
    res.json(createSecureApiResponse(true, { 
      companies: results,
      total: results.length
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to search companies', error);
  }
});

/**
 * ユーザーのポートフォリオ一覧取得
 * GET /api/portfolio
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const portfolios = await portfolioService.getPortfoliosByUser(userId);
    
    res.json(createSecureApiResponse(true, { 
      portfolios,
      total: portfolios.length
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get portfolios', error);
  }
});

/**
 * ポートフォリオ作成
 * POST /api/portfolio
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json(
        createSecureApiResponse(false, undefined, 'User not authenticated')
      );
    }

    const { name, description, initialCapital, currency } = req.body;

    if (!name || name.trim().length === 0) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Portfolio name is required')
      );
    }

    const portfolio = await portfolioService.createPortfolio(
      userId,
      name.trim(),
      description?.trim(),
      initialCapital || 1000000,
      currency || 'JPY'
    );

    res.status(201).json(createSecureApiResponse(true, { portfolio }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to create portfolio', error);
  }
});

/**
 * ポートフォリオ詳細取得
 * GET /api/portfolio/:portfolioId
 */
router.get('/:portfolioId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
    if (!portfolio) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Portfolio not found')
      );
    }

    res.json(createSecureApiResponse(true, { portfolio }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get portfolio', error);
  }
});

/**
 * ポートフォリオ更新
 * PUT /api/portfolio/:portfolioId
 */
router.put('/:portfolioId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { name, description } = req.body;

    const updates: any = {};
    if (name !== undefined) updates.name = name.trim();
    if (description !== undefined) updates.description = description?.trim();

    const portfolio = await portfolioService.updatePortfolio(portfolioId, userId, updates);
    if (!portfolio) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Portfolio not found')
      );
    }

    res.json(createSecureApiResponse(true, { portfolio }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to update portfolio', error);
  }
});

/**
 * ポートフォリオ削除
 * DELETE /api/portfolio/:portfolioId
 */
router.delete('/:portfolioId', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    const success = await portfolioService.deletePortfolio(portfolioId, userId);
    if (!success) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Portfolio not found')
      );
    }

    res.json(createSecureApiResponse(true, { 
      message: 'Portfolio deleted successfully' 
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to delete portfolio', error);
  }
});

/**
 * ポートフォリオサマリー取得
 * GET /api/portfolio/:portfolioId/summary
 */
router.get('/:portfolioId/summary', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);
    
    res.json(createSecureApiResponse(true, { summary }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get portfolio summary', error);
  }
});

/**
 * ポートフォリオ保有銘柄取得
 * GET /api/portfolio/:portfolioId/holdings
 */
router.get('/:portfolioId/holdings', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
    
    res.json(createSecureApiResponse(true, { 
      holdings,
      total: holdings.length
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get portfolio holdings', error);
  }
});

/**
 * 取引追加
 * POST /api/portfolio/:portfolioId/transactions
 */
router.post('/:portfolioId/transactions', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { symbol, transactionType, quantity, price, fees, transactionDate, notes } = req.body;

    // バリデーション
    if (!symbol || !transactionType || !quantity || !price) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Required fields: symbol, transactionType, quantity, price')
      );
    }

    if (!['BUY', 'SELL', 'DIVIDEND'].includes(transactionType)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid transaction type')
      );
    }

    if (quantity <= 0 || price <= 0) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Quantity and price must be positive')
      );
    }

    const totalAmount = quantity * price;
    const transaction = await portfolioService.addTransaction(portfolioId, userId, {
      symbol: symbol.toUpperCase(),
      transactionType,
      quantity,
      price,
      totalAmount,
      fees: fees || 0,
      transactionDate: transactionDate ? new Date(transactionDate) : new Date(),
      notes
    });

    res.status(201).json(createSecureApiResponse(true, { transaction }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to add transaction', error);
  }
});

/**
 * パフォーマンス履歴取得
 * GET /api/portfolio/:portfolioId/performance
 */
router.get('/:portfolioId/performance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { days = '30' } = req.query;

    // まずポートフォリオの存在・アクセス権限を確認
    const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
    if (!portfolio) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Portfolio not found or access denied')
      );
    }

    const history = await portfolioPerformanceService.getPerformanceHistory(
      portfolioId, 
      userId, 
      parseInt(days as string)
    );
    
    res.json(createSecureApiResponse(true, { 
      history,
      total: history.length
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to get performance history', error);
  }
});

/**
 * パフォーマンス分析
 * GET /api/portfolio/:portfolioId/analysis
 */
router.get('/:portfolioId/analysis', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { period = '1Y' } = req.query;

    if (!['1M', '3M', '6M', '1Y', 'ALL'].includes(period as string)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid period. Use 1M, 3M, 6M, 1Y, or ALL')
      );
    }

    const analysis = await portfolioPerformanceService.analyzePerformance(
      portfolioId, 
      userId, 
      period as any
    );
    
    res.json(createSecureApiResponse(true, { analysis }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to analyze performance', error);
  }
});

/**
 * ベンチマーク比較
 * GET /api/portfolio/:portfolioId/benchmark
 */
router.get('/:portfolioId/benchmark', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { benchmark = 'TOPIX', days = '252' } = req.query;

    const comparison = await portfolioPerformanceService.compareToBenchmark(
      portfolioId, 
      userId, 
      benchmark as string,
      parseInt(days as string)
    );
    
    res.json(createSecureApiResponse(true, { comparison }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to compare to benchmark', error);
  }
});

/**
 * リスク分析
 * GET /api/portfolio/:portfolioId/risk
 */
router.get('/:portfolioId/risk', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    // まずポートフォリオの存在・アクセス権限を確認
    const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
    if (!portfolio) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Portfolio not found or access denied')
      );
    }

    const riskAnalysis = await portfolioRiskService.analyzePortfolioRisk(portfolioId, userId);
    
    res.json(createSecureApiResponse(true, { riskAnalysis }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to analyze portfolio risk', error);
  }
});

/**
 * ストレステスト
 * POST /api/portfolio/:portfolioId/stress-test
 */
router.post('/:portfolioId/stress-test', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    const stressTestResults = await portfolioRiskService.runStressTest(portfolioId, userId);
    
    res.json(createSecureApiResponse(true, { 
      stressTestResults,
      total: stressTestResults.length
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to run stress test', error);
  }
});

/**
 * VaR計算
 * GET /api/portfolio/:portfolioId/var
 */
router.get('/:portfolioId/var', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { confidence = '0.95', timeHorizon = '1' } = req.query;

    const var95 = await portfolioRiskService.calculateVaR(
      portfolioId, 
      userId, 
      parseFloat(confidence as string),
      parseInt(timeHorizon as string)
    );
    
    res.json(createSecureApiResponse(true, { var95 }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to calculate VaR', error);
  }
});

/**
 * パフォーマンス計算・更新
 * POST /api/portfolio/:portfolioId/calculate-performance
 */
router.post('/:portfolioId/calculate-performance', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;

    const metrics = await portfolioPerformanceService.calculateAndSavePerformance(portfolioId, userId);
    
    res.json(createSecureApiResponse(true, { metrics }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to calculate performance', error);
  }
});

/**
 * ポートフォリオに銘柄を直接追加
 * POST /api/portfolio/:portfolioId/stocks
 */
router.post('/:portfolioId/stocks', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId } = req.params;
    const { symbol, quantity, averageCost, purchaseDate, notes } = req.body;

    // バリデーション
    if (!symbol || !quantity || !averageCost) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Required fields: symbol, quantity, averageCost')
      );
    }

    if (quantity <= 0 || averageCost <= 0) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Quantity and averageCost must be positive')
      );
    }

    const holding = await portfolioService.addStockToPortfolio(portfolioId, userId, {
      symbol: symbol.toUpperCase(),
      quantity,
      averageCost,
      purchaseDate: purchaseDate ? new Date(purchaseDate) : undefined,
      notes
    });

    res.status(201).json(createSecureApiResponse(true, { holding }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to add stock to portfolio', error);
  }
});

/**
 * ポートフォリオから銘柄を削除
 * DELETE /api/portfolio/:portfolioId/stocks/:symbol
 */
router.delete('/:portfolioId/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId, symbol } = req.params;

    const success = await portfolioService.removeStockFromPortfolio(portfolioId, userId, symbol);
    
    if (!success) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Stock not found in portfolio')
      );
    }

    res.json(createSecureApiResponse(true, { 
      message: `Stock ${symbol} removed from portfolio successfully` 
    }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to remove stock from portfolio', error);
  }
});

/**
 * 保有銘柄の更新（数量・価格）
 * PUT /api/portfolio/:portfolioId/stocks/:symbol
 */
router.put('/:portfolioId/stocks/:symbol', async (req: Request, res: Response) => {
  try {
    const userId = (req as any).user?.id;
    const { portfolioId, symbol } = req.params;
    const { quantity, averageCost, notes } = req.body;

    const updates: any = {};
    if (quantity !== undefined) {
      if (quantity <= 0) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Quantity must be positive')
        );
      }
      updates.quantity = quantity;
    }
    if (averageCost !== undefined) {
      if (averageCost <= 0) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Average cost must be positive')
        );
      }
      updates.averageCost = averageCost;
    }
    if (notes !== undefined) updates.notes = notes;

    const holding = await portfolioService.updateStockHolding(portfolioId, userId, symbol, updates);
    
    if (!holding) {
      return res.status(404).json(
        createSecureApiResponse(false, undefined, 'Stock not found in portfolio')
      );
    }

    res.json(createSecureApiResponse(true, { holding }));
  } catch (error) {
    ErrorHandler.sendErrorResponse(res, 500, 'Failed to update stock holding', error);
  }
});

export default router;