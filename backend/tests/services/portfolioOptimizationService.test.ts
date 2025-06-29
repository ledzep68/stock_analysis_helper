import { portfolioOptimizationService } from '../../src/services/portfolioOptimizationService';
import { portfolioService } from '../../src/services/portfolioService';
import { db } from '../../src/config/database';

// モック設定
jest.mock('../../src/services/portfolioService');
jest.mock('../../src/config/database', () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

const mockPortfolioService = portfolioService as jest.Mocked<typeof portfolioService>;
const mockDb = db as jest.Mocked<typeof db>;

describe('PortfolioOptimizationService', () => {
  const testUserId = 'test-user-123';
  const testPortfolioId = 'test-portfolio-123';

  beforeEach(() => {
    jest.clearAllMocks();
    
    // デフォルトのモック設定
    mockPortfolioService.getPortfolioById.mockResolvedValue({
      id: testPortfolioId,
      userId: testUserId,
      name: 'テストポートフォリオ',
      description: 'テスト用',
      initialCapital: 1000000,
      currency: 'JPY',
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    mockPortfolioService.getPortfolioHoldings.mockResolvedValue([
      { 
        id: 'holding1', portfolioId: testPortfolioId, symbol: 'AAPL', quantity: 100, 
        averageCost: 150, purchaseDate: new Date(), createdAt: new Date(), updatedAt: new Date() 
      },
      { 
        id: 'holding2', portfolioId: testPortfolioId, symbol: 'MSFT', quantity: 80, 
        averageCost: 300, purchaseDate: new Date(), createdAt: new Date(), updatedAt: new Date() 
      },
      { 
        id: 'holding3', portfolioId: testPortfolioId, symbol: 'GOOGL', quantity: 50, 
        averageCost: 2500, purchaseDate: new Date(), createdAt: new Date(), updatedAt: new Date() 
      }
    ]);

    mockPortfolioService.getPortfolioSummary.mockResolvedValue({
      portfolio: {
        id: testPortfolioId,
        userId: testUserId,
        name: 'テストポートフォリオ',
        description: 'テスト用',
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      },
      totalValue: 171600,
      totalCost: 159000,
      unrealizedPnL: 12600,
      realizedPnL: 0,
      totalReturn: 12600,
      totalReturnPercent: 7.92,
      holdingsCount: 3,
      topHoldings: [
        { symbol: 'AAPL', quantity: 100, currentValue: 16000, allocation: 9.3 },
        { symbol: 'MSFT', quantity: 80, currentValue: 25600, allocation: 14.9 },
        { symbol: 'GOOGL', quantity: 50, currentValue: 130000, allocation: 75.8 }
      ]
    });

    mockDb.run.mockResolvedValue({ changes: 1, lastID: 1 });
    mockDb.get.mockResolvedValue(null);
    mockDb.all.mockResolvedValue([]);
  });

  describe('optimizePortfolio', () => {
    it('MAX_SHARPE目標でポートフォリオを最適化できる', async () => {
      const objective = {
        type: 'MAX_SHARPE' as const,
        riskTolerance: 'MODERATE' as const,
        timeHorizon: 'MEDIUM' as const
      };

      const constraints = {
        minWeight: 0.01,
        maxWeight: 0.5,
        maxRisk: 0.3,
        riskFreeRate: 0.02
      };

      const result = await portfolioOptimizationService.optimizePortfolio(
        testPortfolioId,
        testUserId,
        objective,
        constraints
      );

      expect(result).toBeDefined();
      expect(result.portfolioId).toEqual(testPortfolioId);
      expect(result.objective).toEqual(objective);
      expect(Array.isArray(result.allocations)).toBe(true);
      expect(result.allocations.length).toBeGreaterThan(0);
      expect(typeof result.expectedReturn).toBe('number');
      expect(typeof result.expectedRisk).toBe('number');
      expect(typeof result.sharpeRatio).toBe('number');
      expect(result.metrics).toBeDefined();
      expect(result.estimatedCosts).toBeDefined();

      // 配分の合計が100%であることを確認
      const totalWeight = result.allocations.reduce((sum, alloc) => sum + alloc.targetWeight, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);

      // 制約条件の遵守確認
      result.allocations.forEach(alloc => {
        expect(alloc.targetWeight).toBeGreaterThanOrEqual(constraints.minWeight!);
        expect(alloc.targetWeight).toBeLessThanOrEqual(constraints.maxWeight!);
      });
    });

    it('MIN_RISK目標でポートフォリオを最適化できる', async () => {
      const objective = {
        type: 'MIN_RISK' as const,
        riskTolerance: 'CONSERVATIVE' as const,
        timeHorizon: 'LONG' as const
      };

      const result = await portfolioOptimizationService.optimizePortfolio(
        testPortfolioId,
        testUserId,
        objective
      );

      expect(result.objective.type).toEqual('MIN_RISK');
      expect(typeof result.expectedRisk).toBe('number');
      expect(result.expectedRisk).toBeGreaterThan(0);
    });

    it('RISK_PARITY目標でポートフォリオを最適化できる', async () => {
      const objective = {
        type: 'RISK_PARITY' as const,
        riskTolerance: 'MODERATE' as const,
        timeHorizon: 'MEDIUM' as const
      };

      const result = await portfolioOptimizationService.optimizePortfolio(
        testPortfolioId,
        testUserId,
        objective
      );

      expect(result.objective.type).toEqual('RISK_PARITY');
      expect(typeof result.metrics.diversificationRatio).toBe('number');
    });

    it('無効なポートフォリオIDでエラーが発生する', async () => {
      const objective = {
        type: 'MAX_SHARPE' as const,
        riskTolerance: 'MODERATE' as const,
        timeHorizon: 'MEDIUM' as const
      };

      await expect(
        portfolioOptimizationService.optimizePortfolio(
          'invalid-portfolio',
          testUserId,
          objective
        )
      ).rejects.toThrow('Portfolio not found');
    });
  });

  describe('calculateEfficientFrontier', () => {
    it('効率的フロンティアを計算できる', async () => {
      const constraints = {
        minWeight: 0.01,
        maxWeight: 0.5
      };

      const points = await portfolioOptimizationService.calculateEfficientFrontier(
        testPortfolioId,
        testUserId,
        constraints,
        10
      );

      expect(Array.isArray(points)).toBe(true);
      expect(points.length).toEqual(10);

      points.forEach(point => {
        expect(point).toHaveProperty('risk');
        expect(point).toHaveProperty('return');
        expect(point).toHaveProperty('sharpeRatio');
        expect(point).toHaveProperty('allocations');
        expect(typeof point.risk).toBe('number');
        expect(typeof point.return).toBe('number');
        expect(typeof point.sharpeRatio).toBe('number');
        expect(typeof point.allocations).toBe('object');
      });

      // リスクが昇順になっていることを確認
      for (let i = 1; i < points.length; i++) {
        expect(points[i].risk).toBeGreaterThan(points[i - 1].risk);
      }
    });

    it('ポイント数が制限内であることを確認', async () => {
      const points = await portfolioOptimizationService.calculateEfficientFrontier(
        testPortfolioId,
        testUserId,
        {},
        25
      );

      expect(points.length).toBeLessThanOrEqual(25);
    });
  });

  describe('calculateRiskParity', () => {
    it('リスクパリティ配分を計算できる', async () => {
      const covariance = [
        [0.04, 0.02, 0.01],
        [0.02, 0.09, 0.015],
        [0.01, 0.015, 0.16]
      ];

      const result = await portfolioOptimizationService.calculateRiskParity(covariance);

      expect(result).toBeDefined();
      expect(typeof result.allocations).toBe('object');
      expect(Object.keys(result.allocations).length).toEqual(3);
      expect(typeof result.riskContributions).toBe('object');
      expect(typeof result.totalRisk).toBe('number');

      // 重みの合計が1であることを確認
      const weights = Object.values(result.allocations);
      const totalWeight = weights.reduce((sum, w) => sum + w, 0);
      expect(totalWeight).toBeCloseTo(1.0, 2);

      // 各重みが正であることを確認
      weights.forEach(weight => {
        expect(weight).toBeGreaterThan(0);
      });
    });

    it('制約付きリスクパリティを計算できる', async () => {
      const covariance = [
        [0.04, 0.02],
        [0.02, 0.09]
      ];

      const constraints = {
        minWeight: 0.1,
        maxWeight: 0.8
      };

      const result = await portfolioOptimizationService.calculateRiskParity(covariance, constraints);

      expect(typeof result.allocations).toBe('object');
      Object.values(result.allocations).forEach(weight => {
        expect(weight).toBeGreaterThanOrEqual(constraints.minWeight!);
        expect(weight).toBeLessThanOrEqual(constraints.maxWeight!);
      });
    });
  });

  describe('generateRebalancingProposal', () => {
    it('リバランシング提案を生成できる', async () => {
      const targetAllocations = {
        'AAPL': 0.4,
        'MSFT': 0.35,
        'GOOGL': 0.25
      };

      const proposal = await portfolioOptimizationService.generateRebalancingProposal(
        testPortfolioId,
        testUserId,
        targetAllocations
      );

      expect(Array.isArray(proposal)).toBe(true);
      expect(proposal.length).toBeGreaterThan(0);

      proposal.forEach(action => {
        expect(action).toHaveProperty('symbol');
        expect(action).toHaveProperty('currentQuantity');
        expect(action).toHaveProperty('targetQuantity');
        expect(action).toHaveProperty('action');
        expect(action).toHaveProperty('quantity');
        expect(action).toHaveProperty('estimatedCost');
        
        expect(['BUY', 'SELL', 'HOLD']).toContain(action.action);
        expect(typeof action.quantity).toBe('number');
        expect(typeof action.estimatedCost).toBe('number');
      });
    });

    it('目標配分の合計が100%でない場合エラーが発生する', async () => {
      const invalidAllocations = {
        'AAPL': 0.5,
        'MSFT': 0.3
        // 合計80%で100%ではない
      };

      await expect(
        portfolioOptimizationService.generateRebalancingProposal(
          testPortfolioId,
          testUserId,
          invalidAllocations
        )
      ).rejects.toThrow('allocations must sum to 100%');
    });
  });

  describe('optimizationResultPersistence', () => {
    it('最適化結果がデータベースに保存される', async () => {
      const objective = {
        type: 'MAX_SHARPE' as const,
        riskTolerance: 'MODERATE' as const,
        timeHorizon: 'MEDIUM' as const
      };

      // モックで保存された最適化結果を設定
      mockDb.all.mockResolvedValue([{
        id: 'opt_123',
        portfolio_id: testPortfolioId,
        objective_type: 'MAX_SHARPE',
        risk_tolerance: 'MODERATE',
        time_horizon: 'MEDIUM',
        expected_return: 0.08,
        expected_risk: 0.15,
        sharpe_ratio: 0.4,
        allocations: JSON.stringify([]),
        metrics: JSON.stringify({}),
        estimated_costs: JSON.stringify({}),
        created_at: new Date().toISOString()
      }]);

      await portfolioOptimizationService.optimizePortfolio(
        testPortfolioId,
        testUserId,
        objective
      );

      // データベースへの保存が呼ばれたことを確認
      expect(mockDb.run).toHaveBeenCalled();
    });
  });

  describe('errorHandling', () => {
    it('存在しないポートフォリオIDでエラー処理', async () => {
      const objective = {
        type: 'MAX_SHARPE' as const,
        riskTolerance: 'MODERATE' as const,
        timeHorizon: 'MEDIUM' as const
      };

      // 存在しないポートフォリオの場合のモック設定
      mockPortfolioService.getPortfolioById.mockResolvedValue(null);

      await expect(
        portfolioOptimizationService.optimizePortfolio(
          'non-existent-portfolio',
          testUserId,
          objective
        )
      ).rejects.toThrow('Portfolio not found');
    });

    it('無効な共分散行列でエラー処理', async () => {
      const invalidCovariance = [
        [0.04, 0.02],
        [0.02]  // 不正な行列
      ];

      await expect(
        portfolioOptimizationService.calculateRiskParity(invalidCovariance)
      ).rejects.toThrow('Invalid covariance matrix');
    });
  });
});