# データモデル設計思想

## 1. データモデル設計原則

### 1.1 設計思想
StockAnalysis Helperのデータモデルは、**金融データの正確性**と**型安全性**を最優先に、以下の原則で設計されています：

#### 核心設計原則
1. **型安全性**: TypeScriptの強力な型システムを最大活用
2. **データ整合性**: 外部APIデータの正規化と検証
3. **拡張性**: 将来的な機能追加に対応可能な柔軟性
4. **可読性**: 金融用語と開発者にとって理解しやすい命名

### 1.2 型定義の階層構造

```
Core Types (基本型)
├── Company (企業基本情報)
├── FinancialData (株価・基本指標)
├── FinancialMetrics (詳細財務指標)
├── InvestmentJudgment (投資判定)
└── ApiResponse<T> (API統一レスポンス)
```

## 2. 基本データモデル

### 2.1 Company (企業基本情報)

```typescript
export interface Company {
  symbol: string;        // 銘柄コード（一意識別子）
  name: string;          // 企業名
  industry: string;      // 業界
  sector: string;        // セクター
  country: string;       // 国・地域
  marketCap: number;     // 時価総額
}
```

#### 設計判断
- **symbol**: 主キーとして使用、検索・取得の基準
- **name**: ユーザー表示用の企業名
- **industry/sector**: 将来の業界比較機能で使用
- **country**: 為替影響分析で使用予定
- **marketCap**: 企業規模による分類で使用

#### データソースマッピング
```typescript
// Yahoo Finance API → Company変換
const mapToCompany = (quote: YahooQuote): Company => ({
  symbol: quote.symbol,
  name: quote.longname || quote.shortname || quote.symbol,
  industry: quote.industry || 'Unknown',
  sector: quote.sector || 'Unknown', 
  country: quote.region || 'Unknown',
  marketCap: quote.marketCap || 0
});
```

### 2.2 FinancialData (株価・基本指標)

```typescript
export interface FinancialData {
  symbol: string;         // 銘柄コード
  price: number;          // 現在株価
  previousClose: number;  // 前日終値
  change: number;         // 変動額
  changePercent: number;  // 変動率(%)
  volume: number;         // 出来高
  avgVolume: number;      // 平均出来高
  marketCap: number;      // 時価総額
  pe: number;             // PER（株価収益率）
  eps: number;            // EPS（1株当たり純利益）
  dividendYield: number;  // 配当利回り
  week52High: number;     // 52週高値
  week52Low: number;      // 52週安値
}
```

#### 設計判断の詳細

**価格関連フィールド**
- `price`: メイン表示用の現在価格
- `change/changePercent`: トレンド表示とアラート用
- `previousClose`: 比較基準値

**出来高関連フィールド**
- `volume`: 当日の流動性指標
- `avgVolume`: 異常出来高検知用

**投資指標フィールド**
- `pe`: バリュエーション判定の主要指標
- `eps`: 企業収益力の基本指標
- `dividendYield`: インカムゲイン重視投資家用

**レンジフィールド**
- `week52High/Low`: 現在価格の相対的位置判定

#### デフォルト値戦略
```typescript
// 外部APIでデータが取得できない場合の安全な初期値
return {
  symbol: quote.symbol,
  price: quote.regularMarketPrice || 0,          // 0: 価格不明
  previousClose: quote.regularMarketPreviousClose || 0,
  change: quote.regularMarketChange || 0,
  changePercent: quote.regularMarketChangePercent || 0,
  // ...
};
```

### 2.3 FinancialMetrics (詳細財務指標)

```typescript
export interface FinancialMetrics {
  symbol: string;         // 銘柄コード
  per: number;            // PER（株価収益率）
  pbr: number;            // PBR（株価純資産倍率）
  eps: number;            // EPS（1株当たり純利益）
  roe: number;            // ROE（自己資本利益率）
  roa: number;            // ROA（総資産利益率）
  dividendYield: number;  // 配当利回り
  debtToEquity: number;   // 負債資本比率
  currentRatio: number;   // 流動比率
  quickRatio: number;     // 当座比率
}
```

#### Phase 2での詳細分析用

この型は将来の詳細財務分析機能で使用予定。現在のFinancialDataと一部重複するが、以下の理由で分離：

1. **関心の分離**: 基本情報vs詳細分析
2. **データソース**: リアルタイムvs決算データ
3. **更新頻度**: 秒単位vs四半期

### 2.4 InvestmentJudgment (投資判定)

```typescript
export interface InvestmentJudgment {
  symbol: string;               // 銘柄コード
  recommendation: 'BUY' | 'SELL' | 'HOLD';  // 投資推奨
  confidence: number;           // 信頼度（0-100）
  targetPrice: number;          // 目標株価
  currentPrice: number;         // 現在株価
  reasons: string[];            // 判定理由
  risks: string[];              // リスク要因
}
```

#### 設計の法的配慮
- **recommendation**: 明確に3段階で限定
- **confidence**: 不確実性の明示
- **reasons/risks**: 判断根拠の透明性
- 投資助言ではなく「参考情報」として位置づけ

#### 判定ロジックの実装例
```typescript
const getInvestmentRecommendation = (data: FinancialData): InvestmentJudgment => {
  const changePercent = data.changePercent;
  const pe = data.pe;
  
  if (changePercent > 5 && pe > 0 && pe < 15) {
    return {
      symbol: data.symbol,
      recommendation: 'BUY',
      confidence: 75,
      targetPrice: data.price * 1.1,
      currentPrice: data.price,
      reasons: ['上昇トレンド', '適正PER範囲内'],
      risks: ['市場全体の下落リスク']
    };
  }
  // ... 他の条件
};
```

### 2.5 ApiResponse<T> (統一レスポンス型)

```typescript
export interface ApiResponse<T> {
  success: boolean;      // 処理成功フラグ
  data?: T;             // 成功時のデータ
  error?: string;       // エラー時のメッセージ
  timestamp: string;    // レスポンス生成時刻
}
```

#### ジェネリック型の活用理由
```typescript
// 型安全なAPI通信
const response: ApiResponse<Company[]> = await searchCompanies(query);
const singleResponse: ApiResponse<FinancialData> = await getCompanyData(symbol);
```

## 3. データフロー設計

### 3.1 データ変換パイプライン

```
外部API → Raw Data → Validation → Normalization → Type-safe Objects → UI
```

#### 各段階の役割

**1. Raw Data (外部API生データ)**
```typescript
// Yahoo Finance APIの生レスポンス
interface YahooQuoteResponse {
  quoteResponse: {
    result: YahooQuote[];
    error?: string;
  }
}
```

**2. Validation (データ検証)**
```typescript
const validateQuote = (quote: any): boolean => {
  return (
    typeof quote.symbol === 'string' &&
    typeof quote.regularMarketPrice === 'number' &&
    quote.regularMarketPrice > 0
  );
};
```

**3. Normalization (正規化)**
```typescript
const normalizeQuoteData = (quote: YahooQuote): FinancialData => {
  return {
    symbol: quote.symbol.toUpperCase(),
    price: Math.round(quote.regularMarketPrice * 100) / 100,  // 2桁丸め
    // ... 他のフィールド正規化
  };
};
```

### 3.2 エラーハンドリング戦略

#### データ欠損時の対応
```typescript
const safeNumber = (value: unknown, fallback: number = 0): number => {
  const num = Number(value);
  return isNaN(num) || !isFinite(num) ? fallback : num;
};

const mapFinancialData = (quote: YahooQuote): FinancialData => ({
  symbol: quote.symbol,
  price: safeNumber(quote.regularMarketPrice),
  pe: safeNumber(quote.trailingPE, -1),  // -1: データ不明を示す
  // ...
});
```

## 4. 将来拡張設計

### 4.1 データベース設計準備

#### Phase 2以降のテーブル設計案
```sql
-- 企業基本情報テーブル
CREATE TABLE companies (
  symbol VARCHAR(20) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  industry VARCHAR(100),
  sector VARCHAR(100),
  country VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- 株価履歴テーブル
CREATE TABLE stock_prices (
  id SERIAL PRIMARY KEY,
  symbol VARCHAR(20) REFERENCES companies(symbol),
  price DECIMAL(12,4),
  volume BIGINT,
  recorded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ユーザーお気に入りテーブル
CREATE TABLE user_favorites (
  user_id UUID,
  symbol VARCHAR(20) REFERENCES companies(symbol),
  added_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (user_id, symbol)
);
```

### 4.2 型定義の拡張計画

#### ユーザーデータ型（Phase 2予定）
```typescript
export interface User {
  id: string;
  email: string;
  preferences: UserPreferences;
  favorites: string[];  // 銘柄コードの配列
  createdAt: Date;
}

export interface UserPreferences {
  currency: 'JPY' | 'USD';
  theme: 'light' | 'dark';
  alertThreshold: number;
  language: 'ja' | 'en';
}
```

#### アラート機能型（Phase 3予定）
```typescript
export interface PriceAlert {
  id: string;
  userId: string;
  symbol: string;
  condition: 'above' | 'below';
  targetPrice: number;
  isActive: boolean;
  createdAt: Date;
}
```

## 5. データ品質管理

### 5.1 バリデーション関数

```typescript
export const validateFinancialData = (data: unknown): data is FinancialData => {
  const d = data as FinancialData;
  return (
    typeof d.symbol === 'string' &&
    typeof d.price === 'number' && d.price >= 0 &&
    typeof d.changePercent === 'number' &&
    typeof d.volume === 'number' && d.volume >= 0
  );
};
```

### 5.2 データ整合性チェック

```typescript
export const checkDataIntegrity = (data: FinancialData): string[] => {
  const issues: string[] = [];
  
  if (data.price <= 0) {
    issues.push('Invalid price value');
  }
  
  if (data.pe < 0 && data.pe !== -1) {  // -1 is "unknown" marker
    issues.push('Invalid PE ratio');
  }
  
  if (Math.abs(data.changePercent) > 50) {  // 50%以上の変動は要確認
    issues.push('Unusual price change detected');
  }
  
  return issues;
};
```

## 6. パフォーマンス最適化

### 6.1 データキャッシュ戦略（将来実装）

```typescript
interface CachedData<T> {
  data: T;
  timestamp: Date;
  ttl: number;  // Time to live in seconds
}

class DataCache {
  private cache = new Map<string, CachedData<any>>();
  
  set<T>(key: string, data: T, ttl: number = 300): void {
    this.cache.set(key, {
      data,
      timestamp: new Date(),
      ttl
    });
  }
  
  get<T>(key: string): T | null {
    const cached = this.cache.get(key);
    if (!cached) return null;
    
    const age = Date.now() - cached.timestamp.getTime();
    if (age > cached.ttl * 1000) {
      this.cache.delete(key);
      return null;
    }
    
    return cached.data;
  }
}
```

### 6.2 メモリ使用量最適化

```typescript
// 必要な場合のみ詳細データを取得
export interface BasicCompanyInfo {
  symbol: string;
  name: string;
  price: number;
}

export interface DetailedCompanyInfo extends BasicCompanyInfo {
  financialMetrics: FinancialMetrics;
  historicalData: HistoricalPrice[];
  analystRatings: AnalystRating[];
}
```

この設計により、型安全で拡張可能、かつ金融データの特性に配慮したデータモデルを実現しています。