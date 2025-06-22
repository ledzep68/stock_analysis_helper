-- Technical Analysis Cache Table
CREATE TABLE IF NOT EXISTS technical_analysis_cache (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL UNIQUE,
    analysis_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Stock Prices Historical Data Table
CREATE TABLE IF NOT EXISTS stock_prices (
    id SERIAL PRIMARY KEY,
    symbol VARCHAR(10) NOT NULL,
    date DATE NOT NULL,
    open_price DECIMAL(10, 2),
    high_price DECIMAL(10, 2),
    low_price DECIMAL(10, 2),
    close_price DECIMAL(10, 2) NOT NULL,
    volume BIGINT,
    adjusted_close DECIMAL(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(symbol, date)
);

-- Indexes for performance
CREATE INDEX idx_stock_prices_symbol_date ON stock_prices(symbol, date DESC);
CREATE INDEX idx_stock_prices_date ON stock_prices(date DESC);
CREATE INDEX idx_technical_cache_symbol ON technical_analysis_cache(symbol);
CREATE INDEX idx_technical_cache_updated ON technical_analysis_cache(updated_at DESC);

-- Alert Configurations Table
CREATE TABLE IF NOT EXISTS price_alerts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    symbol VARCHAR(10) NOT NULL,
    alert_type VARCHAR(20) NOT NULL CHECK (alert_type IN ('price_above', 'price_below', 'percent_change', 'volume_spike', 'technical_signal')),
    target_value DECIMAL(10, 2),
    current_value DECIMAL(10, 2),
    is_active BOOLEAN DEFAULT true,
    triggered_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Alert History Table
CREATE TABLE IF NOT EXISTS alert_history (
    id SERIAL PRIMARY KEY,
    alert_id INTEGER NOT NULL REFERENCES price_alerts(id) ON DELETE CASCADE,
    triggered_value DECIMAL(10, 2),
    message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Technical Indicators Settings per User
CREATE TABLE IF NOT EXISTS user_technical_settings (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    indicator_preferences JSONB DEFAULT '{
        "sma": [20, 50, 200],
        "ema": [12, 26],
        "rsi": {"period": 14, "overbought": 70, "oversold": 30},
        "macd": {"fast": 12, "slow": 26, "signal": 9},
        "bollinger": {"period": 20, "stdDev": 2},
        "stochastic": {"period": 14, "smooth": 3}
    }'::jsonb,
    chart_preferences JSONB DEFAULT '{
        "theme": "light",
        "candlestick": true,
        "volume": true,
        "indicators": ["sma", "volume"]
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(user_id)
);

-- Indexes for alerts
CREATE INDEX idx_price_alerts_user ON price_alerts(user_id);
CREATE INDEX idx_price_alerts_symbol ON price_alerts(symbol);
CREATE INDEX idx_price_alerts_active ON price_alerts(is_active) WHERE is_active = true;
CREATE INDEX idx_alert_history_alert ON alert_history(alert_id);

-- Update triggers
CREATE TRIGGER update_technical_cache_updated_at
    BEFORE UPDATE ON technical_analysis_cache
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_price_alerts_updated_at
    BEFORE UPDATE ON price_alerts
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_user_technical_settings_updated_at
    BEFORE UPDATE ON user_technical_settings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Row Level Security
ALTER TABLE price_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_technical_settings ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY price_alerts_policy ON price_alerts
    FOR ALL TO authenticated
    USING (user_id = current_user_id());

CREATE POLICY user_technical_settings_policy ON user_technical_settings
    FOR ALL TO authenticated
    USING (user_id = current_user_id());