-- ESG評価機能のためのデータベーススキーマ

-- ESGデータテーブル
CREATE TABLE IF NOT EXISTS esg_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    company_name TEXT,
    report_year INTEGER NOT NULL,
    data_source TEXT NOT NULL, -- 'BLOOMBERG', 'MSCI', 'REFINITIV', 'MANUAL'
    
    -- 環境スコア (Environment)
    environmental_score REAL,
    carbon_emissions REAL, -- CO2排出量 (トン)
    energy_consumption REAL, -- エネルギー消費量
    water_usage REAL, -- 水使用量
    waste_management_score REAL, -- 廃棄物管理スコア
    renewable_energy_ratio REAL, -- 再生可能エネルギー比率
    carbon_intensity REAL, -- 炭素集約度
    
    -- 社会スコア (Social)
    social_score REAL,
    employee_satisfaction REAL, -- 従業員満足度
    diversity_score REAL, -- ダイバーシティスコア
    safety_incidents INTEGER, -- 安全事故件数
    community_investment REAL, -- 地域投資額
    human_rights_score REAL, -- 人権スコア
    labor_practices_score REAL, -- 労働慣行スコア
    
    -- ガバナンススコア (Governance)
    governance_score REAL,
    board_independence REAL, -- 取締役独立性
    executive_compensation_ratio REAL, -- 役員報酬比率
    transparency_score REAL, -- 透明性スコア
    audit_quality_score REAL, -- 監査品質スコア
    risk_management_score REAL, -- リスク管理スコア
    
    -- 総合スコア
    total_esg_score REAL,
    esg_grade TEXT, -- 'AAA', 'AA', 'A', 'BBB', 'BB', 'B', 'CCC'
    esg_ranking INTEGER, -- 業界内ランキング
    
    -- メタデータ
    last_updated DATETIME DEFAULT CURRENT_TIMESTAMP,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(symbol, report_year, data_source)
);

-- ESG評価履歴テーブル
CREATE TABLE IF NOT EXISTS esg_evaluation_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    evaluation_date DATE NOT NULL,
    evaluator TEXT, -- 評価者/評価機関
    
    environmental_score REAL,
    social_score REAL,
    governance_score REAL,
    total_score REAL,
    grade TEXT,
    
    -- 評価理由・コメント
    evaluation_notes TEXT,
    key_strengths TEXT, -- 主な強み
    key_concerns TEXT, -- 主な懸念事項
    improvement_recommendations TEXT, -- 改善提案
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ESG業界ベンチマークテーブル
CREATE TABLE IF NOT EXISTS esg_industry_benchmarks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    industry_code TEXT NOT NULL,
    industry_name TEXT NOT NULL,
    benchmark_year INTEGER NOT NULL,
    
    -- 業界平均スコア
    avg_environmental_score REAL,
    avg_social_score REAL,
    avg_governance_score REAL,
    avg_total_score REAL,
    
    -- 業界標準偏差
    std_environmental_score REAL,
    std_social_score REAL,
    std_governance_score REAL,
    std_total_score REAL,
    
    -- パーセンタイル
    percentile_25_score REAL,
    percentile_50_score REAL,
    percentile_75_score REAL,
    percentile_90_score REAL,
    
    company_count INTEGER, -- サンプル企業数
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(industry_code, benchmark_year)
);

-- ESGリスクアセスメントテーブル
CREATE TABLE IF NOT EXISTS esg_risk_assessments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    assessment_date DATE NOT NULL,
    
    -- 環境リスク
    climate_risk_score REAL,
    regulatory_risk_score REAL,
    resource_scarcity_risk REAL,
    
    -- 社会リスク
    reputation_risk_score REAL,
    workforce_risk_score REAL,
    community_risk_score REAL,
    
    -- ガバナンスリスク
    management_risk_score REAL,
    compliance_risk_score REAL,
    corruption_risk_score REAL,
    
    -- 総合リスクスコア
    total_risk_score REAL,
    risk_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    
    -- リスク評価詳細
    risk_factors TEXT, -- JSON形式でリスク要因を保存
    mitigation_strategies TEXT, -- リスク軽減戦略
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ESGニュース・イベントテーブル
CREATE TABLE IF NOT EXISTS esg_news_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    event_date DATE NOT NULL,
    event_type TEXT NOT NULL, -- 'ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE', 'CONTROVERSY'
    
    title TEXT NOT NULL,
    description TEXT,
    source TEXT, -- ニュースソース
    severity_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH', 'CRITICAL'
    
    -- 影響スコア
    environmental_impact REAL,
    social_impact REAL,
    governance_impact REAL,
    financial_impact REAL,
    
    -- メタデータ
    url TEXT,
    sentiment_score REAL, -- センチメント分析スコア
    keywords TEXT, -- 関連キーワード（カンマ区切り）
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ESGパフォーマンス追跡テーブル
CREATE TABLE IF NOT EXISTS esg_performance_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    tracking_date DATE NOT NULL,
    
    -- KPI追跡
    carbon_footprint_reduction REAL, -- 炭素排出量削減率
    renewable_energy_adoption REAL, -- 再生可能エネルギー導入率
    gender_diversity_ratio REAL, -- 性別多様性比率
    employee_turnover_rate REAL, -- 従業員離職率
    board_diversity_score REAL, -- 取締役会多様性スコア
    
    -- 目標達成状況
    sustainability_goals_progress REAL, -- 持続可能性目標進捗率
    targets_met_count INTEGER, -- 達成した目標数
    targets_total_count INTEGER, -- 総目標数
    
    -- 改善指標
    improvement_trend TEXT, -- 'IMPROVING', 'STABLE', 'DECLINING'
    year_over_year_change REAL, -- 前年比変化率
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- ESGコンプライアンス・規制追跡テーブル
CREATE TABLE IF NOT EXISTS esg_compliance_tracking (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    symbol TEXT NOT NULL,
    compliance_area TEXT NOT NULL, -- 'ENVIRONMENTAL', 'SOCIAL', 'GOVERNANCE'
    regulation_name TEXT NOT NULL,
    jurisdiction TEXT, -- 規制管轄区域
    
    compliance_status TEXT NOT NULL, -- 'COMPLIANT', 'NON_COMPLIANT', 'UNDER_REVIEW', 'NOT_APPLICABLE'
    last_assessment_date DATE,
    next_review_date DATE,
    
    -- 詳細情報
    requirements TEXT, -- 規制要件詳細
    current_status_details TEXT,
    remediation_plan TEXT, -- 改善計画
    
    -- スコア
    compliance_score REAL, -- コンプライアンススコア (0-100)
    risk_level TEXT, -- 'LOW', 'MEDIUM', 'HIGH'
    
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

-- インデックス作成
CREATE INDEX IF NOT EXISTS idx_esg_data_symbol_year ON esg_data(symbol, report_year);
CREATE INDEX IF NOT EXISTS idx_esg_evaluation_symbol_date ON esg_evaluation_history(symbol, evaluation_date);
CREATE INDEX IF NOT EXISTS idx_esg_benchmarks_industry ON esg_industry_benchmarks(industry_code, benchmark_year);
CREATE INDEX IF NOT EXISTS idx_esg_risk_symbol_date ON esg_risk_assessments(symbol, assessment_date);
CREATE INDEX IF NOT EXISTS idx_esg_news_symbol_date ON esg_news_events(symbol, event_date);
CREATE INDEX IF NOT EXISTS idx_esg_performance_symbol_date ON esg_performance_tracking(symbol, tracking_date);
CREATE INDEX IF NOT EXISTS idx_esg_compliance_symbol ON esg_compliance_tracking(symbol, compliance_area);