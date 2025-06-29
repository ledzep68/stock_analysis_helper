import { portfolioRiskService } from '../../services/portfolioRiskService';
import { portfolioService } from '../../services/portfolioService';
import { db } from '../../config/database';

// モック設定
jest.mock('../../config/database', () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

jest.mock('../../services/portfolioService');

describe('PortfolioRiskService', () => {
  const mockUserId = 'user123';
  const mockPortfolioId = 'portfolio123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('analyzePortfolioRisk', () => {
    it('ポートフォリオリスク分析を正常に実行する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        initialCapital: 1000000,
        currency: 'JPY'
      };

      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00,
          currentPrice: 160.00,
          marketValue: 16000,
          unrealizedPnL: 1000,
          percentAllocation: 40.0
        },
        {
          symbol: 'GOOGL',
          quantity: 25,
          averageCost: 2000.00,
          currentPrice: 2200.00,
          marketValue: 55000,
          unrealizedPnL: 5000,
          percentAllocation: 60.0
        }
      ];

      const mockSummary = {
        portfolio: mockPortfolio,
        totalValue: 1100000,
        totalCost: 1000000,
        unrealizedPnL: 100000,
        realizedPnL: 0,
        totalReturn: 100000,
        totalReturnPercent: 10.0,
        holdingsCount: 2,
        topHoldings: mockHoldings
      };

      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(mockPortfolio);
      (portfolioService.getPortfolioHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);
      (db.all as jest.Mock).mockResolvedValue([
        { daily_return: 1.0 },
        { daily_return: -0.5 },
        { daily_return: 2.0 },
        { daily_return: 0.8 },
        { daily_return: -1.2 }
      ]);
      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });

      const result = await portfolioRiskService.analyzePortfolioRisk(mockPortfolioId, mockUserId);

      expect(portfolioService.getPortfolioById).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
      expect(portfolioService.getPortfolioHoldings).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
      expect(portfolioService.getPortfolioSummary).toHaveBeenCalledWith(mockPortfolioId, mockUserId);

      expect(result).toEqual(expect.objectContaining({
        overall: expect.objectContaining({
          portfolioId: mockPortfolioId,
          var95: expect.any(Number),
          var99: expect.any(Number),
          expectedShortfall: expect.any(Number),
          beta: expect.any(Number),
          alpha: expect.any(Number),
          correlationMatrix: expect.any(Object),
          sectorAllocation: expect.any(Object),
          concentrationRisk: expect.any(Number),
          liquidityRisk: expect.any(Number)
        }),
        breakdown: expect.objectContaining({
          systematicRisk: expect.any(Number),
          unsystematicRisk: expect.any(Number),
          concentrationRisk: expect.any(Number),
          liquidityRisk: expect.any(Number),
          currencyRisk: expect.any(Number)
        }),
        recommendations: expect.any(Array)
      }));

      expect(result.recommendations).toBeInstanceOf(Array);
      expect(result.overall.concentrationRisk).toBeGreaterThan(0);
    });

    it('存在しないポートフォリオの場合エラーを投げる', async () => {
      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(null);

      await expect(
        portfolioRiskService.analyzePortfolioRisk('nonexistent', mockUserId)
      ).rejects.toThrow('Portfolio not found');
    });
  });

  describe('runStressTest', () => {
    it('ストレステストを正常に実行する', async () => {
      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00,
          currentPrice: 160.00,
          marketValue: 16000,
          unrealizedPnL: 1000,
          percentAllocation: 40.0
        },
        {
          symbol: 'GOOGL',
          quantity: 25,
          averageCost: 2000.00,
          currentPrice: 2200.00,
          marketValue: 55000,
          unrealizedPnL: 5000,
          percentAllocation: 60.0
        }
      ];

      const mockSummary = {
        totalValue: 1100000
      };

      (portfolioService.getPortfolioHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await portfolioRiskService.runStressTest(mockPortfolioId, mockUserId);

      expect(portfolioService.getPortfolioHoldings).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
      expect(portfolioService.getPortfolioSummary).toHaveBeenCalledWith(mockPortfolioId, mockUserId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(5); // 5つのシナリオ

      result.forEach(scenario => {
        expect(scenario).toEqual(expect.objectContaining({
          scenario: expect.any(String),
          portfolioImpact: expect.any(Number),
          impactPercent: expect.any(Number),
          worstHolding: expect.objectContaining({
            symbol: expect.any(String),
            impact: expect.any(Number),
            impactPercent: expect.any(Number)
          }),
          recoveryTime: expect.any(Number)
        }));

        expect(scenario.impactPercent).toBeLessThan(0); // 負の影響
        expect(scenario.recoveryTime).toBeGreaterThan(0);
      });
    });

    it('保有銘柄が空の場合も正常に動作する', async () => {
      const mockSummary = {
        totalValue: 1000000
      };

      (portfolioService.getPortfolioHoldings as jest.Mock).mockResolvedValue([]);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);

      const result = await portfolioRiskService.runStressTest(mockPortfolioId, mockUserId);

      expect(result).toBeInstanceOf(Array);
      expect(result.length).toBe(5);

      result.forEach(scenario => {
        expect(scenario.portfolioImpact).toBe(0);
        expect(scenario.impactPercent).toBe(0);
        expect(scenario.worstHolding.symbol).toBe('');
      });
    });
  });

  describe('calculateVaR', () => {
    it('VaRを正常に計算する', async () => {
      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00
        }
      ];

      const mockSummary = {
        totalValue: 1100000
      };

      const mockHistoricalReturns = Array.from({ length: 100 }, (_, i) => 
        (Math.random() - 0.5) * 4 // -2% to 2% range
      );

      (portfolioService.getPortfolioHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);
      (db.all as jest.Mock).mockResolvedValue(
        mockHistoricalReturns.map(ret => ({ daily_return: ret }))
      );

      const result = await portfolioRiskService.calculateVaR(
        mockPortfolioId,
        mockUserId,
        0.95,
        1
      );

      expect(result).toEqual(expect.objectContaining({
        var: expect.any(Number),
        expectedShortfall: expect.any(Number)
      }));

      expect(result.var).toBeGreaterThan(0);
      expect(result.expectedShortfall).toBeGreaterThan(0);
      expect(result.expectedShortfall).toBeGreaterThanOrEqual(result.var);
    });

    it('履歴データが不十分な場合エラーを投げる', async () => {
      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00
        }
      ];

      const mockSummary = {
        totalValue: 1100000
      };

      // 不十分なデータ（30件未満）
      const mockHistoricalReturns = Array.from({ length: 20 }, (_, i) => 
        ({ daily_return: (Math.random() - 0.5) * 4 })
      );

      (portfolioService.getPortfolioHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);
      (db.all as jest.Mock).mockResolvedValue(mockHistoricalReturns);

      await expect(
        portfolioRiskService.calculateVaR(mockPortfolioId, mockUserId, 0.95, 1)
      ).rejects.toThrow('Insufficient historical data for VaR calculation');
    });

    it('異なる信頼水準で正しく計算する', async () => {
      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00
        }
      ];

      const mockSummary = {
        totalValue: 1100000
      };

      const mockHistoricalReturns = Array.from({ length: 100 }, (_, i) => 
        ({ daily_return: (Math.random() - 0.5) * 4 })
      );

      (portfolioService.getPortfolioHoldings as jest.Mock).mockResolvedValue(mockHoldings);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);
      (db.all as jest.Mock).mockResolvedValue(mockHistoricalReturns);

      const var95 = await portfolioRiskService.calculateVaR(
        mockPortfolioId,
        mockUserId,
        0.95,
        1
      );

      const var99 = await portfolioRiskService.calculateVaR(
        mockPortfolioId,
        mockUserId,
        0.99,
        1
      );

      expect(var99.var).toBeGreaterThanOrEqual(var95.var); // 99% VaRは95% VaR以上
      expect(var99.expectedShortfall).toBeGreaterThanOrEqual(var95.expectedShortfall);
    });
  });

  describe('private methods', () => {
    describe('generateRiskRecommendations', () => {
      it('高い集中リスクに対する推奨事項を生成する', () => {
        const mockRiskMetrics = {
          portfolioId: mockPortfolioId,
          date: new Date(),
          var95: 50000,
          var99: 75000,
          expectedShortfall: 60000,
          beta: 1.2,
          alpha: 0.02,
          correlationMatrix: {},
          sectorAllocation: { Technology: 70, Financial: 30 },
          concentrationRisk: 35, // 高い集中リスク
          liquidityRisk: 20
        };

        const mockBreakdown = {
          systematicRisk: 15,
          unsystematicRisk: 10,
          concentrationRisk: 35,
          liquidityRisk: 20,
          currencyRisk: 0
        };

        const result = (portfolioRiskService as any).generateRiskRecommendations(
          mockRiskMetrics,
          mockBreakdown
        );

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBeGreaterThan(0);
        expect(result.some((rec: string) => rec.includes('集中リスク'))).toBe(true);
        expect(result.some((rec: string) => rec.includes('セクター分散'))).toBe(true);
      });

      it('高い流動性リスクに対する推奨事項を生成する', () => {
        const mockRiskMetrics = {
          portfolioId: mockPortfolioId,
          date: new Date(),
          var95: 50000,
          var99: 75000,
          expectedShortfall: 60000,
          beta: 1.0,
          alpha: 0.01,
          correlationMatrix: {},
          sectorAllocation: { Technology: 50, Financial: 50 },
          concentrationRisk: 20,
          liquidityRisk: 40 // 高い流動性リスク
        };

        const mockBreakdown = {
          systematicRisk: 15,
          unsystematicRisk: 10,
          concentrationRisk: 20,
          liquidityRisk: 40,
          currencyRisk: 0
        };

        const result = (portfolioRiskService as any).generateRiskRecommendations(
          mockRiskMetrics,
          mockBreakdown
        );

        expect(result).toBeInstanceOf(Array);
        expect(result.some((rec: string) => rec.includes('流動性リスク'))).toBe(true);
      });

      it('高いベータに対する推奨事項を生成する', () => {
        const mockRiskMetrics = {
          portfolioId: mockPortfolioId,
          date: new Date(),
          var95: 50000,
          var99: 75000,
          expectedShortfall: 60000,
          beta: 1.8, // 高いベータ
          alpha: 0.01,
          correlationMatrix: {},
          sectorAllocation: { Technology: 50, Financial: 50 },
          concentrationRisk: 20,
          liquidityRisk: 20
        };

        const mockBreakdown = {
          systematicRisk: 25,
          unsystematicRisk: 10,
          concentrationRisk: 20,
          liquidityRisk: 20,
          currencyRisk: 0
        };

        const result = (portfolioRiskService as any).generateRiskRecommendations(
          mockRiskMetrics,
          mockBreakdown
        );

        expect(result).toBeInstanceOf(Array);
        expect(result.some((rec: string) => rec.includes('ベータ'))).toBe(true);
        expect(result.some((rec: string) => rec.includes('守備的'))).toBe(true);
      });

      it('リスクが適切な場合は良好メッセージを返す', () => {
        const mockRiskMetrics = {
          portfolioId: mockPortfolioId,
          date: new Date(),
          var95: 30000,
          var99: 45000,
          expectedShortfall: 35000,
          beta: 1.1,
          alpha: 0.01,
          correlationMatrix: {},
          sectorAllocation: { Technology: 30, Financial: 35, Healthcare: 35 },
          concentrationRisk: 15, // 適切な集中度
          liquidityRisk: 20 // 適切な流動性
        };

        const mockBreakdown = {
          systematicRisk: 12,
          unsystematicRisk: 8,
          concentrationRisk: 15,
          liquidityRisk: 20,
          currencyRisk: 0
        };

        const result = (portfolioRiskService as any).generateRiskRecommendations(
          mockRiskMetrics,
          mockBreakdown
        );

        expect(result).toBeInstanceOf(Array);
        expect(result.length).toBe(1);
        expect(result[0]).toContain('良好');
      });
    });

    describe('calculateConcentrationRisk', () => {
      it('集中リスクを正しく計算する', () => {
        const mockHoldings = [
          { symbol: 'AAPL', quantity: 100, averageCost: 150.00 }, // 15,000
          { symbol: 'GOOGL', quantity: 25, averageCost: 2000.00 }, // 50,000
          { symbol: 'MSFT', quantity: 200, averageCost: 300.00 } // 60,000
        ];
        const totalValue = 125000;

        const result = (portfolioRiskService as any).calculateConcentrationRisk(
          mockHoldings,
          totalValue
        );

        expect(result).toBeGreaterThan(0);
        expect(result).toBeLessThanOrEqual(100);
        expect(typeof result).toBe('number');

        // より集中したポートフォリオは高いスコアを持つ
        const concentratedHoldings = [
          { symbol: 'AAPL', quantity: 1000, averageCost: 150.00 } // 150,000 (100%)
        ];

        const concentratedResult = (portfolioRiskService as any).calculateConcentrationRisk(
          concentratedHoldings,
          150000
        );

        expect(concentratedResult).toBeGreaterThan(result);
      });

      it('空のホールディングの場合は0を返す', () => {
        const result = (portfolioRiskService as any).calculateConcentrationRisk([], 1000000);

        expect(result).toBe(0);
      });
    });
  });
});