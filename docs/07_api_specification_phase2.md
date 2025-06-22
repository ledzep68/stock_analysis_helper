# API仕様書 (Phase 2)

## 概要

Phase 2では、Phase 1のMVP APIを大幅に拡張し、永続データストレージ、詳細分析機能、ユーザー管理機能を提供するAPIを実装しました。本ドキュメントでは、全25個のAPIエンドポイントの詳細仕様を記載します。

## 基本情報

### ベースURL
- **開発環境**: `http://localhost:5001/api`
- **本番環境**: `https://your-domain.com/api`

### 認証方式
- **認証方式**: JWT Bearer Token
- **トークン形式**: `Authorization: Bearer <token>`
- **有効期限**: 24時間

### レスポンス形式
全APIは以下の統一レスポンス形式を使用：

```json
{
  "success": boolean,
  "data": object | array | null,
  "error": string | null,
  "timestamp": string (ISO 8601)
}
```

### レート制限
- **一般API**: 15分間で100リクエスト
- **認証API**: 15分間で5リクエスト
- **分析API**: 15分間で30リクエスト

## 認証API (/api/auth)

### POST /api/auth/register
**説明**: 新規ユーザー登録

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!",
  "username": "optional_username"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "optional_username",
      "createdAt": "2024-06-16T10:00:00Z"
    },
    "token": "jwt_token_string",
    "message": "User registered successfully"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

**エラーレスポンス**:
- 400: 無効な入力データ
- 409: 既存ユーザーとの競合

**パスワード要件**:
- 最低8文字
- 大文字・小文字・数字・特殊文字を含む

### POST /api/auth/login
**説明**: ユーザーログイン

**リクエスト**:
```json
{
  "email": "user@example.com",
  "password": "SecurePass123!"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "lastLogin": "2024-06-16T10:00:00Z"
    },
    "token": "jwt_token_string",
    "message": "Login successful"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

**エラーレスポンス**:
- 401: 認証失敗
- 423: アカウントロック中

### GET /api/auth/me
**説明**: 現在のユーザー情報取得  
**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username",
      "createdAt": "2024-06-16T09:00:00Z",
      "lastLogin": "2024-06-16T10:00:00Z"
    }
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### POST /api/auth/logout
**説明**: ログアウト（セッション無効化）  
**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "message": "Logout successful"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### POST /api/auth/refresh
**説明**: トークン更新  
**認証**: 必須

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "token": "new_jwt_token_string",
    "user": {
      "id": "uuid",
      "email": "user@example.com",
      "username": "username"
    },
    "message": "Token refreshed successfully"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### POST /api/auth/change-password
**説明**: パスワード変更  
**認証**: 必須

**リクエスト**:
```json
{
  "currentPassword": "OldPass123!",
  "newPassword": "NewPass123!"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "message": "Password changed successfully. Please log in again with your new password."
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

## 企業情報API (/api/companies)

### GET /api/companies/search
**説明**: 企業検索（Phase 1からの継続）

**パラメータ**:
- `query` (string): 検索クエリ

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "companies": [
      {
        "symbol": "AAPL",
        "name": "Apple Inc.",
        "industry": "Consumer Electronics",
        "sector": "Technology",
        "currentPrice": 150.25,
        "changePercent": 2.5,
        "marketCap": 2500000000000
      }
    ],
    "totalCount": 1
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### GET /api/companies/:symbol
**説明**: 企業詳細情報取得

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "company": {
      "symbol": "AAPL",
      "name": "Apple Inc.",
      "industry": "Consumer Electronics",
      "sector": "Technology",
      "country": "US",
      "description": "Apple Inc. designs, manufactures, and markets smartphones...",
      "website": "https://www.apple.com",
      "employees": 164000,
      "foundedYear": 1976
    },
    "currentPrice": {
      "price": 150.25,
      "change": 2.15,
      "changePercent": 1.45,
      "volume": 85000000,
      "marketCap": 2500000000000,
      "lastUpdated": "2024-06-16T09:30:00Z"
    }
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

## お気に入りAPI (/api/favorites)

### GET /api/favorites
**説明**: ユーザーのお気に入りリスト取得  
**認証**: 必須

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "favorites": [
      {
        "id": "uuid",
        "symbol": "AAPL",
        "companyName": "Apple Inc.",
        "addedAt": "2024-06-16T09:00:00Z",
        "notes": "長期保有予定",
        "priceAlertEnabled": true,
        "targetPrice": 160.00,
        "alertType": "above"
      }
    ],
    "count": 1
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### POST /api/favorites
**説明**: お気に入り企業追加  
**認証**: 必須

**リクエスト**:
```json
{
  "symbol": "AAPL",
  "notes": "長期保有予定",
  "priceAlertEnabled": true,
  "targetPrice": 160.00,
  "alertType": "above"
}
```

**レスポンス**:
```json
{
  "success": true,
  "data": {
    "favorite": {
      "id": "uuid",
      "userId": "user_uuid",
      "symbol": "AAPL",
      "addedAt": "2024-06-16T10:00:00Z",
      "notes": "長期保有予定",
      "priceAlertEnabled": true,
      "targetPrice": 160.00,
      "alertType": "above"
    }
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### GET /api/favorites/:symbol
**説明**: 特定お気に入りの詳細取得  
**認証**: 必須

### PUT /api/favorites/:symbol/notes
**説明**: お気に入りのメモ更新  
**認証**: 必須

**リクエスト**:
```json
{
  "notes": "更新されたメモ"
}
```

### PUT /api/favorites/:symbol/alert
**説明**: 価格アラート設定更新  
**認証**: 必須

**リクエスト**:
```json
{
  "enabled": true,
  "targetPrice": 165.00,
  "alertType": "above"
}
```

### DELETE /api/favorites/:symbol
**説明**: お気に入りから削除  
**認証**: 必須

## 詳細分析API (/api/analysis)

### GET /api/analysis/:symbol/detailed
**説明**: 詳細財務データ取得

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "currentPrice": 150.25,
    "marketCap": 2500000000000,
    "peRatio": 25.3,
    "pbRatio": 6.2,
    "eps": 5.94,
    "roe": 15.8,
    "roa": 10.2,
    "dividendYield": 0.6,
    "debtToEquity": 0.3,
    "currentRatio": 1.5,
    "grossMargin": 38.2,
    "operatingMargin": 25.1,
    "netMargin": 21.0,
    "revenueGrowth": 8.5,
    "earningsGrowth": 12.3,
    "week52High": 175.00,
    "week52Low": 125.50,
    "lastUpdated": "2024-06-16T09:30:00Z",
    "disclaimer": "本情報は投資の参考資料であり、投資助言ではありません。最終的な投資判断はご自身の責任でお願いいたします。",
    "dataSource": "Yahoo Finance API"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### GET /api/analysis/:symbol/ratios
**説明**: 財務比率分析

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "profitabilityRatios": {
      "grossMargin": { "value": 38.2, "rating": "Good", "benchmark": 35.0 },
      "operatingMargin": { "value": 25.1, "rating": "Excellent", "benchmark": 20.0 },
      "netMargin": { "value": 21.0, "rating": "Excellent", "benchmark": 15.0 },
      "roe": { "value": 15.8, "rating": "Good", "benchmark": 15.0 },
      "roa": { "value": 10.2, "rating": "Good", "benchmark": 8.0 }
    },
    "valuationRatios": {
      "peRatio": { "value": 25.3, "rating": "Average", "benchmark": 22.0 },
      "pbRatio": { "value": 6.2, "rating": "Poor", "benchmark": 3.8 }
    },
    "overallScore": 75,
    "overallRating": "Buy",
    "strengths": ["優秀な営業利益率", "健全な流動比率"],
    "weaknesses": ["PBRが割高"],
    "recommendations": ["参考：良好な財務指標を示しており、投資検討の価値があります"],
    "disclaimer": "本分析は投資の参考資料であり、投資助言ではありません。"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### GET /api/analysis/:symbol/dcf
**説明**: DCF（割引キャッシュフロー）分析

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "currentPrice": 150.25,
    "estimatedFairValue": 165.80,
    "upside": 10.4,
    "confidenceLevel": "High",
    "assumptions": {
      "revenueGrowthRate": 0.08,
      "terminalGrowthRate": 0.025,
      "discountRate": 0.10,
      "yearsProjected": 5
    },
    "projectedCashFlows": [
      {
        "year": 1,
        "revenue": 400000000000,
        "freeCashFlow": 84000000000,
        "presentValue": 76363636364
      }
    ],
    "terminalValue": 918181818182,
    "totalPresentValue": 1200000000000,
    "intrinsicValue": 165.80,
    "marginOfSafety": 9.4,
    "scenario": {
      "bull": { "fairValue": 185.20, "upside": 23.3 },
      "base": { "fairValue": 165.80, "upside": 10.4 },
      "bear": { "fairValue": 145.60, "upside": -3.1 }
    },
    "disclaimer": "本DCF分析は投資の参考資料であり、投資助言ではありません。"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### GET /api/analysis/:symbol/summary
**説明**: 総合投資分析サマリー

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "currentPrice": 150.25,
    "analysis": {
      "financial": {
        "overallScore": 75,
        "overallRating": "Buy",
        "strengths": ["優秀な営業利益率", "健全な流動比率"],
        "weaknesses": ["PBRが割高"],
        "keyMetrics": {
          "peRatio": 25.3,
          "pbRatio": 6.2,
          "roe": 15.8,
          "debtToEquity": 0.3,
          "dividendYield": 0.6
        }
      },
      "valuation": {
        "currentPrice": 150.25,
        "estimatedFairValue": 165.80,
        "upside": 10.4,
        "marginOfSafety": 9.4,
        "confidenceLevel": "High"
      },
      "recommendation": {
        "overall": "Buy",
        "reasoning": ["参考：良好な財務指標を示しており、投資検討の価値があります"],
        "riskLevel": "Low",
        "timeHorizon": "中長期（1年以上）での保有を前提とした分析",
        "nextSteps": [
          "最新の決算発表内容を確認",
          "業界動向と競合他社の分析",
          "投資目的と自身のリスク許容度を考慮"
        ]
      }
    },
    "disclaimer": "本分析結果は投資の参考資料であり、投資助言ではありません。"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

## 業界比較API (/api/industry)

### GET /api/industry/:symbol/comparison
**説明**: 包括的業界比較分析

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "companyName": "Apple Inc.",
    "industry": "Consumer Electronics",
    "sector": "Technology",
    "companyMetrics": {
      "marketCap": 2500000000000,
      "peRatio": 25.3,
      "roe": 15.8,
      "dividendYield": 0.6,
      "netMargin": 21.0
    },
    "industryBenchmarks": {
      "industry": "Consumer Electronics",
      "sampleSize": 25,
      "metrics": {
        "avgPeRatio": 22.0,
        "medianPeRatio": 20.5,
        "avgRoe": 15.0,
        "medianRoe": 14.2,
        "avgNetMargin": 15.0,
        "medianNetMargin": 13.8
      }
    },
    "comparison": {
      "industryPercentile": {
        "peRatio": 25,
        "roe": 75,
        "netMargin": 90
      },
      "overallRating": "Above Average",
      "investmentRecommendation": "Buy",
      "strengthsVsIndustry": ["純利益率が業界上位"],
      "competitiveAdvantages": ["高い利益率による価格競争力"]
    },
    "disclaimer": "本業界比較分析は投資の参考資料であり、投資助言ではありません。"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### GET /api/industry/:symbol/ranking
**説明**: 業界内ランキング

### GET /api/industry/:symbol/competitors
**説明**: 競合他社分析

**パラメータ**:
- `limit` (number, optional): 競合企業数（最大10、デフォルト5）

### GET /api/industry/:symbol/benchmarks
**説明**: 業界・セクターベンチマーク

## ユーザー設定API (/api/settings)

### GET /api/settings
**説明**: ユーザー設定取得  
**認証**: 必須

**レスポンス例**:
```json
{
  "success": true,
  "data": {
    "settings": {
      "userId": "uuid",
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
        "weeklyReports": true,
        "emailNotifications": false
      },
      "dashboard": {
        "defaultView": "overview",
        "chartsDefaultPeriod": "1M",
        "showAdvancedMetrics": false,
        "favoriteMetrics": ["peRatio", "roe", "dividendYield"]
      },
      "analysis": {
        "defaultAnalysisType": "basic",
        "includeIndustryComparison": true,
        "riskTolerance": "moderate",
        "investmentHorizon": "medium"
      }
    },
    "lastUpdated": "2024-06-16T09:00:00Z"
  },
  "timestamp": "2024-06-16T10:00:00Z"
}
```

### PUT /api/settings
**説明**: ユーザー設定更新  
**認証**: 必須

**リクエスト例**:
```json
{
  "preferences": {
    "theme": "dark",
    "displayCurrency": "USD"
  },
  "notifications": {
    "priceAlerts": false
  }
}
```

### POST /api/settings/reset
**説明**: 設定をデフォルトにリセット  
**認証**: 必須

### GET /api/settings/export
**説明**: 設定データエクスポート  
**認証**: 必須

### POST /api/settings/import
**説明**: 設定データインポート  
**認証**: 必須

### 設定カテゴリ別API

#### GET /api/settings/preferences
#### PUT /api/settings/preferences
#### GET /api/settings/notifications
#### PUT /api/settings/notifications
#### GET /api/settings/dashboard
#### PUT /api/settings/dashboard

## ヘルスチェックAPI

### GET /api/health
**説明**: サーバーヘルスチェック

**レスポンス**:
```json
{
  "status": "OK",
  "message": "StockAnalysis Helper API is running"
}
```

## エラーレスポンス

### エラーコード一覧

| コード | 説明 | 例 |
|--------|------|-----|
| 400 | Bad Request | 無効なリクエストパラメータ |
| 401 | Unauthorized | 認証トークンが無効または期限切れ |
| 403 | Forbidden | アクセス権限なし |
| 404 | Not Found | リソースが見つからない |
| 409 | Conflict | データの競合（重複登録など） |
| 422 | Unprocessable Entity | バリデーションエラー |
| 423 | Locked | アカウントロック中 |
| 429 | Too Many Requests | レート制限超過 |
| 500 | Internal Server Error | サーバー内部エラー |

### エラーレスポンス形式

```json
{
  "success": false,
  "error": "エラーメッセージ",
  "timestamp": "2024-06-16T10:00:00Z"
}
```

## レート制限詳細

### 制限レベル

1. **一般制限**: 15分間で100リクエスト
   - 対象: 全エンドポイント
   - ヘッダー: `X-RateLimit-Limit`, `X-RateLimit-Remaining`

2. **API制限**: 1分間で20リクエスト
   - 対象: `/api/*` エンドポイント
   - より厳しい制限

3. **認証制限**: 15分間で5リクエスト
   - 対象: `/api/auth/*` エンドポイント
   - セキュリティ目的

4. **分析制限**: 15分間で30リクエスト
   - 対象: `/api/analysis/*` エンドポイント
   - 計算集約的処理のため

### 制限超過時のレスポンス

```json
{
  "success": false,
  "error": "Rate limit exceeded. Please try again later.",
  "timestamp": "2024-06-16T10:00:00Z"
}
```

## セキュリティ考慮事項

### 入力検証
- 全パラメータでサニタイゼーション実施
- SQL インジェクション対策
- XSS 攻撃防御

### 認証・認可
- JWT トークンによる状態管理
- トークン有効期限: 24時間
- セッション管理でセキュリティ強化

### データ保護
- パスワードのbcryptハッシュ化
- 機密データの暗号化
- HTTPS通信強制（本番環境）

### 法的コンプライアンス
- 全分析結果に免責事項付与
- 投資助言業法遵守の表現使用
- 参考情報としての位置づけ明示

この包括的なAPI仕様により、フロントエンド開発者は安全で効率的なクライアントアプリケーションを構築できます。