-- ポートフォリオ最適化機能のためのデータベーススキーマ

-- ポートフォリオ最適化結果テーブル
CREATE TABLE IF NOT EXISTS portfolio_optimizations (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    objective_type TEXT NOT NULL, -- MAX_RETURN, MIN_RISK, MAX_SHARPE, RISK_PARITY, EQUAL_WEIGHT
    risk_tolerance TEXT NOT NULL, -- CONSERVATIVE, MODERATE, AGGRESSIVE
    time_horizon TEXT DEFAULT 'MEDIUM', -- SHORT, MEDIUM, LONG
    expected_return REAL NOT NULL,
    expected_risk REAL NOT NULL,
    sharpe_ratio REAL NOT NULL,
    allocations TEXT NOT NULL, -- JSON配分データ
    metrics TEXT NOT NULL, -- JSON最適化メトリクス
    estimated_costs TEXT NOT NULL, -- JSON取引コスト
    constraints TEXT, -- JSON制約条件
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

-- 効率的フロンティアデータテーブル
CREATE TABLE IF NOT EXISTS efficient_frontier_points (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    optimization_id TEXT NOT NULL,
    risk_level REAL NOT NULL,
    expected_return REAL NOT NULL,
    sharpe_ratio REAL NOT NULL,
    allocations TEXT NOT NULL, -- JSON配分データ
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
    FOREIGN KEY (optimization_id) REFERENCES portfolio_optimizations(id)
);

-- リバランシング提案テーブル
CREATE TABLE IF NOT EXISTS rebalancing_proposals (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    optimization_id TEXT NOT NULL,
    symbol TEXT NOT NULL,
    current_weight REAL NOT NULL,
    target_weight REAL NOT NULL,
    current_quantity INTEGER NOT NULL,
    target_quantity INTEGER NOT NULL,
    action TEXT NOT NULL, -- BUY, SELL, HOLD
    amount REAL NOT NULL,
    estimated_cost REAL NOT NULL,
    status TEXT DEFAULT 'PENDING', -- PENDING, APPROVED, EXECUTED, REJECTED
    created_at TEXT NOT NULL,
    executed_at TEXT,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
    FOREIGN KEY (optimization_id) REFERENCES portfolio_optimizations(id)
);

-- 最適化制約プリセットテーブル
CREATE TABLE IF NOT EXISTS optimization_presets (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    name TEXT NOT NULL,
    description TEXT,
    objective_type TEXT NOT NULL,
    risk_tolerance TEXT NOT NULL,
    time_horizon TEXT NOT NULL,
    constraints TEXT NOT NULL, -- JSON制約データ
    is_default BOOLEAN DEFAULT FALSE,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ポートフォリオベンチマークテーブル
CREATE TABLE IF NOT EXISTS portfolio_benchmarks (
    id TEXT PRIMARY KEY,
    portfolio_id TEXT NOT NULL,
    benchmark_symbol TEXT NOT NULL, -- TOPIX, NIKKEI225, etc.
    benchmark_name TEXT NOT NULL,
    weight REAL DEFAULT 1.0, -- 複合ベンチマークの場合の重み
    is_primary BOOLEAN DEFAULT TRUE,
    created_at TEXT NOT NULL,
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id)
);

-- セクター制約テーブル
CREATE TABLE IF NOT EXISTS sector_constraints (
    id TEXT PRIMARY KEY,
    optimization_preset_id TEXT NOT NULL,
    sector_name TEXT NOT NULL,
    min_allocation REAL DEFAULT 0.0,
    max_allocation REAL DEFAULT 1.0,
    target_allocation REAL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (optimization_preset_id) REFERENCES optimization_presets(id)
);

-- 最適化パフォーマンステーブル
CREATE TABLE IF NOT EXISTS optimization_performance (
    id TEXT PRIMARY KEY,
    optimization_id TEXT NOT NULL,
    backtest_start_date TEXT NOT NULL,
    backtest_end_date TEXT NOT NULL,
    actual_return REAL NOT NULL,
    predicted_return REAL NOT NULL,
    actual_risk REAL NOT NULL,
    predicted_risk REAL NOT NULL,
    tracking_error REAL NOT NULL,
    information_ratio REAL NOT NULL,
    max_drawdown REAL NOT NULL,
    win_rate REAL NOT NULL, -- 勝率
    created_at TEXT NOT NULL,
    FOREIGN KEY (optimization_id) REFERENCES portfolio_optimizations(id)
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_portfolio_optimizations_portfolio_id ON portfolio_optimizations(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_optimizations_created_at ON portfolio_optimizations(created_at);
CREATE INDEX IF NOT EXISTS idx_portfolio_optimizations_objective_type ON portfolio_optimizations(objective_type);

CREATE INDEX IF NOT EXISTS idx_efficient_frontier_points_portfolio_id ON efficient_frontier_points(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_efficient_frontier_points_optimization_id ON efficient_frontier_points(optimization_id);

CREATE INDEX IF NOT EXISTS idx_rebalancing_proposals_portfolio_id ON rebalancing_proposals(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_rebalancing_proposals_status ON rebalancing_proposals(status);
CREATE INDEX IF NOT EXISTS idx_rebalancing_proposals_created_at ON rebalancing_proposals(created_at);

CREATE INDEX IF NOT EXISTS idx_optimization_presets_user_id ON optimization_presets(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_presets_is_default ON optimization_presets(is_default);

CREATE INDEX IF NOT EXISTS idx_portfolio_benchmarks_portfolio_id ON portfolio_benchmarks(portfolio_id);
CREATE INDEX IF NOT EXISTS idx_portfolio_benchmarks_is_primary ON portfolio_benchmarks(is_primary);

CREATE INDEX IF NOT EXISTS idx_sector_constraints_preset_id ON sector_constraints(optimization_preset_id);

CREATE INDEX IF NOT EXISTS idx_optimization_performance_optimization_id ON optimization_performance(optimization_id);

-- サンプルデータ挿入

-- デフォルト最適化プリセット
INSERT OR IGNORE INTO optimization_presets (
    id, user_id, name, description, objective_type, risk_tolerance, time_horizon, 
    constraints, is_default, created_at, updated_at
) VALUES 
(
    'preset_conservative', 'user1', '保守的戦略', 
    'リスクを最小化し、安定した収益を目指す', 'MIN_RISK', 'CONSERVATIVE', 'LONG',
    '{"minWeight": 0.02, "maxWeight": 0.25, "maxRisk": 0.15, "riskFreeRate": 0.02}',
    true, datetime('now'), datetime('now')
),
(
    'preset_balanced', 'user1', 'バランス戦略', 
    'リスクとリターンのバランスを重視', 'MAX_SHARPE', 'MODERATE', 'MEDIUM',
    '{"minWeight": 0.01, "maxWeight": 0.35, "maxRisk": 0.25, "riskFreeRate": 0.02}',
    true, datetime('now'), datetime('now')
),
(
    'preset_growth', 'user1', '成長戦略', 
    '高いリターンを目指し、リスクを許容', 'MAX_RETURN', 'AGGRESSIVE', 'LONG',
    '{"minWeight": 0.005, "maxWeight": 0.50, "maxRisk": 0.40, "riskFreeRate": 0.02}',
    true, datetime('now'), datetime('now')
),
(
    'preset_risk_parity', 'user1', 'リスクパリティ戦略', 
    'リスク寄与度を均等化する分散投資', 'RISK_PARITY', 'MODERATE', 'MEDIUM',
    '{"minWeight": 0.01, "maxWeight": 0.30, "rebalanceThreshold": 0.03}',
    false, datetime('now'), datetime('now')
);

-- サンプルベンチマーク
INSERT OR IGNORE INTO portfolio_benchmarks (
    id, portfolio_id, benchmark_symbol, benchmark_name, weight, is_primary, created_at
) VALUES 
(
    'benchmark_topix', 'portfolio_sample_1', 'TOPIX', '東証株価指数', 0.7, true, datetime('now')
),
(
    'benchmark_nikkei', 'portfolio_sample_1', 'N225', '日経平均株価', 0.3, false, datetime('now')
);

-- サンプルセクター制約
INSERT OR IGNORE INTO sector_constraints (
    id, optimization_preset_id, sector_name, min_allocation, max_allocation, target_allocation, created_at
) VALUES 
('sector_tech_conservative', 'preset_conservative', 'Technology', 0.05, 0.20, NULL, datetime('now')),
('sector_finance_conservative', 'preset_conservative', 'Financial', 0.10, 0.30, NULL, datetime('now')),
('sector_healthcare_conservative', 'preset_conservative', 'Healthcare', 0.05, 0.25, NULL, datetime('now')),
('sector_consumer_conservative', 'preset_conservative', 'Consumer', 0.10, 0.25, NULL, datetime('now')),

('sector_tech_balanced', 'preset_balanced', 'Technology', 0.10, 0.35, NULL, datetime('now')),
('sector_finance_balanced', 'preset_balanced', 'Financial', 0.05, 0.25, NULL, datetime('now')),
('sector_healthcare_balanced', 'preset_balanced', 'Healthcare', 0.05, 0.20, NULL, datetime('now')),
('sector_consumer_balanced', 'preset_balanced', 'Consumer', 0.05, 0.20, NULL, datetime('now')),

('sector_tech_growth', 'preset_growth', 'Technology', 0.15, 0.50, NULL, datetime('now')),
('sector_finance_growth', 'preset_growth', 'Financial', 0.02, 0.20, NULL, datetime('now')),
('sector_healthcare_growth', 'preset_growth', 'Healthcare', 0.05, 0.25, NULL, datetime('now')),
('sector_consumer_growth', 'preset_growth', 'Consumer', 0.05, 0.30, NULL, datetime('now'));

-- 管理・監査用テーブル

-- 最適化実行ログテーブル
CREATE TABLE IF NOT EXISTS optimization_execution_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    portfolio_id TEXT NOT NULL,
    optimization_id TEXT,
    action TEXT NOT NULL, -- OPTIMIZE, REBALANCE, BACKTEST
    status TEXT NOT NULL, -- SUCCESS, FAILED, CANCELLED
    execution_time_ms INTEGER NOT NULL,
    error_message TEXT,
    created_at TEXT NOT NULL,
    FOREIGN KEY (user_id) REFERENCES users(id),
    FOREIGN KEY (portfolio_id) REFERENCES portfolios(id),
    FOREIGN KEY (optimization_id) REFERENCES portfolio_optimizations(id)
);

CREATE INDEX IF NOT EXISTS idx_optimization_execution_logs_user_id ON optimization_execution_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_optimization_execution_logs_created_at ON optimization_execution_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_optimization_execution_logs_status ON optimization_execution_logs(status);