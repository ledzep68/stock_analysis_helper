import { performanceMonitoringService } from '../performanceMonitoringService';
import { cacheService } from '../cacheService';
import { db } from '../../config/database';

// テスト用のモック設定
jest.mock('../../config/database');
jest.mock('../cacheService');

const mockDb = db as jest.Mocked<typeof db>;
const mockCacheService = cacheService as jest.Mocked<typeof cacheService>;

describe('PerformanceMonitoringService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  describe('incrementCounter', () => {
    it('should increment counter metric', () => {
      performanceMonitoringService.incrementCounter('test_counter', { label: 'test' }, 5);
      performanceMonitoringService.incrementCounter('test_counter', { label: 'test' }, 3);

      // メトリクスが内部で正しく管理されることを確認
      const metrics = (performanceMonitoringService as any).metrics;
      const key = 'test_counter{label=test}';
      expect(metrics.get(key).metricValue).toBe(8);
    });

    it('should create new counter if not exists', () => {
      performanceMonitoringService.incrementCounter('new_counter', {}, 1);

      const metrics = (performanceMonitoringService as any).metrics;
      const key = 'new_counter{}';
      expect(metrics.get(key)).toBeDefined();
      expect(metrics.get(key).metricType).toBe('counter');
    });
  });

  describe('setGauge', () => {
    it('should set gauge metric value', () => {
      performanceMonitoringService.setGauge('test_gauge', 42.5, { environment: 'test' });

      const metrics = (performanceMonitoringService as any).metrics;
      const key = 'test_gauge{environment=test}';
      expect(metrics.get(key).metricValue).toBe(42.5);
      expect(metrics.get(key).metricType).toBe('gauge');
    });

    it('should overwrite existing gauge value', () => {
      performanceMonitoringService.setGauge('test_gauge', 10);
      performanceMonitoringService.setGauge('test_gauge', 20);

      const metrics = (performanceMonitoringService as any).metrics;
      const key = 'test_gauge{}';
      expect(metrics.get(key).metricValue).toBe(20);
    });
  });

  describe('recordHistogram', () => {
    it('should record histogram value', () => {
      performanceMonitoringService.recordHistogram('response_time', 150.5, { endpoint: '/api/test' });

      const metrics = (performanceMonitoringService as any).metrics;
      const key = 'response_time{endpoint=/api/test}';
      expect(metrics.get(key).metricValue).toBe(150.5);
      expect(metrics.get(key).metricType).toBe('histogram');
    });
  });

  describe('recordApiResponseTime', () => {
    it('should record API response time', () => {
      performanceMonitoringService.recordApiResponseTime('/api/test', 'GET', 200);

      const responseTimes = (performanceMonitoringService as any).responseTimes;
      expect(responseTimes.get('GET:/api/test')).toContain(200);
    });

    it('should limit response time history to 100 entries', () => {
      // 101回記録
      for (let i = 0; i < 101; i++) {
        performanceMonitoringService.recordApiResponseTime('/api/test', 'GET', i);
      }

      const responseTimes = (performanceMonitoringService as any).responseTimes;
      expect(responseTimes.get('GET:/api/test')).toHaveLength(100);
      expect(responseTimes.get('GET:/api/test')[0]).toBe(1); // 最初の0は削除される
    });
  });

  describe('recordApiRequest', () => {
    it('should record API request count', () => {
      performanceMonitoringService.recordApiRequest('/api/test', 'POST');
      performanceMonitoringService.recordApiRequest('/api/test', 'POST');

      const requestCounts = (performanceMonitoringService as any).requestCounts;
      expect(requestCounts.get('POST:/api/test')).toBe(2);
    });
  });

  describe('recordError', () => {
    it('should record error metrics', () => {
      performanceMonitoringService.recordError('api_error', '404', { endpoint: '/api/missing' });

      const metrics = (performanceMonitoringService as any).metrics;
      let errorFound = false;
      for (const [key, metric] of metrics.entries()) {
        if (metric.metricName === 'errors_total') {
          errorFound = true;
          break;
        }
      }
      expect(errorFound).toBe(true);
    });
  });

  describe('getSystemStats', () => {
    it('should return system statistics', async () => {
      // モックの設定
      mockCacheService.getStats.mockResolvedValue({
        totalEntries: 100,
        hitRate: 0.85,
        memoryUsage: 50,
        categories: {},
        mostAccessed: []
      });

      mockDb.get.mockResolvedValue(null);

      const stats = await performanceMonitoringService.getSystemStats();

      expect(stats).toHaveProperty('timestamp');
      expect(stats).toHaveProperty('cpu');
      expect(stats).toHaveProperty('memory');
      expect(stats).toHaveProperty('database');
      expect(stats).toHaveProperty('api');
      expect(stats.database.cacheHitRate).toBe(0.85);
    });

    it('should handle cache service errors gracefully', async () => {
      mockCacheService.getStats.mockRejectedValue(new Error('Cache error'));
      mockDb.get.mockResolvedValue(null);

      await expect(performanceMonitoringService.getSystemStats()).rejects.toThrow();
    });
  });

  describe('getMetricsHistory', () => {
    it('should retrieve metrics history from database', async () => {
      const mockMetrics = [
        {
          id: 'metric-1',
          metric_name: 'api_response_time',
          metric_value: 150,
          metric_type: 'histogram',
          labels: '{"endpoint":"/api/test"}',
          timestamp: '2023-01-01T00:00:00.000Z',
          created_at: '2023-01-01T00:00:00.000Z'
        }
      ];

      mockDb.all.mockResolvedValue(mockMetrics);

      const result = await performanceMonitoringService.getMetricsHistory('api_response_time');

      expect(result).toHaveLength(1);
      expect(result[0]).toHaveProperty('metricName', 'api_response_time');
      expect(result[0]).toHaveProperty('metricValue', 150);
      expect(result[0].labels).toEqual({ endpoint: '/api/test' });
    });

    it('should filter metrics by labels', async () => {
      mockDb.all.mockResolvedValue([]);

      await performanceMonitoringService.getMetricsHistory(
        'api_response_time',
        3600000,
        { endpoint: '/api/test' }
      );

      expect(mockDb.all).toHaveBeenCalledWith(
        expect.stringContaining('AND labels LIKE ?'),
        expect.arrayContaining(['%"endpoint":"/api/test"%'])
      );
    });
  });

  describe('checkAlerts', () => {
    it('should return no alerts for healthy system', async () => {
      // 健全なシステムのメモリ使用率をモック
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 500000000,
        heapTotal: 1000000000,
        external: 0,
        arrayBuffers: 0,
        rss: 750000000
      })) as any;

      mockCacheService.getStats.mockResolvedValue({
        totalEntries: 100,
        hitRate: 0.85,
        memoryUsage: 50,
        categories: {},
        mostAccessed: []
      });

      mockDb.get.mockResolvedValue(null);

      const alerts = await performanceMonitoringService.checkAlerts();

      expect(alerts).toHaveLength(0);
      
      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect high memory usage alert', async () => {
      // メモリ使用率を高く設定するため、process.memoryUsageをモック
      const originalMemoryUsage = process.memoryUsage;
      process.memoryUsage = jest.fn(() => ({
        heapUsed: 950000000,
        heapTotal: 1000000000,
        external: 0,
        arrayBuffers: 0,
        rss: 1500000000
      })) as any;

      mockCacheService.getStats.mockResolvedValue({
        totalEntries: 100,
        hitRate: 0.85,
        memoryUsage: 50,
        categories: {},
        mostAccessed: []
      });

      mockDb.get.mockResolvedValue(null);

      const alerts = await performanceMonitoringService.checkAlerts();

      expect(alerts.length).toBeGreaterThan(0);
      expect(alerts.some(alert => alert.type === 'HIGH_MEMORY_USAGE')).toBe(true);

      process.memoryUsage = originalMemoryUsage;
    });

    it('should detect low cache hit rate alert', async () => {
      mockCacheService.getStats.mockResolvedValue({
        totalEntries: 100,
        hitRate: 0.6, // 70%未満
        memoryUsage: 50,
        categories: {},
        mostAccessed: []
      });

      mockDb.get.mockResolvedValue(null);

      const alerts = await performanceMonitoringService.checkAlerts();

      expect(alerts.some(alert => alert.type === 'LOW_CACHE_HIT_RATE')).toBe(true);
    });
  });

  describe('createMiddleware', () => {
    it('should create Express middleware', () => {
      const middleware = performanceMonitoringService.createMiddleware();

      expect(typeof middleware).toBe('function');
      expect(middleware.length).toBe(3); // req, res, next
    });

    it('should record request metrics in middleware', () => {
      const middleware = performanceMonitoringService.createMiddleware();
      const mockReq = {
        method: 'GET',
        path: '/api/test',
        route: { path: '/api/test' }
      };
      const mockRes = {
        send: jest.fn(),
        statusCode: 200
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);

      expect(mockNext).toHaveBeenCalled();

      // レスポンス送信をシミュレート
      mockRes.send('test response');

      const requestCounts = (performanceMonitoringService as any).requestCounts;
      expect(requestCounts.get('GET:/api/test')).toBe(1);
    });

    it('should record error metrics for 4xx/5xx responses', () => {
      const middleware = performanceMonitoringService.createMiddleware();
      const mockReq = {
        method: 'GET',
        path: '/api/error',
        route: { path: '/api/error' }
      };
      const mockRes = {
        send: jest.fn(),
        statusCode: 500
      };
      const mockNext = jest.fn();

      middleware(mockReq, mockRes, mockNext);
      mockRes.send('error response');

      const metrics = (performanceMonitoringService as any).metrics;
      const errorMetrics = Array.from(metrics.values()).filter((m: any) => 
        m.metricName === 'errors_total'
      );
      expect(errorMetrics.length).toBeGreaterThan(0);
    });
  });

  describe('metrics flushing', () => {
    it('should flush metrics to database periodically', async () => {
      mockDb.run.mockResolvedValue({ changes: 1, lastID: null });

      // メトリクス追加
      performanceMonitoringService.setGauge('test_flush', 100);

      // フラッシュ実行
      await (performanceMonitoringService as any).flushMetrics();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO performance_metrics'),
        expect.any(Array)
      );
    });

    it('should handle flush errors gracefully', async () => {
      mockDb.run.mockRejectedValue(new Error('Database error'));

      performanceMonitoringService.setGauge('test_flush_error', 100);

      await expect((performanceMonitoringService as any).flushMetrics()).resolves.not.toThrow();
    });
  });

  describe('service lifecycle', () => {
    it('should start and stop monitoring intervals', () => {
      const originalSetInterval = global.setInterval;
      const originalClearInterval = global.clearInterval;
      const mockSetInterval = jest.fn();
      const mockClearInterval = jest.fn();

      global.setInterval = mockSetInterval;
      global.clearInterval = mockClearInterval;

      performanceMonitoringService.destroy();
      expect(mockClearInterval).toHaveBeenCalled();

      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    });
  });
});