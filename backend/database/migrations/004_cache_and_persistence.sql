-- リアルタイム価格データ永続化テーブル
CREATE TABLE IF NOT EXISTS real_time_prices (
    id TEXT PRIMARY KEY,
    symbol TEXT NOT NULL,
    price REAL NOT NULL,
    change_amount REAL NOT NULL,
    change_percent REAL NOT NULL,
    volume INTEGER NOT NULL,
    market_cap REAL,
    pe_ratio REAL,
    eps REAL,
    dividend_yield REAL,
    week_52_high REAL,
    week_52_low REAL,
    timestamp TEXT NOT NULL,
    source TEXT NOT NULL CHECK (source IN ('live', 'mock')),
    created_at TEXT NOT NULL
);

-- キャッシュエントリテーブル
CREATE TABLE IF NOT EXISTS cache_entries (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at TEXT NOT NULL,
    created_at TEXT NOT NULL,
    access_count INTEGER DEFAULT 0,
    last_accessed TEXT NOT NULL,
    category TEXT,
    tags TEXT DEFAULT '[]',
    size_bytes INTEGER DEFAULT 0
);

-- パフォーマンスメトリクステーブル
CREATE TABLE IF NOT EXISTS performance_metrics (
    id TEXT PRIMARY KEY,
    metric_name TEXT NOT NULL,
    metric_value REAL NOT NULL,
    metric_type TEXT NOT NULL CHECK (metric_type IN ('counter', 'gauge', 'histogram')),
    labels TEXT DEFAULT '{}',
    timestamp TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- データベース統計テーブル
CREATE TABLE IF NOT EXISTS database_stats (
    id TEXT PRIMARY KEY,
    table_name TEXT NOT NULL,
    record_count INTEGER NOT NULL,
    size_bytes INTEGER,
    last_optimized TEXT,
    timestamp TEXT NOT NULL
);

-- インデックス作成（リアルタイム価格）
CREATE INDEX IF NOT EXISTS idx_real_time_prices_symbol ON real_time_prices(symbol);
CREATE INDEX IF NOT EXISTS idx_real_time_prices_timestamp ON real_time_prices(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_real_time_prices_symbol_timestamp ON real_time_prices(symbol, timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_real_time_prices_source ON real_time_prices(source);
CREATE INDEX IF NOT EXISTS idx_real_time_prices_created_at ON real_time_prices(created_at);

-- インデックス作成（キャッシュ）
CREATE INDEX IF NOT EXISTS idx_cache_entries_expires_at ON cache_entries(expires_at);
CREATE INDEX IF NOT EXISTS idx_cache_entries_category ON cache_entries(category);
CREATE INDEX IF NOT EXISTS idx_cache_entries_access_count ON cache_entries(access_count DESC);
CREATE INDEX IF NOT EXISTS idx_cache_entries_last_accessed ON cache_entries(last_accessed DESC);

-- インデックス作成（パフォーマンスメトリクス）
CREATE INDEX IF NOT EXISTS idx_performance_metrics_name ON performance_metrics(metric_name);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_timestamp ON performance_metrics(timestamp DESC);
CREATE INDEX IF NOT EXISTS idx_performance_metrics_type ON performance_metrics(metric_type);

-- インデックス作成（データベース統計）
CREATE INDEX IF NOT EXISTS idx_database_stats_table ON database_stats(table_name);
CREATE INDEX IF NOT EXISTS idx_database_stats_timestamp ON database_stats(timestamp DESC);

-- サンプルデータ（開発用）
INSERT OR IGNORE INTO real_time_prices (
    id, symbol, price, change_amount, change_percent, volume, 
    timestamp, source, created_at
) VALUES 
(
    'sample_price_1', 
    '7203', 
    2850.0, 
    15.0, 
    0.53, 
    12000000, 
    datetime('now'), 
    'mock', 
    datetime('now')
),
(
    'sample_price_2', 
    '9984', 
    5890.0, 
    45.0, 
    0.77, 
    15000000, 
    datetime('now'), 
    'mock', 
    datetime('now')
);

-- キャッシュサンプルデータ
INSERT OR IGNORE INTO cache_entries (
    key, value, expires_at, created_at, access_count, last_accessed, category
) VALUES 
(
    'sample_cache_1',
    '{"data": "sample cached data"}',
    datetime('now', '+1 hour'),
    datetime('now'),
    0,
    datetime('now'),
    'api_response'
);

-- パフォーマンスメトリクスサンプル
INSERT OR IGNORE INTO performance_metrics (
    id, metric_name, metric_value, metric_type, labels, timestamp, created_at
) VALUES 
(
    'metric_1',
    'api_response_time',
    150.5,
    'gauge',
    '{"endpoint": "/api/companies", "method": "GET"}',
    datetime('now'),
    datetime('now')
),
(
    'metric_2',
    'cache_hit_rate',
    85.2,
    'gauge',
    '{"service": "cache_service"}',
    datetime('now'),
    datetime('now')
);