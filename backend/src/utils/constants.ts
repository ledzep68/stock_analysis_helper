// アプリケーション全体の共通定数
export const APP_CONSTANTS = {
  // データ保持期間
  DATA_RETENTION_DAYS: 90,
  
  // キャッシュ設定
  CACHE: {
    DEFAULT_TTL: 300000, // 5分
    MAX_MEMORY_ENTRIES: 1000,
    CLEANUP_INTERVAL: 300000, // 5分
  },
  
  // パフォーマンス監視
  MONITORING: {
    INTERVAL: 30000, // 30秒
    METRICS_FLUSH_INTERVAL: 60000, // 1分
  },
  
  // 閾値設定
  THRESHOLDS: {
    HIGH_MEMORY_USAGE: 90, // %
    SLOW_API_RESPONSE: 2000, // ms
    HIGH_ERROR_RATE: 5, // %
    LOW_CACHE_HIT_RATE: 70, // %
  },
  
  // バッチサイズ
  BATCH_SIZE: {
    PRICE_PERSISTENCE: 100,
    METRIC_FLUSH: 1000,
  }
};