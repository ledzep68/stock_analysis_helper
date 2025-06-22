# データベース設計ドキュメント (Phase 2)

## 概要

Phase 2では、永続的なデータストレージとユーザー管理機能を実現するため、PostgreSQLデータベースを導入しました。本ドキュメントでは、データベーススキーマ、テーブル設計、セキュリティ実装について詳述します。

## データベース構成

### 基本情報
- **データベース管理システム**: PostgreSQL 12+
- **文字エンコード**: UTF-8
- **タイムゾーン**: UTC（アプリケーションでJSTに変換）
- **接続プール**: 最大20接続
- **バックアップ**: 日次自動バックアップ（本番環境）

### 接続設定
```typescript
const databaseConfig: PoolConfig = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'stock_analysis',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || 'password',
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false,
  max: 20, // 最大接続数
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
};
```

## テーブル設計

### 1. users テーブル
**目的**: ユーザーアカウント情報の管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | ユーザーID |
| email | VARCHAR(255) | UNIQUE, NOT NULL | メールアドレス |
| password_hash | VARCHAR(255) | NOT NULL | ハッシュ化パスワード |
| username | VARCHAR(100) | NULL | ユーザー名 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 更新日時 |
| is_active | BOOLEAN | DEFAULT true | アカウント有効状態 |
| last_login | TIMESTAMP WITH TIME ZONE | NULL | 最終ログイン日時 |
| failed_login_attempts | INTEGER | DEFAULT 0 | ログイン失敗回数 |
| locked_until | TIMESTAMP WITH TIME ZONE | NULL | アカウントロック解除時刻 |
| profile_data | JSONB | DEFAULT '{}' | プロフィール情報 |

**制約**:
- `email`: 正規表現による形式チェック
- `password_hash`: bcryptハッシュ（12ラウンド）

**インデックス**:
- `idx_users_email`: emailカラム（ユニークインデックス）
- `idx_users_active`: is_activeカラム（部分インデックス）

### 2. companies テーブル
**目的**: 企業基本情報の管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| symbol | VARCHAR(20) | PRIMARY KEY | 証券コード |
| name | VARCHAR(255) | NOT NULL | 企業名 |
| industry | VARCHAR(100) | NULL | 業界分類 |
| sector | VARCHAR(100) | NULL | セクター分類 |
| country | VARCHAR(50) | NULL | 本社所在国 |
| market_cap | BIGINT | NULL | 時価総額 |
| description | TEXT | NULL | 企業概要 |
| website | VARCHAR(500) | NULL | 公式ウェブサイト |
| employees | INTEGER | NULL | 従業員数 |
| founded_year | INTEGER | NULL | 設立年 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 更新日時 |
| last_data_update | TIMESTAMP WITH TIME ZONE | NULL | データ最終更新日時 |
| search_vector | tsvector | NULL | 全文検索ベクトル |

**制約**:
- `symbol`: 正規表現による形式チェック（英数字とピリオドのみ）

**インデックス**:
- `idx_companies_industry`: industryカラム
- `idx_companies_sector`: sectorカラム
- `idx_companies_search`: search_vectorカラム（GINインデックス）
- `idx_companies_name`: nameカラム

### 3. stock_prices テーブル
**目的**: 株価データの履歴管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | レコードID |
| symbol | VARCHAR(20) | REFERENCES companies(symbol) | 証券コード |
| price | DECIMAL(12,4) | NOT NULL, CHECK (price >= 0) | 株価 |
| volume | BIGINT | CHECK (volume >= 0) | 出来高 |
| market_cap | BIGINT | NULL | 時価総額 |
| pe_ratio | DECIMAL(8,2) | NULL | PER |
| eps | DECIMAL(8,4) | NULL | EPS |
| dividend_yield | DECIMAL(5,4) | NULL | 配当利回り |
| week_52_high | DECIMAL(12,4) | NULL | 52週高値 |
| week_52_low | DECIMAL(12,4) | NULL | 52週安値 |
| previous_close | DECIMAL(12,4) | NULL | 前日終値 |
| change_amount | DECIMAL(12,4) | NULL | 変動額 |
| change_percent | DECIMAL(8,4) | NULL | 変動率 |
| recorded_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 記録日時 |
| market_date | DATE | NOT NULL | 市場日付 |

**制約**:
- `UNIQUE(symbol, market_date)`: 同一日の重複データ防止

**インデックス**:
- `idx_stock_prices_symbol_date`: symbol, market_date（降順）
- `idx_stock_prices_recorded_at`: recorded_at（降順）

### 4. user_favorites テーブル
**目的**: ユーザーお気に入り企業の管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | レコードID |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | ユーザーID |
| symbol | VARCHAR(20) | REFERENCES companies(symbol) ON DELETE CASCADE | 証券コード |
| added_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 追加日時 |
| notes | TEXT | NULL | ユーザーメモ |
| price_alert_enabled | BOOLEAN | DEFAULT false | 価格アラート有効フラグ |
| target_price | DECIMAL(12,4) | NULL | 目標価格 |
| alert_type | VARCHAR(20) | CHECK (alert_type IN ('above', 'below', 'change')) | アラートタイプ |

**制約**:
- `UNIQUE(user_id, symbol)`: ユーザーごとの重複防止

**インデックス**:
- `idx_user_favorites_user_id`: user_idカラム
- `idx_user_favorites_symbol`: symbolカラム

### 5. industry_stats テーブル
**目的**: 業界統計データの管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | SERIAL | PRIMARY KEY | レコードID |
| industry | VARCHAR(100) | NOT NULL | 業界名 |
| sector | VARCHAR(100) | NOT NULL | セクター名 |
| calculation_date | DATE | NOT NULL | 計算日 |
| avg_pe_ratio | DECIMAL(8,2) | NULL | 平均PER |
| median_pe_ratio | DECIMAL(8,2) | NULL | 中央値PER |
| avg_dividend_yield | DECIMAL(5,4) | NULL | 平均配当利回り |
| median_dividend_yield | DECIMAL(5,4) | NULL | 中央値配当利回り |
| avg_market_cap | BIGINT | NULL | 平均時価総額 |
| median_market_cap | BIGINT | NULL | 中央値時価総額 |
| total_companies | INTEGER | NULL | 対象企業数 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |

**制約**:
- `UNIQUE(industry, sector, calculation_date)`: 日付ごとの重複防止

**インデックス**:
- `idx_industry_stats_industry`: industry, calculation_date（降順）
- `idx_industry_stats_sector`: sector, calculation_date（降順）

### 6. user_settings テーブル
**目的**: ユーザー設定情報の管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| user_id | UUID | PRIMARY KEY, REFERENCES users(id) ON DELETE CASCADE | ユーザーID |
| settings | JSONB | NOT NULL, DEFAULT '{}' | 設定データ（JSON形式） |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| updated_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 更新日時 |

**設定データ構造**:
```json
{
  "preferences": {
    "displayCurrency": "JPY",
    "language": "ja",
    "theme": "light",
    "dateFormat": "YYYY-MM-DD",
    "timeZone": "Asia/Tokyo"
  },
  "notifications": {
    "priceAlerts": true,
    "newsUpdates": false,
    "weeklyReports": true
  },
  "dashboard": {
    "defaultView": "overview",
    "chartsDefaultPeriod": "1M",
    "favoriteMetrics": ["peRatio", "roe", "dividendYield"]
  },
  "analysis": {
    "defaultAnalysisType": "basic",
    "includeIndustryComparison": true,
    "riskTolerance": "moderate"
  }
}
```

### 7. user_sessions テーブル
**目的**: ユーザーセッションの管理

| カラム名 | データ型 | 制約 | 説明 |
|---------|---------|------|------|
| id | UUID | PRIMARY KEY, DEFAULT gen_random_uuid() | セッションID |
| user_id | UUID | REFERENCES users(id) ON DELETE CASCADE | ユーザーID |
| token_hash | VARCHAR(255) | NOT NULL | トークンハッシュ |
| expires_at | TIMESTAMP WITH TIME ZONE | NOT NULL | 有効期限 |
| created_at | TIMESTAMP WITH TIME ZONE | DEFAULT CURRENT_TIMESTAMP | 作成日時 |
| ip_address | INET | NULL | IPアドレス |
| user_agent | TEXT | NULL | ユーザーエージェント |
| is_active | BOOLEAN | DEFAULT true | アクティブ状態 |

**インデックス**:
- `idx_user_sessions_user_id`: user_idカラム
- `idx_user_sessions_token`: token_hashカラム
- `idx_user_sessions_expires`: expires_at（部分インデックス、アクティブセッションのみ）

## トリガーとファンクション

### 1. 検索ベクトル更新トリガー
```sql
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

CREATE TRIGGER companies_search_vector_update
    BEFORE INSERT OR UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_company_search_vector();
```

### 2. updated_at 自動更新トリガー
```sql
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 各テーブルに適用
CREATE TRIGGER users_updated_at_trigger
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER companies_updated_at_trigger
    BEFORE UPDATE ON companies
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER user_settings_updated_at_trigger
    BEFORE UPDATE ON user_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
```

## セキュリティ実装

### Row Level Security (RLS)
ユーザーデータの分離を確保するため、以下のテーブルでRLSを有効化：

```sql
-- user_favoritesテーブル
ALTER TABLE user_favorites ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_favorites_policy ON user_favorites
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- user_settingsテーブル
ALTER TABLE user_settings ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_settings_policy ON user_settings
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);

-- user_sessionsテーブル
ALTER TABLE user_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY user_sessions_policy ON user_sessions
    FOR ALL USING (user_id = current_setting('app.current_user_id')::UUID);
```

### データ暗号化
- **パスワード**: bcryptハッシュ（12ラウンド）
- **セッショントークン**: JWTトークンのハッシュ化
- **機密データ**: 本番環境では暗号化ストレージ使用

### アクセス制御
- **データベースユーザー**: 最小権限の原則
- **接続暗号化**: SSL/TLS必須（本番環境）
- **IP制限**: ホワイトリスト方式（本番環境）

## パフォーマンス最適化

### インデックス戦略
1. **頻繁な検索**: B-treeインデックス
2. **全文検索**: GINインデックス
3. **範囲検索**: B-treeインデックス（複合）
4. **条件付きインデックス**: WHERE句付き部分インデックス

### クエリ最適化
1. **統計情報更新**: 定期的なANALYZE実行
2. **接続プール**: pgbouncerまたは内蔵プール使用
3. **読み込みレプリカ**: 分析クエリの分散（将来実装）

### データ保持ポリシー
1. **株価データ**: 5年間保持
2. **セッションデータ**: 30日間保持
3. **ログデータ**: 90日間保持

## バックアップ・リカバリ

### バックアップ戦略
1. **日次フルバックアップ**: pg_dump使用
2. **継続的アーカイブ**: WALファイル保管
3. **Point-in-Time Recovery**: WALアーカイブによる復旧
4. **テストリストア**: 週次でバックアップ検証

### 災害復旧
1. **RTO目標**: 4時間以内
2. **RPO目標**: 1時間以内
3. **レプリケーション**: マスター・スレーブ構成（本番環境）

## 初期化・メンテナンス

### データベース初期化
```bash
# 初期化スクリプト実行
npm run db:init

# マニュアル実行
ts-node scripts/init-database.ts
```

### 定期メンテナンス
1. **VACUUM**: 週次実行
2. **ANALYZE**: 日次実行
3. **REINDEX**: 月次実行
4. **セッションクリーンアップ**: 日次実行

### 監視項目
1. **接続数**: 最大接続数の80%でアラート
2. **レスポンス時間**: 500ms超でアラート
3. **ディスク使用量**: 85%でアラート
4. **レプリケーション遅延**: 60秒超でアラート

## トラブルシューティング

### よくある問題と対処法

#### 1. 接続エラー
```
Error: connect ECONNREFUSED 127.0.0.1:5432
```
**対処法**: PostgreSQLサービスの起動確認、接続設定確認

#### 2. 認証エラー
```
Error: password authentication failed for user "postgres"
```
**対処法**: パスワード、ユーザー名、権限の確認

#### 3. データベース未作成エラー
```
Error: database "stock_analysis" does not exist
```
**対処法**: データベース作成、初期化スクリプト実行

#### 4. パフォーマンス問題
- **症状**: クエリが遅い
- **対処法**: EXPLAIN ANALYZE実行、インデックス追加検討

### ログ確認
```sql
-- 実行中のクエリ確認
SELECT pid, now() - pg_stat_activity.query_start AS duration, query 
FROM pg_stat_activity 
WHERE (now() - pg_stat_activity.query_start) > interval '5 minutes';

-- データベース統計確認
SELECT schemaname,tablename,attname,n_distinct,correlation 
FROM pg_stats 
WHERE tablename = 'stock_prices';

-- インデックス使用状況確認
SELECT schemaname, tablename, indexname, idx_tup_read, idx_tup_fetch 
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;
```

## 今後の拡張計画

### Phase 3 でのデータベース拡張
1. **時系列データ**: TimescaleDB導入検討
2. **分析データ**: 専用分析テーブル追加
3. **キャッシュ**: Redis導入
4. **検索エンジン**: Elasticsearch導入検討

### スケーラビリティ対応
1. **読み込みレプリカ**: 分析クエリ分散
2. **シャーディング**: 大量データ対応
3. **パーティショニング**: 履歴データ分割
4. **圧縮**: 古いデータの圧縮保存

このデータベース設計により、Phase 2の要件を満たし、将来の拡張にも対応可能な堅牢な基盤が構築されています。