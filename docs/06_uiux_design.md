# UI/UX設計思想

## 1. UI/UX設計原則

### 1.1 設計思想
StockAnalysis HelperのUI/UXは、**投資初心者でも理解しやすい金融情報の表示**を目標として設計されています：

#### 核心UI/UX原則
1. **シンプルさ**: 複雑な金融用語を直感的なビジュアルで表現
2. **信頼性**: 正確な情報提供による信頼関係の構築
3. **透明性**: 判断根拠の明確な提示
4. **アクセシビリティ**: 全てのユーザーが利用可能な設計

### 1.2 ターゲットユーザー分析

#### プライマリーユーザー: 投資初心者
**特徴**:
- 金融知識: 基本的なPER、配当利回り程度
- 技術知識: スマートフォン・PCの基本操作
- 主な関心: 安全な投資先の発見
- 不安要素: 専門用語、複雑な分析手法

**ニーズ**:
- 簡潔で理解しやすい情報表示
- 投資判断の根拠説明
- リスクの明確な提示
- 操作に迷わないUI

#### セカンダリーユーザー: 中級投資家
**特徴**:
- より詳細な財務分析を求める
- 複数銘柄の比較機能が欲しい
- カスタマイズ可能性を重視

## 2. 情報アーキテクチャ

### 2.1 情報階層設計

```
Level 1 (最重要) - 即座に理解すべき情報
├── 現在株価
├── 変動率（上昇/下降の方向性）
└── 投資判定（BUY/HOLD/注意）

Level 2 (重要) - 投資判断に必要な基本指標
├── PER（バリュエーション）
├── 配当利回り（インカムゲイン）
├── EPS（企業収益力）
└── 時価総額（企業規模）

Level 3 (補助) - 参考情報
├── 52週高値・安値
├── 出来高データ
└── 業界・セクター情報

Level 4 (法的) - 必須表示項目
└── 免責事項・注意事項
```

### 2.2 画面フロー設計

```
企業検索画面
    ↓ (企業選択)
財務サマリー画面
    ↓ (戻るリンク)
企業検索画面
```

#### シンプルなフロー設計の理由
- **迷いの削減**: 複雑な画面遷移によるユーザーの混乱を防止
- **集中度向上**: 一つの企業に集中した分析を促進
- **モバイル対応**: 小画面でも操作しやすい線形フロー

## 3. ビジュアルデザイン

### 3.1 カラーパレット設計

#### プライマリーカラー
```typescript
const colorPalette = {
  primary: '#1976d2',      // 信頼感のあるブルー（メインブランドカラー）
  secondary: '#dc004e',    // アクセント用レッド
  success: '#2e7d32',      // 上昇・ポジティブ情報用グリーン
  error: '#d32f2f',        // 下降・ネガティブ情報用レッド
  warning: '#f57c00',      // 注意喚起用オレンジ
  info: '#0288d1'          // 情報表示用ライトブルー
};
```

#### 色彩心理学の活用
- **ブルー**: 金融機関で広く使用される信頼性の象徴
- **グリーン/レッド**: 株式市場の慣習的な上昇/下降カラー
- **高コントラスト**: 視認性向上とアクセシビリティ対応

### 3.2 タイポグラフィ設計

#### 情報重要度に基づくフォントサイズ
```typescript
const typography = {
  h4: {
    fontSize: '2.125rem',   // 現在株価（最重要）
    fontWeight: 600
  },
  h5: {
    fontSize: '1.5rem',     // 企業名（重要）
    fontWeight: 600
  },
  body1: {
    fontSize: '1rem',       // 基本情報
    fontWeight: 400
  },
  body2: {
    fontSize: '0.875rem',   // 補助情報
    fontWeight: 400
  }
};
```

#### 日本語最適化
- **游ゴシック系**: 日本語の可読性を重視
- **適切な行間**: 1.6em で読みやすさを確保
- **文字間調整**: 金融用語の視認性向上

## 4. インタラクションデザイン

### 4.1 マイクロインタラクション

#### ローディング状態の視覚化
```typescript
// 段階的な情報表示
const LoadingStates = {
  searching: <CircularProgress size={20} />,
  loading: <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
              <CircularProgress />
            </Box>,
  error: <Alert severity="error">エラーが発生しました</Alert>
};
```

#### ホバー・フォーカス効果
```typescript
const interactiveStyles = {
  searchResults: {
    '&:hover': {
      backgroundColor: 'action.hover',
      cursor: 'pointer'
    },
    '&:focus': {
      outline: '2px solid #1976d2',
      backgroundColor: 'action.selected'
    }
  }
};
```

### 4.2 フィードバック設計

#### 成功・エラー状態の明確化
```typescript
const feedbackPatterns = {
  success: {
    color: 'success.main',
    icon: <TrendingUp />,
    message: '企業データを取得しました'
  },
  error: {
    color: 'error.main', 
    icon: <Error />,
    message: '検索中にエラーが発生しました'
  },
  warning: {
    color: 'warning.main',
    icon: <Warning />,
    message: 'データが一部取得できませんでした'
  }
};
```

## 5. レスポンシブデザイン

### 5.1 ブレークポイント戦略

#### デバイス別レイアウト設計
```typescript
const responsiveLayouts = {
  mobile: {
    breakpoint: 'xs',
    gridCols: 12,
    layout: 'vertical-stack'  // 縦積みレイアウト
  },
  tablet: {
    breakpoint: 'md',
    gridCols: 6,
    layout: 'two-column'      // 2カラムレイアウト
  },
  desktop: {
    breakpoint: 'lg',
    gridCols: 4,
    layout: 'grid'            // グリッドレイアウト
  }
};
```

#### タッチ操作への最適化
```typescript
const touchOptimization = {
  minTouchTarget: '44px',     // iOS/Android推奨最小タッチ領域
  tapAreaExpansion: '8px',    // タップ領域の拡張
  scrollBehavior: 'smooth',   // スムーズスクロール
  swipeGestures: false        // Phase 1では未実装
};
```

### 5.2 コンテンツ優先設計

#### モバイルファースト情報表示
```typescript
const mobileContentPriority = [
  'current_price',      // 1. 現在株価（最重要）
  'change_percent',     // 2. 変動率
  'recommendation',     // 3. 投資判定
  'basic_metrics',      // 4. 基本指標（PER、配当利回り）
  'additional_info',    // 5. 追加情報（52週高値等）
  'disclaimer'          // 6. 免責事項
];
```

## 6. アクセシビリティ設計

### 6.1 WCAG 2.1 AA準拠

#### カラーコントラスト
```typescript
const accessibilityColors = {
  // WCAG AA基準（4.5:1）を満たすコントラスト比
  textOnPrimary: '#ffffff',     // 白文字 on ブルー背景
  textOnSecondary: '#ffffff',   // 白文字 on レッド背景
  errorText: '#d32f2f',         // 十分なコントラストの赤文字
  successText: '#2e7d32'        // 十分なコントラストの緑文字
};
```

#### キーボードナビゲーション
```typescript
const keyboardNavigation = {
  focusManagement: 'sequential',   // Tabキーでの順次移動
  skipLinks: true,                 // メインコンテンツへのスキップリンク
  ariaLabels: {
    searchInput: '企業名または銘柄コードを入力',
    priceDisplay: '現在の株価',
    changeIndicator: '前日からの変動率'
  }
};
```

### 6.2 セマンティックHTML

#### 構造化された情報提示
```typescript
const semanticStructure = {
  landmark: {
    header: <AppBar role="banner" />,
    main: <Container component="main" />,
    search: <Box component="search" />
  },
  headings: {
    h1: 'StockAnalysis Helper',          // ページタイトル
    h2: '企業検索',                      // セクションタイトル
    h3: '株価情報',                      // サブセクション
    h4: `${company.name} (${symbol})`    // 企業名
  }
};
```

## 7. エラーUX設計

### 7.1 ユーザーフレンドリーなエラーメッセージ

#### エラー状況別メッセージ設計
```typescript
const errorMessages = {
  networkError: {
    title: '接続エラー',
    message: 'インターネット接続を確認してください',
    action: '再試行',
    icon: <WifiOff />
  },
  notFound: {
    title: '企業が見つかりません',
    message: '銘柄コードまたは企業名を確認してください',
    action: '検索に戻る',
    icon: <SearchOff />
  },
  rateLimited: {
    title: 'アクセス集中',
    message: 'しばらく待ってから再試行してください',
    action: '後で再試行',
    icon: <HourglassEmpty />
  }
};
```

### 7.2 エラー回復フロー

#### 段階的エラー回復
```typescript
const errorRecoveryFlow = {
  step1: 'automatic_retry',        // 自動リトライ（1回）
  step2: 'user_notification',      // ユーザーへの通知
  step3: 'manual_retry_option',    // 手動リトライオプション
  step4: 'alternative_suggestion'  // 代替手段の提案
};
```

## 8. パフォーマンスUX

### 8.1 体感速度の向上

#### プログレッシブローディング
```typescript
const loadingStrategy = {
  immediate: ['page_skeleton', 'search_form'],           // 即座に表示
  fast: ['company_basic_info'],                          // 1秒以内
  acceptable: ['financial_metrics'],                     // 3秒以内
  background: ['detailed_analysis', 'recommendations']   // バックグラウンド読み込み
};
```

#### 知覚パフォーマンス最適化
```typescript
const perceivedPerformance = {
  skeletonLoading: true,        // スケルトンローディング
  optimisticUpdates: false,     // Phase 1では未実装
  prefetching: false,           // Phase 1では未実装
  lazyLoading: true            // 画像・アイコンの遅延読み込み
};
```

## 9. 情報提示設計

### 9.1 金融データの視覚化

#### 数値表示の最適化
```typescript
const dataVisualization = {
  currencyFormat: {
    locale: 'ja-JP',
    currency: 'JPY',
    notation: 'compact'          // 1.5万円 → ¥15K
  },
  percentageFormat: {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
    showSign: true               // +2.5% / -1.8%
  },
  trendIndicators: {
    uptrend: <TrendingUp color="success" />,
    downtrend: <TrendingDown color="error" />,
    neutral: <TrendingFlat color="disabled" />
  }
};
```

#### 複雑情報の簡素化
```typescript
const simplification = {
  per_explanation: 'PER：株価が1株利益の何倍かを示す指標',
  per_guidance: '一般的に15倍以下が割安とされています',
  dividend_yield_explanation: '配当利回り：投資額に対する年間配当の割合',
  recommendation_basis: '判定根拠：上昇トレンド + 適正PER範囲内'
};
```

## 10. 将来のUX強化

### 10.1 パーソナライゼーション（Phase 2予定）

#### ユーザー設定による体験カスタマイズ
```typescript
interface UserPreferences {
  displayCurrency: 'JPY' | 'USD';
  riskTolerance: 'conservative' | 'moderate' | 'aggressive';
  investmentStyle: 'value' | 'growth' | 'dividend' | 'balanced';
  notificationLevel: 'minimal' | 'standard' | 'detailed';
}

const personalizedExperience = {
  conservativeUser: {
    highlightMetrics: ['dividend_yield', 'debt_ratio'],
    riskWarnings: 'enhanced',
    recommendations: 'conservative_bias'
  },
  growthUser: {
    highlightMetrics: ['revenue_growth', 'pe_ratio'],
    chartFocus: 'price_momentum',
    recommendations: 'growth_focused'
  }
};
```

### 10.2 高度な視覚化（Phase 3予定）

#### インタラクティブチャート
```typescript
const advancedVisualization = {
  priceChart: {
    type: 'candlestick',
    timeframes: ['1D', '1W', '1M', '3M', '1Y'],
    indicators: ['SMA', 'EMA', 'RSI'],
    annotation: 'buy_sell_signals'
  },
  portfolioView: {
    type: 'treemap',
    groupBy: 'sector',
    colorBy: 'performance',
    sizeBy: 'market_cap'
  }
};
```

この包括的なUI/UX設計により、投資初心者から中級者まで幅広いユーザーにとって使いやすく、信頼できる株式分析ツールを実現しています。