import { db } from '../config/database';
import { cacheService } from './cacheService';
import { APP_CONSTANTS } from '../utils/constants';

export interface PerformanceMetric {
  id?: string;
  metricName: string;
  metricValue: number;
  metricType: 'counter' | 'gauge' | 'histogram';
  labels: Record<string, string>;
  timestamp: Date;
  createdAt?: Date;
}

export interface SystemStats {
  timestamp: Date;
  cpu: {
    usage: number;
    loadAverage: number[];
  };
  memory: {
    used: number;
    total: number;
    percentage: number;
  };
  database: {
    connections: number;
    queryTime: number;
    cacheHitRate: number;
  };
  api: {
    requestsPerSecond: number;
    averageResponseTime: number;
    errorRate: number;
  };
}

class PerformanceMonitoringService {
  private metrics: Map<string, PerformanceMetric> = new Map();
  private requestCounts: Map<string, number> = new Map();
  private responseTimes: Map<string, number[]> = new Map();
  private monitoringInterval: NodeJS.Timeout | null = null;
  private flushInterval: NodeJS.Timeout | null = null;

  constructor() {
    this.startMonitoring();
    this.startMetricsFlushing();
  }

  /**
   * カウンターメトリック追加
   */
  incrementCounter(name: string, labels: Record<string, string> = {}, value: number = 1): void {
    const key = this.createMetricKey(name, labels);
    const existing = this.metrics.get(key);

    if (existing && existing.metricType === 'counter') {
      existing.metricValue += value;
      existing.timestamp = new Date();
    } else {
      this.metrics.set(key, {
        metricName: name,
        metricValue: value,
        metricType: 'counter',
        labels,
        timestamp: new Date()
      });
    }
  }

  /**
   * ゲージメトリック設定
   */
  setGauge(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.createMetricKey(name, labels);
    
    this.metrics.set(key, {
      metricName: name,
      metricValue: value,
      metricType: 'gauge',
      labels,
      timestamp: new Date()
    });
  }

  /**
   * ヒストグラムメトリック追加
   */
  recordHistogram(name: string, value: number, labels: Record<string, string> = {}): void {
    const key = this.createMetricKey(name, labels);
    
    this.metrics.set(key, {
      metricName: name,
      metricValue: value,
      metricType: 'histogram',
      labels,
      timestamp: new Date()
    });
  }

  /**
   * API レスポンス時間記録
   */
  recordApiResponseTime(endpoint: string, method: string, responseTime: number): void {
    const key = `${method}:${endpoint}`;
    
    if (!this.responseTimes.has(key)) {
      this.responseTimes.set(key, []);
    }
    
    this.responseTimes.get(key)!.push(responseTime);
    
    // 直近100件に制限
    if (this.responseTimes.get(key)!.length > 100) {
      this.responseTimes.get(key)!.shift();
    }

    this.recordHistogram('api_response_time', responseTime, { endpoint, method });
  }

  /**
   * API リクエスト数記録
   */
  recordApiRequest(endpoint: string, method: string): void {
    const key = `${method}:${endpoint}`;
    const current = this.requestCounts.get(key) || 0;
    this.requestCounts.set(key, current + 1);

    this.incrementCounter('api_requests_total', { endpoint, method });
  }

  /**
   * エラー記録
   */
  recordError(type: string, error: string, labels: Record<string, string> = {}): void {
    this.incrementCounter('errors_total', { type, error, ...labels });
  }

  /**
   * システム統計取得
   */
  async getSystemStats(): Promise<SystemStats> {
    const memoryUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    
    // Cache統計
    const cacheStats = await cacheService.getStats();
    
    // API統計計算
    const apiStats = this.calculateApiStats();
    
    // データベース統計
    const dbStats = await this.getDatabaseStats();

    return {
      timestamp: new Date(),
      cpu: {
        usage: (cpuUsage.user + cpuUsage.system) / 1000000, // microseconds to seconds
        loadAverage: require('os').loadavg()
      },
      memory: {
        used: memoryUsage.heapUsed,
        total: memoryUsage.heapTotal,
        percentage: (memoryUsage.heapUsed / memoryUsage.heapTotal) * 100
      },
      database: {
        connections: 1, // SQLiteは単一接続
        queryTime: dbStats.averageQueryTime,
        cacheHitRate: cacheStats.hitRate
      },
      api: {
        requestsPerSecond: apiStats.requestsPerSecond,
        averageResponseTime: apiStats.averageResponseTime,
        errorRate: apiStats.errorRate
      }
    };
  }

  /**
   * メトリクス履歴取得
   */
  async getMetricsHistory(
    metricName: string, 
    timeRange: number = 3600000, // 1 hour
    labels: Record<string, string> = {}
  ): Promise<PerformanceMetric[]> {
    const cutoffTime = new Date(Date.now() - timeRange);
    
    let query = `
      SELECT * FROM performance_metrics 
      WHERE metric_name = ? AND timestamp >= ?
    `;
    const params = [metricName, cutoffTime.toISOString()];

    // ラベルフィルタリング
    if (Object.keys(labels).length > 0) {
      for (const [key, value] of Object.entries(labels)) {
        query += ` AND labels LIKE ?`;
        params.push(`%"${key}":"${value}"%`);
      }
    }

    query += ` ORDER BY timestamp DESC LIMIT 1000`;

    const rows = await db.all(query, params);

    return rows.map(row => ({
      id: row.id,
      metricName: row.metric_name,
      metricValue: row.metric_value,
      metricType: row.metric_type,
      labels: JSON.parse(row.labels),
      timestamp: new Date(row.timestamp),
      createdAt: new Date(row.created_at)
    }));
  }

  /**
   * アラート閾値チェック
   */
  async checkAlerts(): Promise<any[]> {
    const alerts = [];
    const stats = await this.getSystemStats();

    // メモリ使用率チェック
    if (stats.memory.percentage > APP_CONSTANTS.THRESHOLDS.HIGH_MEMORY_USAGE) {
      alerts.push({
        type: 'HIGH_MEMORY_USAGE',
        severity: 'critical',
        message: `Memory usage is ${stats.memory.percentage.toFixed(1)}%`,
        value: stats.memory.percentage,
        threshold: APP_CONSTANTS.THRESHOLDS.HIGH_MEMORY_USAGE
      });
    }

    // API レスポンス時間チェック
    if (stats.api.averageResponseTime > APP_CONSTANTS.THRESHOLDS.SLOW_API_RESPONSE) {
      alerts.push({
        type: 'SLOW_API_RESPONSE',
        severity: 'warning',
        message: `Average API response time is ${stats.api.averageResponseTime}ms`,
        value: stats.api.averageResponseTime,
        threshold: APP_CONSTANTS.THRESHOLDS.SLOW_API_RESPONSE
      });
    }

    // エラー率チェック
    if (stats.api.errorRate > APP_CONSTANTS.THRESHOLDS.HIGH_ERROR_RATE) {
      alerts.push({
        type: 'HIGH_ERROR_RATE',
        severity: 'critical',
        message: `API error rate is ${stats.api.errorRate.toFixed(1)}%`,
        value: stats.api.errorRate,
        threshold: APP_CONSTANTS.THRESHOLDS.HIGH_ERROR_RATE
      });
    }

    // キャッシュヒット率チェック
    if (stats.database.cacheHitRate < APP_CONSTANTS.THRESHOLDS.LOW_CACHE_HIT_RATE / 100) {
      alerts.push({
        type: 'LOW_CACHE_HIT_RATE',
        severity: 'warning',
        message: `Cache hit rate is ${(stats.database.cacheHitRate * 100).toFixed(1)}%`,
        value: stats.database.cacheHitRate * 100,
        threshold: APP_CONSTANTS.THRESHOLDS.LOW_CACHE_HIT_RATE
      });
    }

    return alerts;
  }

  /**
   * Express ミドルウェア作成
   */
  createMiddleware() {
    return (req: any, res: any, next: any) => {
      const startTime = Date.now();
      const endpoint = req.route?.path || req.path;
      const method = req.method;

      // リクエスト記録
      this.recordApiRequest(endpoint, method);

      // レスポンス時間記録
      const originalSend = res.send;
      res.send = function(data: any) {
        const responseTime = Date.now() - startTime;
        performanceMonitoringService.recordApiResponseTime(endpoint, method, responseTime);
        
        // エラーレスポンス記録
        if (res.statusCode >= 400) {
          performanceMonitoringService.recordError('api_error', `${res.statusCode}`, {
            endpoint,
            method,
            status_code: res.statusCode.toString()
          });
        }

        return originalSend.call(this, data);
      };

      next();
    };
  }

  /**
   * 監視開始
   */
  private startMonitoring(): void {
    this.monitoringInterval = setInterval(async () => {
      try {
        const stats = await this.getSystemStats();
        
        // システムメトリクス記録
        this.setGauge('system_memory_usage', stats.memory.percentage);
        this.setGauge('system_cpu_usage', stats.cpu.usage);
        this.setGauge('api_requests_per_second', stats.api.requestsPerSecond);
        this.setGauge('cache_hit_rate', stats.database.cacheHitRate);

        // アラートチェック
        const alerts = await this.checkAlerts();
        if (alerts.length > 0) {
          console.log('🚨 Performance alerts:', alerts);
        }

      } catch (error) {
        console.error('Performance monitoring error:', error);
      }
    }, APP_CONSTANTS.MONITORING.INTERVAL);
  }

  /**
   * メトリクスフラッシュ開始
   */
  private startMetricsFlushing(): void {
    this.flushInterval = setInterval(async () => {
      await this.flushMetrics();
    }, APP_CONSTANTS.MONITORING.METRICS_FLUSH_INTERVAL);
  }

  /**
   * メトリクスをデータベースにフラッシュ
   */
  private async flushMetrics(): Promise<void> {
    if (this.metrics.size === 0) {
      return;
    }

    const batch = Array.from(this.metrics.values());
    this.metrics.clear();

    try {
      for (const metric of batch) {
        const metricId = `metric_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
        
        await db.run(`
          INSERT INTO performance_metrics (
            id, metric_name, metric_value, metric_type, labels, timestamp, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `, [
          metricId,
          metric.metricName,
          metric.metricValue,
          metric.metricType,
          JSON.stringify(metric.labels),
          metric.timestamp.toISOString(),
          new Date().toISOString()
        ]);
      }

      console.log(`📊 Flushed ${batch.length} metrics to database`);
    } catch (error) {
      console.error('Failed to flush metrics:', error);
    }
  }

  /**
   * メトリックキー作成
   */
  private createMetricKey(name: string, labels: Record<string, string>): string {
    const labelStr = Object.entries(labels)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join(',');
    return `${name}{${labelStr}}`;
  }

  /**
   * API統計計算
   */
  private calculateApiStats(): any {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    let totalRequests = 0;
    let totalResponseTime = 0;
    let totalErrors = 0;
    let responseTimeCount = 0;

    // リクエスト数計算
    for (const count of this.requestCounts.values()) {
      totalRequests += count;
    }

    // レスポンス時間計算
    for (const times of this.responseTimes.values()) {
      for (const time of times) {
        totalResponseTime += time;
        responseTimeCount++;
      }
    }

    // エラー計算
    for (const [key, metric] of this.metrics.entries()) {
      if (metric.metricName === 'errors_total') {
        totalErrors += metric.metricValue;
      }
    }

    return {
      requestsPerSecond: totalRequests / 60, // 過去1分間の平均
      averageResponseTime: responseTimeCount > 0 ? totalResponseTime / responseTimeCount : 0,
      errorRate: totalRequests > 0 ? (totalErrors / totalRequests) * 100 : 0
    };
  }

  /**
   * データベース統計取得
   */
  private async getDatabaseStats(): Promise<any> {
    try {
      // クエリ実行時間測定
      const start = Date.now();
      await db.get('SELECT 1');
      const queryTime = Date.now() - start;

      return {
        averageQueryTime: queryTime
      };
    } catch (error) {
      return {
        averageQueryTime: 0
      };
    }
  }

  /**
   * サービス停止
   */
  destroy(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flushMetrics(); // 最終フラッシュ
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();