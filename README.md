# StockAnalysis Helper

株式投資分析支援Webアプリケーション

## プロジェクト構成

```
stock_analysis_helper/
├── backend/          # Node.js + Express API サーバー
├── frontend/         # React TypeScript フロントエンド
├── shared/           # 共通の型定義・ユーティリティ
├── docs/             # ドキュメント
└── scripts/          # ビルド・デプロイスクリプト
```

## セットアップ

### バックエンド

```bash
cd backend
npm install
npm run dev
```

### フロントエンド

```bash
cd frontend
npm install
npm start
```

## 開発ステータス

### Phase 1 (MVP) - ✅ 完了
- [x] プロジェクト構造の初期化
- [x] 基本的な企業検索機能
- [x] 主要財務指標の表示
- [x] 簡易投資判定
- [x] 現在株価表示

### Phase 2 - 計画中
- [ ] お気に入り機能
- [ ] 詳細財務分析
- [ ] 業界比較機能
- [ ] ユーザー設定

## 設計ドキュメント

各設計要素の思想と判断根拠については、[docs/](./docs/) ディレクトリを参照してください：

- [アーキテクチャ設計思想](./docs/01_architecture_design.md)
- [API設計思想](./docs/02_api_design.md)
- [フロントエンド設計思想](./docs/03_frontend_design.md)
- [データモデル設計思想](./docs/04_data_model_design.md)
- [セキュリティ設計思想](./docs/05_security_design.md)
- [UI/UX設計思想](./docs/06_uiux_design.md)

## API Keys 設定

`backend/.env` ファイルに以下のAPIキーを設定してください：

```env
YAHOO_FINANCE_API_KEY=your_api_key_here
ALPHA_VANTAGE_API_KEY=your_api_key_here
```

## 実行方法

### 開発環境での起動

1. **バックエンド起動**
```bash
cd backend
npm run dev
```

2. **フロントエンド起動** (別ターミナル)
```bash
cd frontend
npm start
```

3. **アクセス**
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:5000

## 機能概要

- **企業検索**: Yahoo Finance APIを使用した銘柄検索
- **リアルタイム株価**: 現在価格と変動率の表示
- **財務指標**: PER、EPS、配当利回り等の主要指標
- **投資判定**: 基本的なテクニカル・ファンダメンタル分析
- **レスポンシブUI**: デスクトップ・タブレット・モバイル対応

## 法的事項

**重要**: このアプリケーションは投資の参考情報を提供するものであり、投資助言業ではありません。
最終的な投資判断はユーザーの責任で行ってください。