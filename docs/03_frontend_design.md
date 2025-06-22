# フロントエンド設計思想

## 1. フロントエンド設計原則

### 1.1 設計思想
StockAnalysis Helperのフロントエンドは、**金融データの直感的な可視化**と**投資初心者にも理解しやすいUI**を目標として設計されています：

#### 核心設計原則
1. **ユーザビリティ第一**: 複雑な金融情報をシンプルに表示
2. **レスポンシブ性**: デスクトップ・タブレット・モバイル対応
3. **型安全性**: TypeScriptによる開発時エラー防止
4. **パフォーマンス**: 快適な操作感の実現

### 1.2 技術スタック選択理由

#### React + TypeScript
**選択理由**:
- **コンポーネント指向**: 金融データ表示の再利用可能なUI部品化
- **型安全性**: 財務計算での実行時エラー防止
- **エコシステム**: 豊富なライブラリとツール群
- **学習コスト**: 広く使われており、情報が豊富

#### Material-UI (MUI)
**選択理由**:
- **デザインシステム**: 一貫したUI/UX
- **日本語対応**: 国際化機能により日本語表示が容易
- **アクセシビリティ**: WCAG準拠のコンポーネント
- **開発効率**: プリビルトコンポーネントによる高速開発

## 2. コンポーネント設計

### 2.1 コンポーネント階層

```
App (ルートコンポーネント)
├── AppBar (共通ヘッダー)
├── CompanySearch (企業検索)
│   ├── SearchInput (検索入力)
│   ├── SearchResults (検索結果一覧)
│   └── CompanyListItem (個別企業項目)
└── FinancialSummary (財務サマリー)
    ├── PriceDisplay (株価表示)
    ├── MetricsGrid (指標一覧)
    ├── RecommendationChip (投資判定)
    └── DisclaimerAlert (免責事項)
```

### 2.2 コンポーネント設計パターン

#### 単一責任原則の適用
```typescript
// ❌ 悪い例：複数の責任を持つコンポーネント
const CompanyPage = () => {
  // 検索ロジック + 財務データ表示 + UI状態管理
};

// ✅ 良い例：単一責任の分離
const CompanySearch = ({ onCompanySelect }) => { /* 検索のみ */ };
const FinancialSummary = ({ company }) => { /* 表示のみ */ };
```

#### Props設計思想
```typescript
interface CompanySearchProps {
  onCompanySelect: (company: Company) => void;  // コールバック形式
}

interface FinancialSummaryProps {
  company: Company;  // 必要最小限のデータ
}
```

**設計判断**:
- **疎結合**: 親コンポーネントからのコールバック
- **型安全**: TypeScriptインターフェースによる契約
- **テスタビリティ**: Propsの注入により単体テスト容易

## 3. 状態管理設計

### 3.1 状態管理戦略

#### ローカル状態 (useState)
```typescript
const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);
```

**適用範囲**:
- UIの表示状態（ローディング、エラー）
- フォーム入力値
- モーダル表示/非表示

#### 理由：グローバル状態管理を避けた判断
- **Phase 1の簡素性**: Redux/Zustand等は過剰
- **状態の局所性**: コンポーネント間での状態共有が限定的
- **学習コスト**: 個人開発での複雑性回避

### 3.2 状態更新パターン

#### 非同期状態の標準パターン
```typescript
const [data, setData] = useState<T | null>(null);
const [loading, setLoading] = useState(false);
const [error, setError] = useState<string | null>(null);

const fetchData = async () => {
  setLoading(true);
  setError(null);
  try {
    const result = await apiCall();
    setData(result);
  } catch (err) {
    setError('エラーメッセージ');
  } finally {
    setLoading(false);
  }
};
```

## 4. UI/UX設計

### 4.1 レスポンシブデザイン

#### ブレークポイント戦略
```typescript
const theme = createTheme({
  breakpoints: {
    xs: 0,      // モバイル
    sm: 600,    // タブレット縦
    md: 900,    // タブレット横
    lg: 1200,   // デスクトップ
    xl: 1536,   // 大型ディスプレイ
  }
});
```

#### Material-UI Grid システム活用
```typescript
<Grid container spacing={3}>
  <Grid item xs={12} md={6}>  {/* モバイル：全幅、デスクトップ：半分 */}
    <PriceDisplay />
  </Grid>
  <Grid item xs={12} md={6}>
    <MetricsGrid />
  </Grid>
</Grid>
```

### 4.2 ユーザビリティ配慮

#### ローディング状態の視覚化
```typescript
{loading ? (
  <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
    <CircularProgress />
  </Box>
) : (
  <DataDisplay />
)}
```

#### エラーハンドリングの親和性
```typescript
{error && (
  <Alert severity="error" sx={{ mb: 2 }}>
    {error}
  </Alert>
)}
```

### 4.3 アクセシビリティ考慮

#### セマンティックHTML
```typescript
<Typography variant="h5" component="h2">  {/* SEO + スクリーンリーダー対応 */}
  {company.name} ({company.symbol})
</Typography>
```

#### キーボード操作対応
```typescript
<ListItem
  button
  onClick={() => onCompanySelect(company)}
  onKeyPress={(e) => {
    if (e.key === 'Enter') {
      onCompanySelect(company);
    }
  }}
>
```

## 5. データ表示設計

### 5.1 金融データの視覚化

#### 数値フォーマット統一
```typescript
const formatCurrency = (value: number): string => {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: 'JPY',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(value);
};
```

#### 変動表示の直感性
```typescript
const isPositiveChange = financialData.change >= 0;

<Box sx={{ display: 'flex', alignItems: 'center' }}>
  {isPositiveChange ? 
    <TrendingUp color="success" /> : 
    <TrendingDown color="error" />
  }
  <Typography color={isPositiveChange ? 'success.main' : 'error.main'}>
    {isPositiveChange ? '+' : ''}{financialData.changePercent.toFixed(2)}%
  </Typography>
</Box>
```

### 5.2 情報階層化

#### 重要度に基づくレイアウト
1. **最重要**: 現在株価と変動率（大きなフォント）
2. **重要**: 主要指標（PER、EPS等）
3. **補助情報**: 52週高値・安値、出来高
4. **法的情報**: 免責事項（目立つ配置）

## 6. エラーハンドリング設計

### 6.1 Error Boundary準備

```typescript
// 将来実装予定
class FinancialDataErrorBoundary extends React.Component {
  // コンポーネントエラーの局所化
}
```

### 6.2 ユーザーフレンドリーなエラーメッセージ

```typescript
const getErrorMessage = (error: unknown): string => {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 404) {
      return '該当する企業が見つかりませんでした。';
    }
    if (error.response?.status === 429) {
      return 'アクセスが集中しています。しばらく待ってから再試行してください。';
    }
  }
  return '一時的なエラーが発生しました。しばらく待ってから再試行してください。';
};
```

## 7. パフォーマンス設計

### 7.1 コンポーネント最適化

#### メモ化による再レンダリング防止
```typescript
const MemoizedFinancialMetrics = React.memo(FinancialMetrics);

// 将来実装予定：重い計算のメモ化
const expensiveCalculation = useMemo(() => {
  return calculateComplexMetrics(financialData);
}, [financialData]);
```

### 7.2 画像最適化

```typescript
// Material-UIアイコンの最適化インポート
import { Search, TrendingUp, TrendingDown } from '@mui/icons-material';
// 必要なアイコンのみインポートし、バンドルサイズを最小化
```

## 8. 国際化設計

### 8.1 日本語対応の実装方針

#### 数値・通貨フォーマット
```typescript
const formatters = {
  currency: new Intl.NumberFormat('ja-JP', { style: 'currency', currency: 'JPY' }),
  number: new Intl.NumberFormat('ja-JP'),
  percent: new Intl.NumberFormat('ja-JP', { style: 'percent' })
};
```

#### 文字列の外部化準備
```typescript
// Phase 2での実装予定
const messages = {
  'search.placeholder': '企業名または銘柄コードを入力してください',
  'error.notFound': '該当する企業が見つかりませんでした',
  // ...
};
```

## 9. テーマ・スタイリング設計

### 9.1 デザインシステム

```typescript
const theme = createTheme({
  palette: {
    primary: { main: '#1976d2' },     // 信頼感のあるブルー
    secondary: { main: '#dc004e' },   // アクセントカラー
    success: { main: '#2e7d32' },     // 上昇時のグリーン
    error: { main: '#d32f2f' },       // 下降時のレッド
  },
  typography: {
    h4: { fontWeight: 600 },          // 重要情報の強調
    h5: { fontWeight: 600 },
  },
});
```

### 9.2 一貫性のあるスペーシング

```typescript
// Material-UIのspacing systemを活用
<Box sx={{ p: 2 }}>        // padding: 16px
<Box sx={{ mb: 3 }}>       // margin-bottom: 24px
<Grid spacing={3}>         // gap: 24px
```

## 10. 将来拡張設計

### 10.1 Component Library化準備

```typescript
// Phase 2以降での共通コンポーネント化
export { CompanySearch, FinancialSummary } from './components';
export type { Company, FinancialData } from './types';
```

### 10.2 状態管理ライブラリ導入準備

```typescript
// Context API による段階的な状態管理強化準備
const StockAnalysisContext = createContext({
  favorites: [],
  addFavorite: () => {},
  removeFavorite: () => {},
});
```

この設計により、使いやすく保守性の高い、段階的に成長可能なフロントエンドを実現しています。