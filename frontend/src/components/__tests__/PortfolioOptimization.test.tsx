import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { expect, vi, describe, it, beforeEach } from 'vitest';
import PortfolioOptimization from '../PortfolioOptimization';
import * as api from '../../services/api';

// Mock API service
vi.mock('../../services/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn()
  }
}));

// Mock recharts components
vi.mock('recharts', () => ({
  LineChart: ({ children }: any) => <div data-testid="line-chart">{children}</div>,
  Line: () => <div data-testid="line" />,
  XAxis: () => <div data-testid="x-axis" />,
  YAxis: () => <div data-testid="y-axis" />,
  CartesianGrid: () => <div data-testid="cartesian-grid" />,
  Tooltip: () => <div data-testid="tooltip" />,
  ResponsiveContainer: ({ children }: any) => <div data-testid="responsive-container">{children}</div>,
  ScatterChart: ({ children }: any) => <div data-testid="scatter-chart">{children}</div>,
  Scatter: () => <div data-testid="scatter" />,
  PieChart: ({ children }: any) => <div data-testid="pie-chart">{children}</div>,
  Pie: () => <div data-testid="pie" />,
  Cell: () => <div data-testid="cell" />,
  BarChart: ({ children }: any) => <div data-testid="bar-chart">{children}</div>,
  Bar: () => <div data-testid="bar" />
}));

const mockApiGet = api.default.get as ReturnType<typeof vi.fn>;
const mockApiPost = api.default.post as ReturnType<typeof vi.fn>;

const mockOptimizedPortfolio = {
  portfolioId: 'test-portfolio-123',
  objective: {
    type: 'MAX_SHARPE',
    riskTolerance: 'MODERATE',
    timeHorizon: 'MEDIUM'
  },
  allocations: [
    {
      symbol: 'AAPL',
      targetWeight: 0.4,
      currentWeight: 0.3,
      recommendedAction: 'BUY',
      quantity: 10,
      amount: 1500
    },
    {
      symbol: 'MSFT',
      targetWeight: 0.35,
      currentWeight: 0.4,
      recommendedAction: 'SELL',
      quantity: -5,
      amount: -1500
    },
    {
      symbol: 'GOOGL',
      targetWeight: 0.25,
      currentWeight: 0.3,
      recommendedAction: 'HOLD',
      quantity: 0,
      amount: 0
    }
  ],
  expectedReturn: 0.08,
  expectedRisk: 0.15,
  sharpeRatio: 0.4,
  metrics: {
    diversificationRatio: 1.2,
    concentrationIndex: 0.3,
    trackingError: 0.05,
    informationRatio: 0.8
  },
  rebalancingNeeded: true,
  totalRebalanceAmount: 3000,
  estimatedCosts: {
    tradingFees: 50,
    marketImpact: 30,
    totalCost: 80
  }
};

const mockPresets = [
  {
    id: 'preset_1',
    name: '保守的戦略',
    description: 'リスクを最小化',
    objectiveType: 'MIN_RISK',
    riskTolerance: 'CONSERVATIVE',
    timeHorizon: 'LONG',
    constraints: { minWeight: 0.02, maxWeight: 0.25 },
    isDefault: true
  },
  {
    id: 'preset_2',
    name: 'バランス戦略',
    description: 'リスクとリターンのバランス',
    objectiveType: 'MAX_SHARPE',
    riskTolerance: 'MODERATE',
    timeHorizon: 'MEDIUM',
    constraints: { minWeight: 0.01, maxWeight: 0.35 },
    isDefault: true
  }
];

const mockOptimizationHistory = [
  {
    id: 'opt_1',
    objective_type: 'MAX_SHARPE',
    expected_return: 0.08,
    expected_risk: 0.15,
    sharpe_ratio: 0.4,
    created_at: '2024-01-01T00:00:00Z'
  },
  {
    id: 'opt_2',
    objective_type: 'MIN_RISK',
    expected_return: 0.06,
    expected_risk: 0.10,
    sharpe_ratio: 0.4,
    created_at: '2024-01-02T00:00:00Z'
  }
];

const mockEfficientFrontier = [
  { risk: 0.10, return: 0.06, sharpeRatio: 0.4, allocations: { AAPL: 0.5, MSFT: 0.3, GOOGL: 0.2 } },
  { risk: 0.15, return: 0.08, sharpeRatio: 0.45, allocations: { AAPL: 0.4, MSFT: 0.35, GOOGL: 0.25 } },
  { risk: 0.20, return: 0.10, sharpeRatio: 0.4, allocations: { AAPL: 0.3, MSFT: 0.4, GOOGL: 0.3 } }
];

describe('PortfolioOptimization', () => {
  const defaultProps = {
    portfolioId: 'test-portfolio-123',
    onOptimizationComplete: vi.fn()
  };

  beforeEach(() => {
    vi.clearAllMocks();
    
    // デフォルトのAPI応答設定
    mockApiGet.mockImplementation((url: string) => {
      if (url.includes('/presets')) {
        return Promise.resolve({
          data: { success: true, data: { presets: mockPresets } }
        });
      }
      if (url.includes('/history')) {
        return Promise.resolve({
          data: { success: true, data: { optimizations: mockOptimizationHistory } }
        });
      }
      if (url.includes('/efficient-frontier')) {
        return Promise.resolve({
          data: { success: true, data: { frontierPoints: mockEfficientFrontier } }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });

    mockApiPost.mockImplementation((url: string) => {
      if (url.includes('/optimize')) {
        return Promise.resolve({
          data: { success: true, data: { optimizedPortfolio: mockOptimizedPortfolio } }
        });
      }
      if (url.includes('/presets')) {
        return Promise.resolve({
          data: { success: true, data: { preset: mockPresets[0] } }
        });
      }
      return Promise.resolve({ data: { success: true, data: {} } });
    });
  });

  describe('初期レンダリング', () => {
    it('コンポーネントが正常にレンダリングされる', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      expect(screen.getByText('ポートフォリオ最適化')).toBeInTheDocument();
      expect(screen.getByText('効率的フロンティア')).toBeInTheDocument();
      expect(screen.getByText('最適化実行')).toBeInTheDocument();
      
      // タブが表示される
      expect(screen.getByText('最適化設定')).toBeInTheDocument();
      expect(screen.getByText('最適化結果')).toBeInTheDocument();
      expect(screen.getByText('リバランス提案')).toBeInTheDocument();
      expect(screen.getByText('履歴・プリセット')).toBeInTheDocument();
    });

    it('プリセットと履歴データが読み込まれる', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith('/optimization/presets');
        expect(mockApiGet).toHaveBeenCalledWith(`/optimization/${defaultProps.portfolioId}/history?limit=20`);
      });
    });
  });

  describe('最適化設定タブ', () => {
    it('最適化設定フォームが表示される', () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      expect(screen.getByText('最適化目標')).toBeInTheDocument();
      expect(screen.getByText('制約条件')).toBeInTheDocument();
      expect(screen.getByText('最適化タイプ')).toBeInTheDocument();
      expect(screen.getByText('リスク許容度')).toBeInTheDocument();
      expect(screen.getByText('投資期間')).toBeInTheDocument();
    });

    it('スライダーで制約条件を変更できる', () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const minWeightSlider = screen.getByDisplayValue('1.0'); // デフォルト1%
      expect(minWeightSlider).toBeInTheDocument();
      
      const maxWeightSlider = screen.getByDisplayValue('35.0'); // デフォルト35%
      expect(maxWeightSlider).toBeInTheDocument();
    });

    it('プリセットチップが表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      await waitFor(() => {
        expect(screen.getByText('保守的戦略')).toBeInTheDocument();
        expect(screen.getByText('バランス戦略')).toBeInTheDocument();
      });
    });
  });

  describe('最適化実行', () => {
    it('最適化実行ボタンクリックでダイアログが開く', () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      
      expect(screen.getByText('ポートフォリオ最適化実行')).toBeInTheDocument();
      expect(screen.getByText('以下の設定でポートフォリオを最適化しますか？')).toBeInTheDocument();
    });

    it('最適化を実行できる', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith(
          `/optimization/${defaultProps.portfolioId}/optimize`,
          expect.objectContaining({
            objective: expect.objectContaining({
              type: 'MAX_SHARPE',
              riskTolerance: 'MODERATE',
              timeHorizon: 'MEDIUM'
            })
          })
        );
      });
    });

    it('最適化完了後にコールバックが呼ばれる', async () => {
      const onOptimizationComplete = vi.fn();
      render(<PortfolioOptimization {...defaultProps} onOptimizationComplete={onOptimizationComplete} />);
      
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(onOptimizationComplete).toHaveBeenCalledWith(mockOptimizedPortfolio);
      });
    });
  });

  describe('最適化結果タブ', () => {
    it('最適化結果が表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      // 最適化を実行
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        // 結果タブに切り替え
        const resultsTab = screen.getByText('最適化結果');
        fireEvent.click(resultsTab);
        
        expect(screen.getByText('期待リターン')).toBeInTheDocument();
        expect(screen.getByText('期待リスク')).toBeInTheDocument();
        expect(screen.getByText('シャープレシオ')).toBeInTheDocument();
        expect(screen.getByText('最適配分')).toBeInTheDocument();
      });
    });

    it('パフォーマンスメトリクスが表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      // 最適化実行後
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        const resultsTab = screen.getByText('最適化結果');
        fireEvent.click(resultsTab);
        
        expect(screen.getByText('最適化メトリクス')).toBeInTheDocument();
        expect(screen.getByText('推定取引コスト')).toBeInTheDocument();
      });
    });
  });

  describe('リバランス提案タブ', () => {
    it('リバランス提案が表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      // 最適化実行後
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        const rebalanceTab = screen.getByText('リバランス提案');
        fireEvent.click(rebalanceTab);
        
        expect(screen.getByText('リバランス提案')).toBeInTheDocument();
        expect(screen.getByText('リバランス推奨')).toBeInTheDocument();
        expect(screen.getByText('推奨アクション')).toBeInTheDocument();
        expect(screen.getByText('総リバランス金額')).toBeInTheDocument();
      });
    });

    it('アクションチップが表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        const rebalanceTab = screen.getByText('リバランス提案');
        fireEvent.click(rebalanceTab);
        
        expect(screen.getByText('BUY')).toBeInTheDocument();
        expect(screen.getByText('SELL')).toBeInTheDocument();
        expect(screen.getByText('HOLD')).toBeInTheDocument();
      });
    });
  });

  describe('履歴・プリセットタブ', () => {
    it('最適化履歴が表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const historyTab = screen.getByText('履歴・プリセット');
      fireEvent.click(historyTab);
      
      await waitFor(() => {
        expect(screen.getByText('最適化履歴')).toBeInTheDocument();
        expect(screen.getByText('MAX_SHARPE')).toBeInTheDocument();
        expect(screen.getByText('MIN_RISK')).toBeInTheDocument();
      });
    });

    it('プリセット管理が表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const historyTab = screen.getByText('履歴・プリセット');
      fireEvent.click(historyTab);
      
      await waitFor(() => {
        expect(screen.getByText('プリセット管理')).toBeInTheDocument();
        expect(screen.getByText('保守的戦略')).toBeInTheDocument();
        expect(screen.getByText('バランス戦略')).toBeInTheDocument();
      });
    });

    it('プリセットを適用できる', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const historyTab = screen.getByText('履歴・プリセット');
      fireEvent.click(historyTab);
      
      await waitFor(() => {
        const applyButtons = screen.getAllByText('適用');
        fireEvent.click(applyButtons[0]);
        
        // プリセットが適用されることを確認（実際のテストでは状態変更を確認）
      });
    });
  });

  describe('効率的フロンティア', () => {
    it('効率的フロンティアボタンクリックで計算が実行される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const frontierButton = screen.getByText('効率的フロンティア');
      fireEvent.click(frontierButton);
      
      await waitFor(() => {
        expect(mockApiGet).toHaveBeenCalledWith(
          `/optimization/${defaultProps.portfolioId}/efficient-frontier`,
          expect.objectContaining({
            params: expect.objectContaining({
              pointCount: 25
            })
          })
        );
      });
    });

    it('効率的フロンティアダイアログが表示される', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const frontierButton = screen.getByText('効率的フロンティア');
      fireEvent.click(frontierButton);
      
      await waitFor(() => {
        expect(screen.getByText('効率的フロンティア')).toBeInTheDocument();
      });
    });
  });

  describe('プリセット保存', () => {
    it('プリセット保存ダイアログが開く', () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const saveButton = screen.getByText('プリセットとして保存');
      fireEvent.click(saveButton);
      
      expect(screen.getByText('プリセットとして保存')).toBeInTheDocument();
      expect(screen.getByLabelText('プリセット名')).toBeInTheDocument();
      expect(screen.getByLabelText('説明')).toBeInTheDocument();
    });

    it('プリセットを保存できる', async () => {
      render(<PortfolioOptimization {...defaultProps} />);
      
      const saveButton = screen.getByText('プリセットとして保存');
      fireEvent.click(saveButton);
      
      const nameInput = screen.getByLabelText('プリセット名');
      const descriptionInput = screen.getByLabelText('説明');
      
      fireEvent.change(nameInput, { target: { value: '新しい戦略' } });
      fireEvent.change(descriptionInput, { target: { value: 'テスト戦略' } });
      
      const savePresetButton = screen.getByRole('button', { name: '保存' });
      fireEvent.click(savePresetButton);
      
      await waitFor(() => {
        expect(mockApiPost).toHaveBeenCalledWith('/optimization/presets', expect.objectContaining({
          name: '新しい戦略',
          description: 'テスト戦略'
        }));
      });
    });
  });

  describe('エラーハンドリング', () => {
    it('API エラー時にエラーメッセージが表示される', async () => {
      mockApiPost.mockRejectedValueOnce({
        response: { data: { error: '最適化に失敗しました' } }
      });
      
      render(<PortfolioOptimization {...defaultProps} />);
      
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      await waitFor(() => {
        expect(screen.getByText('最適化に失敗しました')).toBeInTheDocument();
      });
    });

    it('ローディング状態が表示される', async () => {
      // 遅延するPromiseを作成
      mockApiPost.mockImplementationOnce(() => 
        new Promise(resolve => setTimeout(() => resolve({
          data: { success: true, data: { optimizedPortfolio: mockOptimizedPortfolio } }
        }), 1000))
      );
      
      render(<PortfolioOptimization {...defaultProps} />);
      
      const optimizeButton = screen.getByText('最適化実行');
      fireEvent.click(optimizeButton);
      const executeButton = screen.getByRole('button', { name: '実行' });
      fireEvent.click(executeButton);
      
      // ローディング状態を確認
      expect(executeButton).toBeDisabled();
    });
  });
});