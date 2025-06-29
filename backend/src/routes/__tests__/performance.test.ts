import request from 'supertest';
import express from 'express';
import performanceRouter from '../performance';
import { performanceMonitoringService } from '../../services/performanceMonitoringService';
import { cacheService } from '../../services/cacheService';
import { dataPersistenceService } from '../../services/dataPersistenceService';
import { authenticateToken } from '../../middleware/auth';

// テスト用のモック設定
jest.mock('../../services/performanceMonitoringService');
jest.mock('../../services/cacheService');
jest.mock('../../services/dataPersistenceService');
jest.mock('../../middleware/auth');

const mockPerformanceService = performanceMonitoringService as jest.Mocked<typeof performanceMonitoringService>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;
const mockDataPersistenceService = dataPersistenceService as jest.Mocked<typeof dataPersistenceService>;
const mockAuthenticateToken = authenticateToken as jest.MockedFunction<typeof authenticateToken>;

describe('Performance Routes', () => {
  let app: express.Application;

  beforeEach(() => {
    app = express();
    app.use(express.json());
    
    // 認証ミドルウェアをバイパス
    mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: 'test-user', email: 'test@example.com' };
      next();
    });
    
    app.use('/api/performance', performanceRouter);
    
    jest.clearAllMocks();
  });

  describe('GET /api/performance/stats', () => {
    it('should return system statistics', async () => {
      const mockStats = {
        timestamp: new Date(),
        cpu: { usage: 25.5, loadAverage: [1.0, 1.2, 1.1] },
        memory: { used: 500000000, total: 1000000000, percentage: 50 },
        database: { connections: 1, queryTime: 5, cacheHitRate: 0.85 },
        api: { requestsPerSecond: 10, averageResponseTime: 150, errorRate: 0.5 }
      };

      mockPerformanceService.getSystemStats.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/performance/stats')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
    });

    it('should handle service errors', async () => {
      mockPerformanceService.getSystemStats.mockRejectedValue(new Error('Service error'));

      const response = await request(app)
        .get('/api/performance/stats')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get performance stats');
    });
  });

  describe('GET /api/performance/metrics/:metricName', () => {
    it('should return metrics history', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          metricName: 'api_response_time',
          metricValue: 150,
          metricType: 'histogram' as const,
          labels: { endpoint: '/api/test' },
          timestamp: new Date(),
          createdAt: new Date()
        }
      ];

      mockPerformanceService.getMetricsHistory.mockResolvedValue(mockMetrics);

      const response = await request(app)
        .get('/api/performance/metrics/api_response_time')
        .query({ timeRange: '7200000', endpoint: '/api/test' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.metrics).toEqual(mockMetrics);
      expect(response.body.data.metricName).toBe('api_response_time');
      expect(response.body.data.timeRange).toBe(7200000);
    });

    it('should use default time range if not provided', async () => {
      mockPerformanceService.getMetricsHistory.mockResolvedValue([]);

      await request(app)
        .get('/api/performance/metrics/test_metric')
        .expect(200);

      expect(mockPerformanceService.getMetricsHistory).toHaveBeenCalledWith(
        'test_metric',
        3600000,
        {}
      );
    });

    it('should handle service errors', async () => {
      mockPerformanceService.getMetricsHistory.mockRejectedValue(new Error('Metrics error'));

      const response = await request(app)
        .get('/api/performance/metrics/test_metric')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get metrics history');
    });
  });

  describe('GET /api/performance/alerts', () => {
    it('should return performance alerts', async () => {
      const mockAlerts = [
        {
          type: 'HIGH_MEMORY_USAGE',
          severity: 'critical',
          message: 'Memory usage is 95.0%',
          value: 95.0,
          threshold: 90
        }
      ];

      mockPerformanceService.checkAlerts.mockResolvedValue(mockAlerts);

      const response = await request(app)
        .get('/api/performance/alerts')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.alerts).toEqual(mockAlerts);
      expect(response.body.data.total).toBe(1);
      expect(response.body.data.hasAlerts).toBe(true);
    });

    it('should handle no alerts', async () => {
      mockPerformanceService.checkAlerts.mockResolvedValue([]);

      const response = await request(app)
        .get('/api/performance/alerts')
        .expect(200);

      expect(response.body.data.alerts).toEqual([]);
      expect(response.body.data.total).toBe(0);
      expect(response.body.data.hasAlerts).toBe(false);
    });
  });

  describe('GET /api/performance/cache', () => {
    it('should return cache statistics', async () => {
      const mockCacheStats = {
        totalEntries: 100,
        hitRate: 0.85,
        memoryUsage: 50,
        categories: { api_response: 60, user_data: 40 },
        mostAccessed: []
      };

      mockCacheService.getStats.mockResolvedValue(mockCacheStats);

      const response = await request(app)
        .get('/api/performance/cache')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.cacheStats).toEqual(mockCacheStats);
    });
  });

  describe('DELETE /api/performance/cache', () => {
    it('should clear cache by category', async () => {
      mockCacheService.clearCategory.mockResolvedValue();

      const response = await request(app)
        .delete('/api/performance/cache')
        .query({ category: 'api_response' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('category: api_response');
      expect(mockCacheService.clearCategory).toHaveBeenCalledWith('api_response');
    });

    it('should clear cache by tag', async () => {
      mockCacheService.clearByTag.mockResolvedValue();

      const response = await request(app)
        .delete('/api/performance/cache')
        .query({ tag: 'user_data' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toContain('tag: user_data');
      expect(mockCacheService.clearByTag).toHaveBeenCalledWith('user_data');
    });

    it('should return error if neither category nor tag provided', async () => {
      const response = await request(app)
        .delete('/api/performance/cache')
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Category or tag parameter required');
    });
  });

  describe('GET /api/performance/data-integrity', () => {
    it('should return data integrity report', async () => {
      const mockIntegrityReport = {
        status: 'HEALTHY',
        totalRecords: 1000,
        issues: [],
        lastChecked: new Date().toISOString()
      };

      mockDataPersistenceService.checkDataIntegrity.mockResolvedValue(mockIntegrityReport);

      const response = await request(app)
        .get('/api/performance/data-integrity')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.integrityReport).toEqual(mockIntegrityReport);
    });
  });

  describe('POST /api/performance/optimize', () => {
    it('should optimize database', async () => {
      mockDataPersistenceService.optimizeDatabase.mockResolvedValue();

      const response = await request(app)
        .post('/api/performance/optimize')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Database optimization completed successfully');
    });

    it('should handle optimization errors', async () => {
      mockDataPersistenceService.optimizeDatabase.mockRejectedValue(new Error('Optimization failed'));

      const response = await request(app)
        .post('/api/performance/optimize')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to optimize database');
    });
  });

  describe('GET /api/performance/export/:symbol', () => {
    it('should export data in JSON format', async () => {
      const mockExportData = '{"symbol":"7203","data":[]}';
      mockDataPersistenceService.exportData.mockResolvedValue(mockExportData);

      const response = await request(app)
        .get('/api/performance/export/7203')
        .query({ format: 'json' })
        .expect(200);

      expect(response.headers['content-type']).toBe('application/json; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="7203_data.json"');
      expect(response.text).toBe(mockExportData);
    });

    it('should export data in CSV format', async () => {
      const mockExportData = 'symbol,price,volume\n7203,2850,12000000';
      mockDataPersistenceService.exportData.mockResolvedValue(mockExportData);

      const response = await request(app)
        .get('/api/performance/export/7203')
        .query({ format: 'csv' })
        .expect(200);

      expect(response.headers['content-type']).toBe('text/csv; charset=utf-8');
      expect(response.headers['content-disposition']).toBe('attachment; filename="7203_data.csv"');
      expect(response.text).toBe(mockExportData);
    });

    it('should return error for invalid format', async () => {
      const response = await request(app)
        .get('/api/performance/export/7203')
        .query({ format: 'xml' })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid format. Use json or csv');
    });
  });

  describe('GET /api/performance/price-stats/:symbol', () => {
    it('should return price statistics', async () => {
      const mockStats = {
        symbol: '7203',
        days: 30,
        minPrice: 2800,
        maxPrice: 2900,
        averagePrice: 2850,
        totalRecords: 100,
        priceRange: 100,
        volatility: 0.035,
        latestTimestamp: new Date().toISOString()
      };

      mockDataPersistenceService.getPriceStatistics.mockResolvedValue(mockStats);

      const response = await request(app)
        .get('/api/performance/price-stats/7203')
        .query({ days: '30' })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stats).toEqual(mockStats);
      expect(mockDataPersistenceService.getPriceStatistics).toHaveBeenCalledWith('7203', 30);
    });

    it('should use default days if not provided', async () => {
      mockDataPersistenceService.getPriceStatistics.mockResolvedValue({
        symbol: '7203',
        days: 30,
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        totalRecords: 0,
        priceRange: 0,
        volatility: 0,
        latestTimestamp: null
      });

      await request(app)
        .get('/api/performance/price-stats/7203')
        .expect(200);

      expect(mockDataPersistenceService.getPriceStatistics).toHaveBeenCalledWith('7203', 30);
    });
  });

  describe('GET /api/performance/health', () => {
    it('should return comprehensive health status', async () => {
      const mockSystemStats = {
        timestamp: new Date(),
        cpu: { usage: 25.5, loadAverage: [1.0, 1.2, 1.1] },
        memory: { used: 500000000, total: 1000000000, percentage: 50 },
        database: { connections: 1, queryTime: 5, cacheHitRate: 0.85 },
        api: { requestsPerSecond: 10, averageResponseTime: 150, errorRate: 0.5 }
      };

      const mockCacheStats = {
        totalEntries: 100,
        hitRate: 0.85,
        memoryUsage: 50,
        categories: {},
        mostAccessed: []
      };

      const mockAlerts: any[] = [];

      const mockIntegrityReport = {
        status: 'HEALTHY',
        totalRecords: 1000,
        issues: [],
        lastChecked: new Date().toISOString()
      };

      mockPerformanceService.getSystemStats.mockResolvedValue(mockSystemStats);
      mockCacheService.getStats.mockResolvedValue(mockCacheStats);
      mockPerformanceService.checkAlerts.mockResolvedValue(mockAlerts);
      mockDataPersistenceService.checkDataIntegrity.mockResolvedValue(mockIntegrityReport);

      const response = await request(app)
        .get('/api/performance/health')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.health.status).toBe('healthy');
      expect(response.body.data.health.system).toEqual(mockSystemStats);
      expect(response.body.data.health.cache).toEqual(mockCacheStats);
      expect(response.body.data.health.alerts.count).toBe(0);
      expect(response.body.data.health.database.integrity).toBe('HEALTHY');
    });

    it('should return warning status when alerts exist', async () => {
      const mockAlerts = [
        {
          type: 'HIGH_MEMORY_USAGE',
          severity: 'critical',
          message: 'Memory usage is 95.0%'
        }
      ];

      mockPerformanceService.getSystemStats.mockResolvedValue({} as any);
      mockCacheService.getStats.mockResolvedValue({} as any);
      mockPerformanceService.checkAlerts.mockResolvedValue(mockAlerts);
      mockDataPersistenceService.checkDataIntegrity.mockResolvedValue({
        status: 'HEALTHY',
        totalRecords: 1000,
        issues: [],
        lastChecked: new Date().toISOString()
      });

      const response = await request(app)
        .get('/api/performance/health')
        .expect(200);

      expect(response.body.data.health.status).toBe('warning');
      expect(response.body.data.health.alerts.count).toBe(1);
    });

    it('should handle health check errors', async () => {
      mockPerformanceService.getSystemStats.mockRejectedValue(new Error('Health check failed'));

      const response = await request(app)
        .get('/api/performance/health')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Health check failed');
    });
  });

  describe('Authentication', () => {
    it('should require authentication for all routes', async () => {
      mockAuthenticateToken.mockImplementation((req: any, res: any, next: any) => {
        res.status(401).json({ success: false, error: 'Unauthorized' });
      });

      const response = await request(app)
        .get('/api/performance/stats')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Unauthorized');
    });
  });
});