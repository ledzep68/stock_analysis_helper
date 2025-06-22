# デプロイメント・セットアップガイド (Phase 2)

## 概要

本ドキュメントでは、StockAnalysis Helper Phase 2の開発環境構築から本番環境デプロイメントまでの包括的な手順を説明します。セキュリティ要件、パフォーマンス最適化、運用監視までを含む実用的なガイドです。

## システム要件

### 最小動作環境
- **OS**: Ubuntu 20.04+ / CentOS 8+ / macOS 12+ / Windows 10+
- **Node.js**: v18.0.0以上
- **PostgreSQL**: v12.0以上
- **RAM**: 4GB以上
- **ストレージ**: 20GB以上の空き容量

### 推奨本番環境
- **OS**: Ubuntu 22.04 LTS
- **Node.js**: v20.0.0以上（LTS）
- **PostgreSQL**: v15.0以上
- **RAM**: 8GB以上
- **ストレージ**: 100GB以上（SSD推奨）
- **CPU**: 4コア以上

### 依存関係
- **Git**: v2.30以上
- **npm**: v9.0以上
- **TypeScript**: v5.0以上（グローバルインストール推奨）

## 開発環境セットアップ

### 1. リポジトリクローン
```bash
# プロジェクトをクローン
git clone https://github.com/your-username/stock_analysis_helper.git
cd stock_analysis_helper

# ブランチ確認
git branch -a
git checkout main
```

### 2. バックエンド環境構築
```bash
# バックエンドディレクトリに移動
cd backend

# 依存関係インストール
npm install

# TypeScript グローバルインストール（未インストールの場合）
npm install -g typescript ts-node

# 環境変数ファイル作成
cp .env.example .env
```

### 3. 環境変数設定
```bash
# .env ファイルを編集
nano .env
```

```env
# サーバー設定
PORT=5001
NODE_ENV=development

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_analysis
DB_USER=postgres
DB_PASSWORD=your_secure_password

# 認証設定（開発環境用）
JWT_SECRET=dev-jwt-secret-change-in-production-256-bit-minimum
JWT_EXPIRY=24h
BCRYPT_SALT_ROUNDS=12

# API キー（実際のキーに置き換え）
YAHOO_FINANCE_API_KEY=your_yahoo_finance_api_key_here
ALPHA_VANTAGE_API_KEY=your_alpha_vantage_api_key_here

# CORS設定
ALLOWED_ORIGINS=http://localhost:3000,http://127.0.0.1:3000
```

### 4. PostgreSQL データベースセットアップ

#### Ubuntu/Debian
```bash
# PostgreSQL インストール
sudo apt update
sudo apt install postgresql postgresql-contrib

# PostgreSQL サービス開始
sudo systemctl start postgresql
sudo systemctl enable postgresql

# postgres ユーザーでログイン
sudo -u postgres psql

# データベースとユーザー作成
CREATE DATABASE stock_analysis;
CREATE USER stock_user WITH ENCRYPTED PASSWORD 'your_secure_password';
GRANT ALL PRIVILEGES ON DATABASE stock_analysis TO stock_user;
ALTER USER stock_user CREATEDB;
\q
```

#### macOS (Homebrew)
```bash
# PostgreSQL インストール
brew install postgresql@15

# サービス開始
brew services start postgresql@15

# データベース作成
createdb stock_analysis
```

#### Windows
```bash
# PostgreSQL を公式サイトからダウンロード・インストール
# https://www.postgresql.org/download/windows/

# コマンドプロンプトまたはPowerShellで
createdb -U postgres stock_analysis
```

### 5. データベース初期化
```bash
# バックエンドディレクトリで実行
cd backend

# データベーススキーマ初期化
npm run db:init

# 成功時の出力例:
# 🚀 Starting database initialization...
# 📡 Testing database connection...
# ✅ Database connection successful
# 🔧 Executing database migration...
# ✅ Database schema created successfully
# 📊 Created tables: companies, industry_stats, stock_prices, user_favorites, user_sessions, user_settings, users
# 📈 Sample companies inserted: 6
# 🎉 Database initialization completed successfully!
```

### 6. 開発サーバー起動
```bash
# 開発モードで起動
npm run dev

# 成功時の出力:
# [nodemon] starting `ts-node src/index.ts`
# Server is running on port 5001
```

### 7. API動作確認
```bash
# ヘルスチェック
curl http://localhost:5001/api/health
# 期待される出力: {"status":"OK","message":"StockAnalysis Helper API is running"}

# 企業検索テスト
curl "http://localhost:5001/api/companies/search?query=Apple"

# 詳細分析テスト（サンプルデータ）
curl http://localhost:5001/api/analysis/AAPL/detailed
```

## フロントエンド環境構築

### 1. フロントエンド依存関係インストール
```bash
# プロジェクトルートディレクトリで
cd frontend

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local
```

### 2. フロントエンド環境変数
```env
# .env.local
REACT_APP_API_BASE_URL=http://localhost:5001/api
REACT_APP_ENVIRONMENT=development
REACT_APP_VERSION=2.0.0
```

### 3. フロントエンド開発サーバー起動
```bash
# 開発モードで起動
npm start

# ブラウザで http://localhost:3000 が自動で開く
```

## 本番環境デプロイメント

### 1. 本番サーバー準備

#### Ubuntu 22.04 LTS セットアップ
```bash
# システム更新
sudo apt update && sudo apt upgrade -y

# 必要なパッケージインストール
sudo apt install -y curl wget gnupg2 software-properties-common apt-transport-https ca-certificates

# Node.js 20.x LTS インストール
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# PostgreSQL 15 インストール
sudo sh -c 'echo "deb http://apt.postgresql.org/pub/repos/apt $(lsb_release -cs)-pgdg main" > /etc/apt/sources.list.d/pgdg.list'
wget --quiet -O - https://www.postgresql.org/pub/repos/apt/ACME-archive-sign-key.asc | sudo apt-key add -
sudo apt update
sudo apt install -y postgresql-15 postgresql-client-15

# Nginx インストール（リバースプロキシ用）
sudo apt install -y nginx

# PM2 インストール（プロセス管理）
sudo npm install -g pm2

# Let's Encrypt（SSL証明書）
sudo apt install -y certbot python3-certbot-nginx
```

### 2. データベース本番設定
```bash
# PostgreSQL 設定
sudo -u postgres psql

-- 本番用データベース・ユーザー作成
CREATE DATABASE stock_analysis_prod;
CREATE USER stock_prod_user WITH ENCRYPTED PASSWORD 'ultra_secure_production_password_2024!';
GRANT ALL PRIVILEGES ON DATABASE stock_analysis_prod TO stock_prod_user;

-- セキュリティ強化
ALTER USER stock_prod_user SET default_transaction_isolation TO 'read committed';
ALTER USER stock_prod_user SET timezone TO 'UTC';

\q

# PostgreSQL設定ファイル編集
sudo nano /etc/postgresql/15/main/postgresql.conf

# 以下の設定を変更/追加:
# listen_addresses = 'localhost'  # 外部アクセス制限
# max_connections = 100
# shared_buffers = 256MB
# effective_cache_size = 1GB
# work_mem = 4MB
# maintenance_work_mem = 64MB
# wal_buffers = 16MB
# checkpoint_completion_target = 0.9
# random_page_cost = 1.1  # SSD の場合

# 接続認証設定
sudo nano /etc/postgresql/15/main/pg_hba.conf

# local 接続をpeer認証からmd5認証に変更
# local   all             all                                     md5

# PostgreSQL再起動
sudo systemctl restart postgresql
sudo systemctl enable postgresql
```

### 3. アプリケーションデプロイ
```bash
# アプリケーション用ユーザー作成
sudo adduser --system --group stockanalysis
sudo mkdir -p /opt/stockanalysis
sudo chown stockanalysis:stockanalysis /opt/stockanalysis

# アプリケーションファイル配置
sudo -u stockanalysis git clone https://github.com/your-username/stock_analysis_helper.git /opt/stockanalysis/app
cd /opt/stockanalysis/app/backend

# 本番用依存関係インストール
sudo -u stockanalysis npm ci --only=production

# TypeScript ビルド
sudo -u stockanalysis npm run build
```

### 4. 本番環境変数設定
```bash
# 本番用環境変数
sudo -u stockanalysis nano /opt/stockanalysis/app/backend/.env
```

```env
# 本番環境設定
NODE_ENV=production
PORT=5001

# データベース設定
DB_HOST=localhost
DB_PORT=5432
DB_NAME=stock_analysis_prod
DB_USER=stock_prod_user
DB_PASSWORD=ultra_secure_production_password_2024!

# 認証設定（強力な秘密鍵を生成）
JWT_SECRET=production-jwt-secret-256-bit-minimum-change-this-ultra-secure-key-2024
JWT_EXPIRY=24h
BCRYPT_SALT_ROUNDS=12

# API キー（実際の本番用キー）
YAHOO_FINANCE_API_KEY=your_production_yahoo_finance_api_key
ALPHA_VANTAGE_API_KEY=your_production_alpha_vantage_api_key

# セキュリティ設定
ALLOWED_ORIGINS=https://your-domain.com,https://www.your-domain.com
FORCE_HTTPS=true
HSTS_MAX_AGE=31536000

# ログ設定
LOG_LEVEL=info
ERROR_LOG_PATH=/var/log/stockanalysis/error.log
ACCESS_LOG_PATH=/var/log/stockanalysis/access.log
```

### 5. データベース初期化（本番）
```bash
cd /opt/stockanalysis/app/backend

# 本番環境でデータベース初期化
sudo -u stockanalysis npm run db:init

# SSL設定（本番環境）
sudo -u stockanalysis psql "postgresql://stock_prod_user:password@localhost:5432/stock_analysis_prod?sslmode=require"
```

### 6. PM2 プロセス管理設定
```bash
# PM2 設定ファイル作成
sudo -u stockanalysis nano /opt/stockanalysis/app/backend/ecosystem.config.js
```

```javascript
module.exports = {
  apps: [{
    name: 'stock-analysis-api',
    script: 'dist/index.js',
    cwd: '/opt/stockanalysis/app/backend',
    instances: 'max', // CPUコア数に応じて自動設定
    exec_mode: 'cluster',
    env: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    env_production: {
      NODE_ENV: 'production',
      PORT: 5001
    },
    error_file: '/var/log/stockanalysis/pm2-error.log',
    out_file: '/var/log/stockanalysis/pm2-out.log',
    log_file: '/var/log/stockanalysis/pm2-combined.log',
    time: true,
    max_memory_restart: '1G',
    restart_delay: 5000,
    max_restarts: 10,
    min_uptime: '10s'
  }]
};
```

```bash
# ログディレクトリ作成
sudo mkdir -p /var/log/stockanalysis
sudo chown stockanalysis:stockanalysis /var/log/stockanalysis

# PM2 でアプリケーション起動
sudo -u stockanalysis pm2 start ecosystem.config.js --env production

# PM2 をシステムサービスとして登録
sudo pm2 startup systemd -u stockanalysis --hp /home/stockanalysis
sudo -u stockanalysis pm2 save
```

### 7. Nginx リバースプロキシ設定
```bash
# Nginx 設定ファイル作成
sudo nano /etc/nginx/sites-available/stockanalysis
```

```nginx
# HTTP から HTTPS リダイレクト
server {
    listen 80;
    server_name your-domain.com www.your-domain.com;
    return 301 https://$server_name$request_uri;
}

# HTTPS メインサーバー
server {
    listen 443 ssl http2;
    server_name your-domain.com www.your-domain.com;

    # SSL 証明書設定（Let's Encrypt）
    ssl_certificate /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    include /etc/letsencrypt/options-ssl-nginx.conf;
    ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem;

    # セキュリティヘッダー
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains; preload" always;
    add_header X-Frame-Options "DENY" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # API プロキシ設定
    location /api/ {
        proxy_pass http://localhost:5001/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
        
        # タイムアウト設定
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # レート制限
        limit_req zone=api burst=20 nodelay;
    }

    # 静的ファイル配信（フロントエンド）
    location / {
        root /opt/stockanalysis/app/frontend/build;
        index index.html index.htm;
        try_files $uri $uri/ /index.html;
        
        # キャッシュ設定
        location ~* \.(js|css|png|jpg|jpeg|gif|ico|svg)$ {
            expires 1y;
            add_header Cache-Control "public, immutable";
        }
    }

    # ヘルスチェック
    location /health {
        access_log off;
        return 200 "healthy\n";
        add_header Content-Type text/plain;
    }
}

# レート制限設定
http {
    limit_req_zone $binary_remote_addr zone=api:10m rate=10r/s;
    limit_req_zone $binary_remote_addr zone=global:10m rate=100r/s;
}
```

```bash
# Nginx 設定有効化
sudo ln -s /etc/nginx/sites-available/stockanalysis /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

### 8. SSL証明書取得
```bash
# Let's Encrypt SSL証明書取得
sudo certbot --nginx -d your-domain.com -d www.your-domain.com

# 自動更新設定
sudo crontab -e
# 以下を追加:
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### 9. ファイアウォール設定
```bash
# UFW ファイアウォール設定
sudo ufw enable
sudo ufw default deny incoming
sudo ufw default allow outgoing

# 必要なポート開放
sudo ufw allow ssh
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# データベースは内部通信のみ
sudo ufw deny 5432/tcp

# ファイアウォール状態確認
sudo ufw status verbose
```

## フロントエンド本番ビルド・デプロイ

### 1. フロントエンドビルド
```bash
cd /opt/stockanalysis/app/frontend

# 本番用環境変数設定
sudo -u stockanalysis nano .env.production
```

```env
REACT_APP_API_BASE_URL=https://your-domain.com/api
REACT_APP_ENVIRONMENT=production
REACT_APP_VERSION=2.0.0
```

```bash
# 依存関係インストール
sudo -u stockanalysis npm ci

# 本番ビルド
sudo -u stockanalysis npm run build

# ビルドファイルの権限設定
sudo chown -R stockanalysis:stockanalysis build/
```

### 2. 静的ファイル最適化
```bash
# Gzip圧縮有効化
sudo nano /etc/nginx/nginx.conf

# http ブロック内に追加:
gzip on;
gzip_vary on;
gzip_min_length 1024;
gzip_types
    text/plain
    text/css
    text/xml
    text/javascript
    application/javascript
    application/xml+rss
    application/json;
```

## 監視・ログ設定

### 1. ログローテーション設定
```bash
# logrotate 設定
sudo nano /etc/logrotate.d/stockanalysis
```

```
/var/log/stockanalysis/*.log {
    daily
    missingok
    rotate 52
    compress
    delaycompress
    notifempty
    create 644 stockanalysis stockanalysis
    postrotate
        pm2 reload stock-analysis-api
    endscript
}
```

### 2. システム監視設定
```bash
# システム監視スクリプト
sudo nano /opt/stockanalysis/scripts/health-check.sh
```

```bash
#!/bin/bash

# ヘルスチェックスクリプト
HEALTH_URL="https://your-domain.com/api/health"
LOG_FILE="/var/log/stockanalysis/health-check.log"

# API ヘルスチェック
response=$(curl -s -o /dev/null -w "%{http_code}" $HEALTH_URL)

if [ $response -eq 200 ]; then
    echo "$(date): API Health Check OK" >> $LOG_FILE
else
    echo "$(date): API Health Check FAILED - HTTP $response" >> $LOG_FILE
    # アラート送信（メール、Slack等）
    echo "API down on $(hostname)" | mail -s "StockAnalysis API Alert" admin@your-domain.com
fi

# データベース接続チェック
sudo -u stockanalysis psql "postgresql://stock_prod_user:password@localhost:5432/stock_analysis_prod" -c "SELECT 1;" > /dev/null 2>&1

if [ $? -eq 0 ]; then
    echo "$(date): Database Health Check OK" >> $LOG_FILE
else
    echo "$(date): Database Health Check FAILED" >> $LOG_FILE
    echo "Database connection failed on $(hostname)" | mail -s "StockAnalysis DB Alert" admin@your-domain.com
fi
```

```bash
# 実行権限付与
sudo chmod +x /opt/stockanalysis/scripts/health-check.sh

# cron設定（5分間隔でヘルスチェック）
sudo crontab -e
# 以下を追加:
# */5 * * * * /opt/stockanalysis/scripts/health-check.sh
```

### 3. パフォーマンス監視
```bash
# PM2 モニタリング
sudo -u stockanalysis pm2 install pm2-logrotate
sudo -u stockanalysis pm2 set pm2-logrotate:max_size 100M
sudo -u stockanalysis pm2 set pm2-logrotate:retain 30

# PM2 監視ダッシュボード（オプション）
sudo -u stockanalysis pm2 install pm2-server-monit
```

## セキュリティ強化設定

### 1. fail2ban設定（ブルートフォース攻撃対策）
```bash
# fail2ban インストール
sudo apt install -y fail2ban

# 設定ファイル作成
sudo nano /etc/fail2ban/jail.local
```

```ini
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 5

[sshd]
enabled = true

[nginx-http-auth]
enabled = true

[nginx-limit-req]
enabled = true
filter = nginx-limit-req
action = iptables-multiport[name=ReqLimit, port="http,https", protocol=tcp]
logpath = /var/log/nginx/error.log
findtime = 600
bantime = 3600
maxretry = 10
```

```bash
sudo systemctl enable fail2ban
sudo systemctl start fail2ban
```

### 2. 自動セキュリティ更新
```bash
# unattended-upgrades インストール
sudo apt install -y unattended-upgrades

# 設定
sudo dpkg-reconfigure -plow unattended-upgrades

# 設定ファイル編集
sudo nano /etc/apt/apt.conf.d/50unattended-upgrades
```

### 3. セキュリティスキャン
```bash
# セキュリティスキャンスクリプト
sudo nano /opt/stockanalysis/scripts/security-scan.sh
```

```bash
#!/bin/bash

echo "$(date): Starting security scan" >> /var/log/stockanalysis/security.log

# npm audit
cd /opt/stockanalysis/app/backend
npm audit --audit-level moderate >> /var/log/stockanalysis/security.log 2>&1

# システム更新チェック
apt list --upgradable >> /var/log/stockanalysis/security.log 2>&1

# ファイル権限チェック
find /opt/stockanalysis -type f -perm /o+w >> /var/log/stockanalysis/security.log 2>&1

echo "$(date): Security scan completed" >> /var/log/stockanalysis/security.log
```

## バックアップ・復旧

### 1. データベースバックアップ
```bash
# バックアップスクリプト
sudo nano /opt/stockanalysis/scripts/backup-db.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backup/stockanalysis"
DATE=$(date +%Y%m%d_%H%M%S)
DB_NAME="stock_analysis_prod"
DB_USER="stock_prod_user"

# バックアップディレクトリ作成
mkdir -p $BACKUP_DIR

# データベースダンプ
pg_dump -h localhost -U $DB_USER -d $DB_NAME | gzip > $BACKUP_DIR/db_backup_$DATE.sql.gz

# 古いバックアップ削除（30日以上）
find $BACKUP_DIR -name "db_backup_*.sql.gz" -mtime +30 -delete

echo "$(date): Database backup completed - db_backup_$DATE.sql.gz" >> /var/log/stockanalysis/backup.log
```

```bash
# 実行権限付与
sudo chmod +x /opt/stockanalysis/scripts/backup-db.sh

# 日次バックアップ設定
sudo crontab -e
# 以下を追加:
# 0 2 * * * /opt/stockanalysis/scripts/backup-db.sh
```

### 2. アプリケーションバックアップ
```bash
# アプリケーションファイルバックアップ
sudo nano /opt/stockanalysis/scripts/backup-app.sh
```

```bash
#!/bin/bash

BACKUP_DIR="/backup/stockanalysis"
DATE=$(date +%Y%m%d_%H%M%S)
APP_DIR="/opt/stockanalysis/app"

# アプリケーションファイルアーカイブ
tar -czf $BACKUP_DIR/app_backup_$DATE.tar.gz -C /opt/stockanalysis app --exclude=node_modules --exclude=.git

# 古いバックアップ削除（7日以上）
find $BACKUP_DIR -name "app_backup_*.tar.gz" -mtime +7 -delete

echo "$(date): Application backup completed - app_backup_$DATE.tar.gz" >> /var/log/stockanalysis/backup.log
```

### 3. 復旧手順書
```bash
# 復旧手順書作成
sudo nano /opt/stockanalysis/docs/disaster-recovery.md
```

## トラブルシューティング

### よくある問題と解決方法

#### 1. データベース接続エラー
```bash
# 症状: Error: connect ECONNREFUSED 127.0.0.1:5432
# 確認事項:
sudo systemctl status postgresql
sudo -u postgres psql -c "SELECT version();"

# 接続設定確認
sudo nano /etc/postgresql/15/main/postgresql.conf
sudo nano /etc/postgresql/15/main/pg_hba.conf
```

#### 2. API レスポンス遅延
```bash
# パフォーマンス確認
sudo -u stockanalysis pm2 monit

# ログ確認
tail -f /var/log/stockanalysis/pm2-combined.log

# データベースクエリ確認
sudo -u postgres psql stock_analysis_prod -c "
SELECT query, state, query_start 
FROM pg_stat_activity 
WHERE state = 'active';
"
```

#### 3. SSL証明書期限切れ
```bash
# 証明書確認
sudo certbot certificates

# 手動更新
sudo certbot renew

# 自動更新確認
sudo systemctl status certbot.timer
```

#### 4. メモリ不足
```bash
# メモリ使用量確認
free -h
sudo -u stockanalysis pm2 list

# PM2 メモリ制限設定確認
sudo nano /opt/stockanalysis/app/backend/ecosystem.config.js
# max_memory_restart: '1G' を調整
```

## パフォーマンス最適化

### 1. データベース最適化
```sql
-- インデックス使用状況確認
SELECT schemaname,tablename,indexname,idx_tup_read,idx_tup_fetch 
FROM pg_stat_user_indexes 
ORDER BY idx_tup_read DESC;

-- テーブル統計更新
ANALYZE;

-- 不要データクリーンアップ
VACUUM ANALYZE;
```

### 2. Node.js最適化
```bash
# PM2設定最適化
sudo -u stockanalysis nano /opt/stockanalysis/app/backend/ecosystem.config.js

# CPU コア数に応じてインスタンス数調整
# instances: 'max' または具体的な数値
```

### 3. Nginx最適化
```nginx
# /etc/nginx/nginx.conf
worker_processes auto;
worker_rlimit_nofile 65535;

events {
    worker_connections 2048;
    use epoll;
    multi_accept on;
}

http {
    # キープアライブ最適化
    keepalive_timeout 65;
    keepalive_requests 100;
    
    # バッファサイズ最適化
    client_body_buffer_size 16K;
    client_header_buffer_size 1k;
    large_client_header_buffers 4 16k;
    client_max_body_size 10m;
}
```

## 運用監視チェックリスト

### 日次チェック項目
- [ ] API ヘルスチェック応答確認
- [ ] データベース接続確認
- [ ] PM2 プロセス状態確認
- [ ] エラーログ確認
- [ ] SSL証明書有効期限確認（30日前から）

### 週次チェック項目
- [ ] システムリソース使用量確認
- [ ] セキュリティアップデート確認
- [ ] バックアップ完了確認
- [ ] パフォーマンスメトリクス確認
- [ ] 外部API使用量確認

### 月次チェック項目
- [ ] 依存関係脆弱性スキャン
- [ ] ログファイルローテーション確認
- [ ] データベース統計更新
- [ ] 災害復旧手順テスト
- [ ] セキュリティ設定レビュー

この包括的なデプロイメントガイドにより、開発環境から本番環境まで安全で安定したStockAnalysis Helperの運用が可能です。