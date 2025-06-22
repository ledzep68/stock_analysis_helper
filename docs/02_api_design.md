# API設計思想

## 1. API設計原則

### 1.1 設計思想
StockAnalysis Helper APIは、**金融データの取得・加工・配信**を担う中核システムとして、以下の原則に基づいて設計されています：

#### 核心設計原則
1. **一貫性**: すべてのエンドポイントで統一されたレスポンス形式
2. **予測可能性**: RESTful原則に従った直感的なURL構造
3. **堅牢性**: 外部API障害時でも適切なエラーハンドリング
4. **拡張性**: 将来の機能追加に対応可能な柔軟な設計

### 1.2 RESTful設計の採用理由

#### 選択理由
- **標準性**: HTTP標準に準拠し、フロントエンド開発者にとって理解しやすい
- **キャッシュ対応**: HTTP キャッシュメカニズムの活用可能
- **ステートレス**: 水平スケーリングが容易
- **ツール対応**: 豊富な開発・テストツールの活用

#### トレードオフ
- ✅ 理解しやすさとエコシステム対応
- ❌ GraphQLと比較したover-fetching/under-fetching

## 2. エンドポイント設計

### 2.1 URL構造設計思想

```
/api/{version}/{resource}/{identifier?}/{action?}
```

#### 具体例
```
GET  /api/companies/search?query=Apple    # 企業検索
GET  /api/companies/AAPL                 # 特定企業の財務データ
GET  /api/health                         # ヘルスチェック
```

#### 設計判断
- **バージョニング**: `/api/` プレフィックスでバージョン管理準備
- **リソース中心**: 動詞ではなく名詞を使用
- **階層構造**: 論理的な親子関係を表現

### 2.2 HTTPメソッド使用方針

| メソッド | 用途 | 冪等性 | Phase 1での使用 |
|---------|------|--------|----------------|
| GET | データ取得 | ✓ | ✓ (検索・詳細取得) |
| POST | データ作成 | ✗ | Phase 2 (お気に入り登録) |
| PUT | データ更新/作成 | ✓ | Phase 2 (設定更新) |
| DELETE | データ削除 | ✓ | Phase 2 (お気に入り削除) |

## 3. レスポンス設計

### 3.1 統一レスポンス形式

```typescript
interface ApiResponse<T> {
  success: boolean;      // 処理成功可否
  data?: T;             // 成功時のデータ
  error?: string;       // エラー時のメッセージ
  timestamp: string;    // レスポンス生成時刻（ISO 8601）
}
```

#### 設計思想
- **統一性**: すべてのエンドポイントで同一形式
- **型安全性**: TypeScriptジェネリクスによる型保証
- **デバッグ支援**: タイムスタンプによる問題追跡支援
- **フロントエンド最適化**: success フラグによる分岐処理の簡素化

### 3.2 成功レスポンス例

```json
{
  "success": true,
  "data": {
    "symbol": "AAPL",
    "price": 150.25,
    "change": 2.5,
    "changePercent": 1.69
  },
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

### 3.3 エラーレスポンス例

```json
{
  "success": false,
  "error": "Company not found",
  "timestamp": "2025-06-15T10:30:00.000Z"
}
```

## 4. エラーハンドリング設計

### 4.1 HTTPステータスコード戦略

| コード | 意味 | 使用場面 | レスポンス例 |
|--------|------|----------|-------------|
| 200 | 成功 | 正常なデータ取得 | 企業データ返却 |
| 400 | クライアントエラー | 不正なクエリパラメータ | `"Query parameter is required"` |
| 404 | リソース未発見 | 存在しない銘柄コード | `"Company not found"` |
| 429 | レート制限 | API呼び出し上限超過 | `"Rate limit exceeded"` |
| 500 | サーバーエラー | 外部API障害等 | `"Internal server error"` |
| 503 | サービス利用不可 | 外部API完全停止 | `"Service temporarily unavailable"` |

### 4.2 エラーメッセージ設計方針

#### ユーザー向けメッセージ
- **日本語対応**: エンドユーザーが理解しやすい言語
- **具体性**: 問題の原因と対処法を示唆
- **セキュリティ配慮**: 内部システム情報の漏洩防止

#### 開発者向けログ
```typescript
console.error('Error getting company data:', {
  symbol,
  error: error.message,
  stack: error.stack,
  timestamp: new Date().toISOString()
});
```

## 5. パフォーマンス設計

### 5.1 タイムアウト設定

```typescript
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,  // 10秒タイムアウト
});
```

#### 設計判断
- **10秒設定**: 外部API遅延を考慮した現実的な値
- **要件準拠**: 30秒以内という要件に対する十分なマージン
- **ユーザー体験**: 長すぎず短すぎない適度な待機時間

### 5.2 非同期処理設計

```typescript
// すべてのAPI呼び出しでasync/awaitパターン統一
export async function getCompanyData(symbol: string): Promise<FinancialData | null> {
  try {
    const response = await axios.get(`/finance/quote`, { params: { symbols: symbol } });
    return transformData(response.data);
  } catch (error) {
    handleError(error);
    throw error;
  }
}
```

## 6. データ変換設計

### 6.1 外部APIデータの正規化

#### Yahoo Finance API → 内部形式変換
```typescript
// 外部APIの不安定なフィールド名を内部で統一
return {
  symbol: quote.symbol,
  price: quote.regularMarketPrice || 0,          // フォールバック値設定
  previousClose: quote.regularMarketPreviousClose || 0,
  change: quote.regularMarketChange || 0,
  changePercent: quote.regularMarketChangePercent || 0,
  // ...
};
```

#### 設計思想
- **安定性**: 外部API仕様変更の影響を最小化
- **デフォルト値**: 欠損データに対する適切な初期値
- **型安全性**: number型の保証

### 6.2 日本株対応

```typescript
export async function getJapaneseStockData(symbol: string): Promise<FinancialData | null> {
  // 日本株の場合、.T サフィックスを自動付与
  const japaneseSymbol = symbol.includes('.') ? symbol : `${symbol}.T`;
  return await getCompanyData(japaneseSymbol);
}
```

## 7. セキュリティ考慮

### 7.1 入力検証

```typescript
// クエリパラメータの検証
if (!query || typeof query !== 'string') {
  return res.status(400).json({
    success: false,
    error: 'Query parameter is required',
    timestamp: new Date().toISOString()
  });
}
```

### 7.2 レート制限準備

将来的な実装予定：
```typescript
// Express rate limiting middleware
import rateLimit from 'express-rate-limit';

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15分
  max: 100 // リクエスト上限
});
```

## 8. 拡張性設計

### 8.1 バージョニング戦略

#### 現在の準備
```typescript
// ルーティングでのバージョン対応準備
app.use('/api/v1', v1Router);  // 将来実装
app.use('/api', currentRouter); // 現在の実装
```

### 8.2 新機能追加パターン

#### Phase 2 予定機能
```typescript
// お気に入り管理API (予定)
POST   /api/favorites           // お気に入り追加
GET    /api/favorites           // お気に入り一覧
DELETE /api/favorites/:symbol   // お気に入り削除

// アラート機能API (予定)
POST   /api/alerts              // アラート設定
GET    /api/alerts              // アラート一覧
PUT    /api/alerts/:id          // アラート更新
```

## 9. 監視・ログ設計

### 9.1 アクセスログ

```typescript
// Morgan middleware による統一ログ形式
app.use(morgan('combined'));
```

### 9.2 エラー追跡

```typescript
// 構造化ログによる問題追跡支援
const logError = (context: string, error: Error, metadata?: object) => {
  console.error(JSON.stringify({
    context,
    message: error.message,
    stack: error.stack,
    metadata,
    timestamp: new Date().toISOString()
  }));
};
```

この設計により、保守しやすく拡張可能で、かつ堅牢なAPI層を実現しています。