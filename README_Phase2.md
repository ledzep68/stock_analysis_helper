# StockAnalysis Helper - Phase 2

## 概要

StockAnalysis Helper は、個人投資家向けの包括的な株式分析プラットフォームです。Phase 2では、Phase 1のMVPを大幅に拡張し、永続的なデータストレージ、詳細な財務分析、業界比較機能、ユーザー管理システムを実装しました。

**⚠️ 重要: 本アプリケーションは投資の参考情報を提供するものであり、投資助言ではありません。最終的な投資判断はご自身の責任で行ってください。**

## Phase 2 新機能

### 🗃️ データベース基盤
- PostgreSQL による永続的なデータストレージ
- ユーザー管理、企業データ、財務履歴の管理
- Row Level Security による強固なデータ分離

### ⭐ お気に入り機能
- 注目企業のお気に入り登録・管理
- カスタムメモ機能
- 価格アラート設定（上値・下値・変動率）

### 📊 詳細財務分析
- 詳細財務データ表示（ROE、ROA、各種利益率等）
- 財務比率分析と業界ベンチマーク比較
- DCF（割引キャッシュフロー）による企業価値評価
- シナリオ分析（強気・基準・弱気）

### 🏭 業界比較機能
- 業界内でのポジション分析
- 競合他社との詳細比較
- 業界ベンチマークとのパーセンタイル評価
- セクター・業界ランキング

### ⚙️ ユーザー設定
- 表示通貨・言語・テーマ設定
- 通知・アラート設定
- ダッシュボードカスタマイズ
- 分析設定の個別調整

### 🔐 認証システム
- JWT ベースの安全な認証機能
- パスワード強度検証
- セッション管理とセキュリティ対策
- アカウントロック機能

## 技術スタック

### バックエンド
- **Runtime**: Node.js 20.x
- **Framework**: Express.js 4.x
- **Language**: TypeScript 5.x
- **Database**: PostgreSQL 15.x
- **Authentication**: JWT + bcrypt
- **Security**: Helmet.js, express-rate-limit

### フロントエンド（Phase 1 継続）
- **Framework**: React 18.x
- **Language**: TypeScript 5.x
- **UI Library**: Material-UI 5.x
- **HTTP Client**: Axios
- **Charts**: Chart.js / Recharts

### セキュリティ・運用
- **SSL/TLS**: Let's Encrypt
- **Reverse Proxy**: Nginx
- **Process Manager**: PM2
- **Monitoring**: システムヘルスチェック
- **Backup**: 自動データベースバックアップ

## インストール・セットアップ

### 前提条件
- Node.js 18.x 以上
- PostgreSQL 12.x 以上
- npm 9.x 以上

### 1. リポジトリクローン
```bash
git clone https://github.com/your-username/stock_analysis_helper.git
cd stock_analysis_helper
```

### 2. バックエンドセットアップ
```bash
cd backend

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env
# .env ファイルを編集してデータベース接続情報等を設定

# データベース初期化
npm run db:init

# 開発サーバー起動
npm run dev
```

### 3. フロントエンドセットアップ
```bash
cd frontend

# 依存関係インストール
npm install

# 環境変数設定
cp .env.example .env.local

# 開発サーバー起動
npm start
```

### 4. 動作確認
- バックエンド: http://localhost:5001/api/health
- フロントエンド: http://localhost:3000

## API エンドポイント

### 認証 API
- `POST /api/auth/register` - 新規ユーザー登録
- `POST /api/auth/login` - ログイン
- `GET /api/auth/me` - ユーザー情報取得
- `POST /api/auth/logout` - ログアウト

### 企業情報 API
- `GET /api/companies/search` - 企業検索
- `GET /api/companies/:symbol` - 企業詳細情報

### お気に入り API
- `GET /api/favorites` - お気に入りリスト取得
- `POST /api/favorites` - お気に入り追加
- `DELETE /api/favorites/:symbol` - お気に入り削除

### 詳細分析 API
- `GET /api/analysis/:symbol/detailed` - 詳細財務データ
- `GET /api/analysis/:symbol/ratios` - 財務比率分析
- `GET /api/analysis/:symbol/dcf` - DCF分析
- `GET /api/analysis/:symbol/summary` - 総合投資分析

### 業界比較 API
- `GET /api/industry/:symbol/comparison` - 業界比較分析
- `GET /api/industry/:symbol/ranking` - 業界ランキング
- `GET /api/industry/:symbol/competitors` - 競合分析

### ユーザー設定 API
- `GET /api/settings` - 設定取得
- `PUT /api/settings` - 設定更新
- `GET /api/settings/export` - 設定エクスポート

詳細なAPI仕様は [API仕様書](docs/07_api_specification_phase2.md) をご参照ください。

## セキュリティ機能

### 多層防御アーキテクチャ
- **入力検証**: 包括的な入力値検証・サニタイゼーション
- **XSS対策**: Content Security Policy、HTMLエスケープ
- **SQLインジェクション対策**: パラメータ化クエリ
- **レート制限**: 階層的なAPI制限（一般・認証・分析）
- **HTTPS強制**: SSL/TLS暗号化通信

### 認証・認可
- **JWT認証**: 24時間有効期限、強力な秘密鍵
- **パスワードセキュリティ**: bcrypt 12ラウンド、強度検証
- **セッション管理**: データベースベースのセッション追跡
- **アカウント保護**: ログイン試行制限、自動ロック機能

### データ保護
- **Row Level Security**: ユーザーデータの完全分離
- **データ暗号化**: パスワード・セッション情報の暗号化
- **アクセス制御**: 最小権限の原則に基づく権限設定

## 法的コンプライアンス

### 投資助言業法対応
- **免責事項**: 全分析結果に法的免責事項を明示
- **表現制限**: 投資推奨と誤解されない安全な表現を使用
- **参考情報**: 投資助言ではなく参考情報としての位置づけ

### データ利用規約遵守
- **外部API**: Yahoo Finance、Alpha Vantage 利用規約の遵守
- **使用制限**: API使用量の監視と制限機能
- **データ更新**: 適切な頻度でのデータ更新

## パフォーマンス

### 応答時間目標
- **基本データ取得**: 200ms以内
- **詳細分析**: 1秒以内
- **業界比較**: 2秒以内
- **認証処理**: 500ms以内

### スケーラビリティ
- **接続プール**: データベース接続の効率的な管理
- **レート制限**: DoS攻撃対策と安定性確保
- **インデックス最適化**: データベースクエリの高速化

## 監視・運用

### ヘルスチェック
- **API監視**: 5分間隔でのヘルスチェック
- **データベース監視**: 接続状態とパフォーマンス確認
- **セキュリティ監視**: 異常アクセスパターンの検知

### ログ管理
- **アクセスログ**: 全APIアクセスの記録
- **エラーログ**: システムエラーの詳細記録
- **セキュリティログ**: 認証・認可イベントの記録
- **ローテーション**: 自動ログローテーション設定

## 開発・テスト

### 利用可能なスクリプト

#### バックエンド
```bash
npm run dev          # 開発サーバー起動
npm run build        # TypeScript ビルド
npm run start        # 本番サーバー起動
npm run db:init      # データベース初期化
```

#### フロントエンド
```bash
npm start            # 開発サーバー起動
npm run build        # 本番ビルド
npm test             # テスト実行
```

### テスト環境
- **ユニットテスト**: Jest + TypeScript
- **統合テスト**: Supertest によるAPI テスト
- **E2Eテスト**: React Testing Library

## ドキュメント

Phase 2では包括的なドキュメントを整備しています：

- [Phase 2 実装概要](docs/Phase2_Overview.md)
- [データベース設計](docs/06_database_design_phase2.md)
- [API仕様書](docs/07_api_specification_phase2.md)
- [認証システム](docs/08_authentication_system_phase2.md)
- [セキュリティ実装](docs/09_security_implementation_phase2.md)
- [デプロイメントガイド](docs/10_deployment_setup_guide.md)

## 本番環境デプロイ

### 必要な環境変数
```env
# サーバー設定
NODE_ENV=production
PORT=5001

# データベース
DB_HOST=your-db-host
DB_NAME=stock_analysis_prod
DB_USER=your-db-user
DB_PASSWORD=your-secure-password

# 認証
JWT_SECRET=your-ultra-secure-256-bit-secret
BCRYPT_SALT_ROUNDS=12

# API キー
YAHOO_FINANCE_API_KEY=your-production-key
ALPHA_VANTAGE_API_KEY=your-production-key

# セキュリティ
ALLOWED_ORIGINS=https://your-domain.com
```

### デプロイ手順
詳細は [デプロイメントガイド](docs/10_deployment_setup_guide.md) をご参照ください。

## 今後の開発計画

### Phase 3 予定機能
- **高度な分析機能**: テクニカル分析、マクロ経済指標
- **アラート・通知機能**: リアルタイム価格アラート、決算通知
- **レポート機能**: 投資レポート生成、PDF出力
- **モバイル最適化**: PWA対応、オフライン機能

### 長期ロードマップ
- **AI分析機能**: 機械学習による投資パターン分析
- **ソーシャル機能**: ユーザー間での分析共有
- **ポートフォリオ管理**: 資産管理、パフォーマンス追跡
- **国際展開**: 米国・欧州市場対応

## コントリビューション

プロジェクトへの貢献を歓迎します！

### 開発フロー
1. このリポジトリをフォーク
2. 機能ブランチを作成 (`git checkout -b feature/amazing-feature`)
3. 変更をコミット (`git commit -m 'Add amazing feature'`)
4. ブランチにプッシュ (`git push origin feature/amazing-feature`)
5. プルリクエストを作成

### コーディング規約
- **TypeScript**: 厳密な型定義の使用
- **ESLint**: コード品質の維持
- **Prettier**: 一貫したコードフォーマット
- **コメント**: 複雑なロジックには日本語コメント

## ライセンス

このプロジェクトは MIT ライセンスの下で配布されています。詳細は [LICENSE](LICENSE) ファイルをご参照ください。

## サポート・問い合わせ

### 技術サポート
- **GitHub Issues**: バグレポート・機能要望
- **Discussions**: 一般的な質問・ディスカッション

### セキュリティ
セキュリティに関する問題を発見した場合は、GitHub Issues ではなく以下にご連絡ください：
- Email: security@your-domain.com

### 免責事項
本アプリケーションは投資の参考情報を提供するものであり、投資助言ではありません。投資判断は必ずご自身の責任で行ってください。本アプリケーションの利用によって生じた損失について、開発者は一切の責任を負いません。

---

**開発チーム**: StockAnalysis Helper Development Team  
**最終更新**: 2024年6月16日  
**バージョン**: 2.0.0