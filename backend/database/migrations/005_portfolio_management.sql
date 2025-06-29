-- ポートフォリオ管理テーブル
CREATE TABLE IF NOT EXISTS portfolios (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    initial_capital REAL NOT NULL DEFAULT 1000000,
    currency TEXT NOT NULL DEFAULT 'JPY',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- ポートフォリオ銘柄保有テーブル
CREATE TABLE IF NOT EXISTS portfolio_holdings (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    quantity INTEGER NOT NULL,
    average_cost REAL NOT NULL,
    purchase_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- ポートフォリオ取引履歴テーブル
CREATE TABLE IF NOT EXISTS portfolio_transactions (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    transaction_type TEXT NOT NULL CHECK (transaction_type IN ('BUY', 'SELL', 'DIVIDEND')),
    quantity INTEGER NOT NULL,
    price REAL NOT NULL,
    total_amount REAL NOT NULL,
    fees REAL DEFAULT 0,
    transaction_date TEXT NOT NULL,
    notes TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- ポートフォリオパフォーマンス履歴テーブル
CREATE TABLE IF NOT EXISTS portfolio_performance (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    date TEXT NOT NULL,
    total_value REAL NOT NULL,
    total_cost REAL NOT NULL,
    unrealized_pnl REAL NOT NULL,
    realized_pnl REAL DEFAULT 0,
    daily_return REAL,
    cumulative_return REAL,
    benchmark_return REAL,
    sharpe_ratio REAL,
    volatility REAL,
    max_drawdown REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- ポートフォリオリスクメトリクステーブル
CREATE TABLE IF NOT EXISTS portfolio_risk_metrics (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    date TEXT NOT NULL,
    var_95 REAL, -- Value at Risk (95%)
    var_99 REAL, -- Value at Risk (99%)
    expected_shortfall REAL,
    beta REAL,
    alpha REAL,
    correlation_matrix TEXT, -- JSON形式
    sector_allocation TEXT, -- JSON形式
    concentration_risk REAL,
    liquidity_risk REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id) ON DELETE CASCADE
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_portfolios_user_id ON portfolios(user_id);
CREATE INDEX IF NOT EXISTS idx_portfolios_active ON portfolios(is_active);

CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_portfolio_id ON portfolio_holdings(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_holdings_symbol ON portfolio_holdings(symbol);

CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_portfolio_id ON portfolio_transactions(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_symbol ON portfolio_transactions(symbol);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_date ON portfolio_transactions(transaction_date);
CREATE INDEX IF NOT EXISTS idx_portfolio_transactions_type ON portfolio_transactions(transaction_type);

CREATE INDEX IF NOT EXISTS idx_portfolio_performance_portfolio_id ON portfolio_performance(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_performance_date ON portfolio_performance(date);

CREATE INDEX IF NOT EXISTS idx_portfolio_risk_metrics_portfolio_id ON portfolio_risk_metrics(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_risk_metrics_date ON portfolio_risk_metrics(date);

-- サンプルデータ
INSERT OR IGNORE INTO portfolios (
    id, user_id, name, description, initial_capital, currency, is_active, created_at, updated_at
) VALUES 
(
    'portfolio_1',
    'demo_user',
    '日本株ポートフォリオ',
    '主要日本株による分散投資ポートフォリオ',
    5000000,
    'JPY',
    true,
    datetime('now'),
    datetime('now')
),
(
    'portfolio_2',
    'demo_user',
    'テクノロジー株ポートフォリオ',
    'IT・テクノロジー関連株による成長投資',
    3000000,
    'JPY',
    true,
    datetime('now'),
    datetime('now')
);

-- サンプル保有銘柄
INSERT OR IGNORE INTO portfolio_holdings (
    id, portfolio_id, symbol, quantity, average_cost, purchase_date, notes, created_at, updated_at
) VALUES 
(
    'holding_1',
    'portfolio_1',
    '7203',
    1000,
    2800.0,
    '2024-01-15',
    'トヨタ自動車 - 安定配当株',
    datetime('now'),
    datetime('now')
),
(
    'holding_2',
    'portfolio_1',
    '9984',
    500,
    5800.0,
    '2024-01-20',
    'ソフトバンクグループ - 成長株',
    datetime('now'),
    datetime('now')
),
(
    'holding_3',
    'portfolio_2',
    '6758',
    2000,
    1200.0,
    '2024-02-01',
    'ソニーグループ - テクノロジー株',
    datetime('now'),
    datetime('now')
);

-- サンプル取引履歴
INSERT OR IGNORE INTO portfolio_transactions (
    id, portfolio_id, symbol, transaction_type, quantity, price, total_amount, fees, transaction_date, notes, created_at
) VALUES 
(
    'transaction_1',
    'portfolio_1',
    '7203',
    'BUY',
    1000,
    2800.0,
    2800000,
    2800,
    '2024-01-15',
    '初回購入',
    datetime('now')
),
(
    'transaction_2',
    'portfolio_1',
    '9984',
    'BUY',
    500,
    5800.0,
    2900000,
    2900,
    '2024-01-20',
    '成長株として追加',
    datetime('now')
),
(
    'transaction_3',
    'portfolio_2',
    '6758',
    'BUY',
    2000,
    1200.0,
    2400000,
    2400,
    '2024-02-01',
    'テック株ポートフォリオ開始',
    datetime('now')
);