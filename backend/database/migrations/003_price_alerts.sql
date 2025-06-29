-- 価格アラートテーブル作成
CREATE TABLE IF NOT EXISTS price_alerts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    alert_type TEXT NOT NULL CHECK (alert_type IN ('PRICE_TARGET', 'PRICE_CHANGE', 'VOLUME_SPIKE')),
    target_value REAL NOT NULL,
    current_value REAL,
    condition TEXT NOT NULL CHECK (condition IN ('ABOVE', 'BELOW', 'CHANGE_PERCENT')),
    is_active INTEGER DEFAULT 1,
    last_triggered TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    metadata TEXT DEFAULT '{}',
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 価格アラート発火履歴テーブル
CREATE TABLE IF NOT EXISTS price_alert_triggers (
    id TEXT PRIMARY KEY,
    alert_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    trigger_price REAL NOT NULL,
    previous_price REAL NOT NULL,
    change_percent REAL NOT NULL,
    timestamp TEXT NOT NULL,
    alert_type TEXT NOT NULL,
    user_id TEXT NOT NULL,
    FOREIGN KEY (alert_id) REFERENCES price_alerts(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_price_alerts_user_id ON price_alerts(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX IF NOT EXISTS idx_price_alerts_active ON price_alerts(is_active);
CREATE INDEX IF NOT EXISTS idx_price_alert_triggers_user_id ON price_alert_triggers(user_id);
CREATE INDEX IF NOT EXISTS idx_price_alert_triggers_timestamp ON price_alert_triggers(timestamp);
CREATE INDEX IF NOT EXISTS idx_price_alert_triggers_alert_id ON price_alert_triggers(alert_id);

-- サンプルデータ（開発用）
INSERT OR IGNORE INTO price_alerts (
    id, user_id, symbol, alert_type, target_value, condition, 
    is_active, created_at, updated_at, metadata
) VALUES 
(
    'alert_sample_1', 
    'user_1', 
    '7203', 
    'PRICE_TARGET', 
    2600.0, 
    'ABOVE', 
    1, 
    datetime('now'), 
    datetime('now'),
    '{"companyName": "トヨタ自動車", "notificationMethod": "WEB_PUSH"}'
),
(
    'alert_sample_2', 
    'user_1', 
    '9984', 
    'PRICE_CHANGE', 
    5.0, 
    'CHANGE_PERCENT', 
    1, 
    datetime('now'), 
    datetime('now'),
    '{"companyName": "ソフトバンクグループ", "notificationMethod": "IN_APP"}'
),
(
    'alert_sample_3', 
    'user_1', 
    '6758', 
    'VOLUME_SPIKE', 
    2000000.0, 
    'ABOVE', 
    1, 
    datetime('now'), 
    datetime('now'),
    '{"companyName": "ソニーグループ", "notificationMethod": "WEB_PUSH"}'
);