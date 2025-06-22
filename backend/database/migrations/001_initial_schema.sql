-- StockAnalysis Helper - Phase 2 Database Schema
-- 企業情報、ユーザー管理、お気に入り機能のためのテーブル設計

-- 1. ユーザーテーブル（Phase 2での認証準備）
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    username VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMP WITH TIME ZONE,
    
    -- セキュリティ関連
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP WITH TIME ZONE,
    
    -- プロフィール情報
    profile_data JSONB DEFAULT '{}',
    
    CONSTRAINT valid_email CHECK (email ~* '^[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}$')
);

-- 2. 企業基本情報テーブル
CREATE TABLE IF NOT EXISTS companies (
    symbol VARCHAR(20) PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    industry VARCHAR(100),
    sector VARCHAR(100),
    country VARCHAR(50),
    market_cap BIGINT,
    description TEXT,
    website VARCHAR(500),
    employees INTEGER,
    founded_year INTEGER,
    
    -- データ更新管理
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_data_update TIMESTAMP WITH TIME ZONE,
    
    -- 検索最適化
    search_vector tsvector,
    
    CONSTRAINT valid_symbol CHECK (symbol ~ '^[A-Z0-9.]{1,20}$')
);

-- 3. 株価履歴テーブル
CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(20) REFERENCES companies(symbol) ON DELETE CASCADE,
    price DECIMAL(12,4) NOT NULL CHECK (price >= 0),
    volume BIGINT CHECK (volume >= 0),
    market_cap BIGINT,
    pe_ratio DECIMAL(8,2),
    eps DECIMAL(8,4),
    dividend_yield DECIMAL(5,4),
    week_52_high DECIMAL(12,4),
    week_52_low DECIMAL(12,4),
    previous_close DECIMAL(12,4),
    change_amount DECIMAL(12,4),
    change_percent DECIMAL(8,4),
    
    -- タイムスタンプ
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    market_date DATE NOT NULL,
    
    -- インデックス最適化のため
    UNIQUE(symbol, market_date)
);

-- 4. ユーザーお気に入りテーブル
CREATE TABLE IF NOT EXISTS user_favorites (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(20) REFERENCES companies(symbol) ON DELETE CASCADE,
    added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    notes TEXT,
    
    -- アラート設定（Phase 3用）
    price_alert_enabled BOOLEAN DEFAULT false,
    target_price DECIMAL(12,4),
    alert_type VARCHAR(20) CHECK (alert_type IN ('above', 'below', 'change')),
    
    UNIQUE(user_id, symbol)
);

-- 5. 業界統計テーブル（業界比較機能用）
CREATE TABLE IF NOT EXISTS industry_stats (
    id SERIAL PRIMARY KEY,
    industry VARCHAR(100) NOT NULL,
    sector VARCHAR(100) NOT NULL,
    calculation_date DATE NOT NULL,
    
    -- 統計データ
    avg_pe_ratio DECIMAL(8,2),
    median_pe_ratio DECIMAL(8,2),
    avg_dividend_yield DECIMAL(5,4),
    median_dividend_yield DECIMAL(5,4),
    avg_market_cap BIGINT,
    median_market_cap BIGINT,
    total_companies INTEGER,
    
    -- メタデータ
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    
    UNIQUE(industry, sector, calculation_date)
);

-- 6. ユーザー設定テーブル
CREATE TABLE IF NOT EXISTS user_settings (
    user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    settings JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 7. セッション管理テーブル（認証用）
CREATE TABLE IF NOT EXISTS user_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    token_hash VARCHAR(255) NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    ip_address INET,
    user_agent TEXT,
    is_active BOOLEAN DEFAULT true
);

-- インデックス作成（パフォーマンス最適化）

-- ユーザーテーブル
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_active ON users(is_active) WHERE is_active = true;

-- 企業テーブル
CREATE INDEX IF NOT EXISTS idx_companies_industry ON companies(industry);
CREATE INDEX IF NOT EXISTS idx_companies_sector ON companies(sector);
CREATE INDEX IF NOT EXISTS idx_companies_search ON companies USING GIN(search_vector);
CREATE INDEX IF NOT EXISTS idx_companies_name ON companies(name);

-- 株価履歴テーブル
CREATE INDEX IF NOT EXISTS idx_stock_prices_symbol_date ON stock_prices(symbol, market_date DESC);
CREATE INDEX IF NOT EXISTS idx_stock_prices_recorded_at ON stock_prices(recorded_at DESC);

-- お気に入りテーブル
CREATE INDEX IF NOT EXISTS idx_user_favorites_user_id ON user_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_user_favorites_symbol ON user_favorites(symbol);

-- 業界統計テーブル
CREATE INDEX IF NOT EXISTS idx_industry_stats_industry ON industry_stats(industry, calculation_date DESC);
CREATE INDEX IF NOT EXISTS idx_industry_stats_sector ON industry_stats(sector, calculation_date DESC);

-- セッションテーブル
CREATE INDEX IF NOT EXISTS idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(token_hash);
CREATE INDEX IF NOT EXISTS idx_user_sessions_expires ON user_sessions(expires_at) WHERE is_active = true;

-- 検索ベクトルの更新関数
CREATE OR REPLACE FUNCTION update_company_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW.search_vector := to_tsvector('english', 
        COALESCE(NEW.name, '') || ' ' || 
        COALESCE(NEW.symbol, '') || ' ' || 
        COALESCE(NEW.industry, '') || ' ' ||
        COALESCE(NEW.sector, '')
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- トリガー作成
CREATE TRIGGER companies_search_vector_update
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_company_search_vector();

-- updated_at 自動更新関数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- updated_at 自動更新トリガー
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER companies_updated_at_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_settings_updated_at_trigger
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 初期データの挿入（サンプル企業データ）
INSERT INTO companies (symbol, name, industry, sector, country) VALUES
    ('AAPL', 'Apple Inc.', 'Consumer Electronics', 'Technology', 'US'),
    ('MSFT', 'Microsoft Corporation', 'Software', 'Technology', 'US'),
    ('GOOGL', 'Alphabet Inc.', 'Internet Content & Information', 'Technology', 'US'),
    ('TSLA', 'Tesla, Inc.', 'Auto Manufacturers', 'Consumer Cyclical', 'US'),
    ('7203.T', 'Toyota Motor Corporation', 'Auto Manufacturers', 'Consumer Cyclical', 'JP'),
    ('6758.T', 'Sony Group Corporation', 'Consumer Electronics', 'Technology', 'JP')
ON CONFLICT (symbol) DO NOTHING;

-- セキュリティ: Row Level Security (RLS) の設定
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;

-- RLSポリシー（ユーザーは自分のデータのみアクセス可能）
CREATE POLICY user_favorites_policy ON user_favorites
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY user_settings_policy ON user_settings
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

CREATE POLICY user_sessions_policy ON user_sessions
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- データベース統計情報の更新
ANALYZE;