-- 市場区分サポートのためのテーブル拡張
-- 東証プライム、スタンダード、グロース市場に対応

-- 市場区分カラムを追加
ALTER TABLE companies ADD COLUMN market_segment TEXT;

-- 取引所カラムを追加
ALTER TABLE companies ADD COLUMN exchange TEXT DEFAULT 'TSE';

-- インデックス作成（検索性能向上のため）
CREATE INDEX IF NOT EXISTS idx_companies_market_segment ON companies(market_segment);
CREATE INDEX IF NOT EXISTS idx_companies_exchange ON companies(exchange);

-- 既存の日本企業データに市場区分を設定
-- 大型優良企業をプライム市場に分類
UPDATE companies SET 
  market_segment = 'Prime',
  exchange = 'TSE'
WHERE symbol IN ('7203', '6758', '8306', '9984');

-- 中規模企業をスタンダード市場に分類
UPDATE companies SET 
  market_segment = 'Standard',
  exchange = 'TSE'
WHERE symbol = '4519';

-- 米国企業の取引所を設定
UPDATE companies SET 
  exchange = 'NASDAQ',
  market_segment = 'NASDAQ'
WHERE symbol IN ('AAPL', 'MSFT', 'GOOGL', 'TSLA');

-- マイグレーション完了ログ
INSERT INTO migration_log (version, description, executed_at) 
VALUES (3, 'Added market segment and exchange support for Japanese markets', datetime('now'))
ON CONFLICT(version) DO NOTHING;