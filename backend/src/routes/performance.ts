import { Router, Request, Response } from 'express';
import { performanceMonitoringService } from '../services/performanceMonitoringService';
import { cacheService } from '../services/cacheService';
import { dataPersistenceService } from '../services/dataPersistenceService';
import { authenticateToken } from '../middleware/auth';
import { createSecureApiResponse } from '../utils/security';

const router = Router();

// 全ルートに認証を適用
router.use(authenticateToken);

/**
 * システム統計取得
 * GET /api/performance/stats
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const stats = await performanceMonitoringService.getSystemStats();
    
    res.json(createSecureApiResponse(true, { stats }));
  } catch (error) {
    console.error('Performance stats error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to get performance stats')
    );
  }
});

/**
 * メトリクス履歴取得
 * GET /api/performance/metrics/:metricName
 */
router.get('/metrics/:metricName', async (req: Request, res: Response) => {
  try {
    const { metricName } = req.params;
    const { timeRange = '3600000', ...labels } = req.query;

    const metrics = await performanceMonitoringService.getMetricsHistory(
      metricName,
      parseInt(timeRange as string),
      labels as Record<string, string>
    );

    res.json(createSecureApiResponse(true, { 
      metricName,
      timeRange: parseInt(timeRange as string),
      metrics,
      total: metrics.length
    }));
  } catch (error) {
    console.error('Metrics history error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to get metrics history')
    );
  }
});

/**
 * パフォーマンスアラート取得
 * GET /api/performance/alerts
 */
router.get('/alerts', async (req: Request, res: Response) => {
  try {
    const alerts = await performanceMonitoringService.checkAlerts();
    
    res.json(createSecureApiResponse(true, { 
      alerts,
      total: alerts.length,
      hasAlerts: alerts.length > 0
    }));
  } catch (error) {
    console.error('Performance alerts error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to get performance alerts')
    );
  }
});

/**
 * キャッシュ統計取得
 * GET /api/performance/cache
 */
router.get('/cache', async (req: Request, res: Response) => {
  try {
    const cacheStats = await cacheService.getStats();
    
    res.json(createSecureApiResponse(true, { cacheStats }));
  } catch (error) {
    console.error('Cache stats error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to get cache stats')
    );
  }
});

/**
 * キャッシュクリア
 * DELETE /api/performance/cache
 */
router.delete('/cache', async (req: Request, res: Response) => {
  try {
    const { category, tag } = req.query;

    if (category) {
      await cacheService.clearCategory(category as string);
    } else if (tag) {
      await cacheService.clearByTag(tag as string);
    } else {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Category or tag parameter required')
      );
    }

    res.json(createSecureApiResponse(true, { 
      message: `Cache cleared for ${category ? 'category: ' + category : 'tag: ' + tag}`
    }));
  } catch (error) {
    console.error('Cache clear error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to clear cache')
    );
  }
});

/**
 * データ整合性チェック
 * GET /api/performance/data-integrity
 */
router.get('/data-integrity', async (req: Request, res: Response) => {
  try {
    const integrityReport = await dataPersistenceService.checkDataIntegrity();
    
    res.json(createSecureApiResponse(true, { integrityReport }));
  } catch (error) {
    console.error('Data integrity check error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to check data integrity')
    );
  }
});

/**
 * データベース最適化実行
 * POST /api/performance/optimize
 */
router.post('/optimize', async (req: Request, res: Response) => {
  try {
    await dataPersistenceService.optimizeDatabase();
    
    res.json(createSecureApiResponse(true, { 
      message: 'Database optimization completed successfully'
    }));
  } catch (error) {
    console.error('Database optimization error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to optimize database')
    );
  }
});

/**
 * データエクスポート
 * GET /api/performance/export/:symbol
 */
router.get('/export/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { format = 'json' } = req.query;

    if (!['json', 'csv'].includes(format as string)) {
      return res.status(400).json(
        createSecureApiResponse(false, undefined, 'Invalid format. Use json or csv')
      );
    }

    const exportData = await dataPersistenceService.exportData(
      symbol.toUpperCase(),
      format as 'json' | 'csv'
    );

    if (format === 'csv') {
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename="${symbol}_data.csv"`);
      res.send(exportData);
    } else {
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${symbol}_data.json"`);
      res.send(exportData);
    }
  } catch (error) {
    console.error('Data export error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to export data')
    );
  }
});

/**
 * 価格統計取得
 * GET /api/performance/price-stats/:symbol
 */
router.get('/price-stats/:symbol', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const { days = '30' } = req.query;

    const stats = await dataPersistenceService.getPriceStatistics(
      symbol.toUpperCase(),
      parseInt(days as string)
    );

    res.json(createSecureApiResponse(true, { stats }));
  } catch (error) {
    console.error('Price stats error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Failed to get price statistics')
    );
  }
});

/**
 * ヘルスチェック（詳細版）
 * GET /api/performance/health
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const [systemStats, cacheStats, alerts, integrityReport] = await Promise.all([
      performanceMonitoringService.getSystemStats(),
      cacheService.getStats(),
      performanceMonitoringService.checkAlerts(),
      dataPersistenceService.checkDataIntegrity()
    ]);

    const health = {
      status: alerts.length === 0 && integrityReport.status === 'HEALTHY' ? 'healthy' : 'warning',
      timestamp: new Date().toISOString(),
      system: systemStats,
      cache: cacheStats,
      alerts: {
        count: alerts.length,
        items: alerts
      },
      database: {
        integrity: integrityReport.status,
        details: integrityReport
      },
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };

    res.json(createSecureApiResponse(true, { health }));
  } catch (error) {
    console.error('Health check error:', error);
    res.status(500).json(
      createSecureApiResponse(false, undefined, 'Health check failed')
    );
  }
});

export default router;