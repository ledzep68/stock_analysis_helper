import { portfolioPerformanceService } from '../../services/portfolioPerformanceService';
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

describe('PortfolioPerformanceService', () => {
  const mockUserId = 'user123';
  const mockPortfolioId = 'portfolio123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('calculateAndSavePerformance', () => {
    it('パフォーマンスを正常に計算・保存する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        initialCapital: 1000000,
        currency: 'JPY'
      };

      const mockSummary = {
        portfolio: mockPortfolio,
        totalValue: 1100000,
        totalCost: 1000000,
        unrealizedPnL: 100000,
        realizedPnL: 0,
        totalReturn: 100000,
        totalReturnPercent: 10.0,
        holdingsCount: 5,
        topHoldings: []
      };

      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(mockPortfolio);
      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);
      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });
      (db.get as jest.Mock).mockResolvedValue({
        id: 'perf123',
        portfolioId: mockPortfolioId,
        date: new Date().toISOString().split('T')[0],
        totalValue: 1100000,
        totalReturn: 100000,
        dailyReturn: 1.5,
        cumulativeReturn: 10.0,
        volatility: 15.2,
        sharpeRatio: 0.85,
        maxDrawdown: -5.2,
        alpha: 0.02,
        beta: 1.15,
        createdAt: new Date().toISOString()
      });

      const result = await portfolioPerformanceService.calculateAndSavePerformance(
        mockPortfolioId,
        mockUserId
      );

      expect(portfolioService.getPortfolioById).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
      expect(portfolioService.getPortfolioSummary).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO portfolio_performance'),
        expect.arrayContaining([
          expect.any(String),
          mockPortfolioId,
          expect.any(String),
          1100000,
          100000,
          expect.any(Number),
          10.0,
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(Number),
          expect.any(String)
        ])
      );

      expect(result).toEqual(expect.objectContaining({
        portfolioId: mockPortfolioId,
        totalValue: 1100000,
        totalReturn: 100000
      }));
    });

    it('存在しないポートフォリオの場合エラーを投げる', async () => {
      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(null);

      await expect(
        portfolioPerformanceService.calculateAndSavePerformance('nonexistent', mockUserId)
      ).rejects.toThrow('Portfolio not found');
    });
  });

  describe('getPerformanceHistory', () => {
    it('パフォーマンス履歴を正常に取得する', async () => {
      const mockHistory = [
        {
          date: '2024-01-01',
          totalValue: 1000000,
          totalReturn: 0,
          dailyReturn: 0,
          cumulativeReturn: 0,
          volatility: 0,
          sharpeRatio: 0,
          maxDrawdown: 0
        },
        {
          date: '2024-01-02',
          totalValue: 1050000,
          totalReturn: 50000,
          dailyReturn: 5.0,
          cumulativeReturn: 5.0,
          volatility: 2.5,
          sharpeRatio: 1.2,
          maxDrawdown: -1.0
        },
        {
          date: '2024-01-03',
          totalValue: 1100000,
          totalReturn: 100000,
          dailyReturn: 4.76,
          cumulativeReturn: 10.0,
          volatility: 3.8,
          sharpeRatio: 1.5,
          maxDrawdown: -2.1
        }
      ];

      (db.all as jest.Mock).mockResolvedValue(mockHistory);

      const result = await portfolioPerformanceService.getPerformanceHistory(
        mockPortfolioId,
        mockUserId,
        30
      );

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        [mockPortfolioId, 30]
      );

      expect(result).toEqual(mockHistory);
      expect(result).toHaveLength(3);
    });

    it('履歴が存在しない場合は空配列を返す', async () => {
      (db.all as jest.Mock).mockResolvedValue([]);

      const result = await portfolioPerformanceService.getPerformanceHistory(
        mockPortfolioId,
        mockUserId,
        30
      );

      expect(result).toEqual([]);
    });
  });

  describe('analyzePerformance', () => {
    it('パフォーマンス分析を正常に実行する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        initialCapital: 1000000
      };

      const mockHistory = [
        { date: '2024-01-01', totalValue: 1000000, dailyReturn: 0, cumulativeReturn: 0 },
        { date: '2024-01-02', totalValue: 1050000, dailyReturn: 5.0, cumulativeReturn: 5.0 },
        { date: '2024-01-03', totalValue: 1100000, dailyReturn: 4.76, cumulativeReturn: 10.0 }
      ];

      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(mockPortfolio);
      (db.all as jest.Mock).mockResolvedValue(mockHistory);

      const result = await portfolioPerformanceService.analyzePerformance(
        mockPortfolioId,
        mockUserId,
        '1M'
      );

      expect(result).toEqual(expect.objectContaining({
        period: '1M',
        startValue: expect.any(Number),
        endValue: expect.any(Number),
        totalReturn: expect.any(Number),
        totalReturnPercent: expect.any(Number),
        annualizedReturn: expect.any(Number),
        volatility: expect.any(Number),
        sharpeRatio: expect.any(Number),
        maxDrawdown: expect.any(Number),
        bestDay: expect.any(Object),
        worstDay: expect.any(Object),
        positiveReturns: expect.any(Number),
        negativeReturns: expect.any(Number),
        averageReturn: expect.any(Number)
      }));

      expect(result.period).toBe('1M');
      expect(result.totalReturnPercent).toBeGreaterThan(0);
    });

    it('データが不十分な場合はデフォルト値を返す', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        initialCapital: 1000000
      };

      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(mockPortfolio);
      (db.all as jest.Mock).mockResolvedValue([]);

      const result = await portfolioPerformanceService.analyzePerformance(
        mockPortfolioId,
        mockUserId,
        '1M'
      );

      expect(result.totalReturn).toBe(0);
      expect(result.totalReturnPercent).toBe(0);
      expect(result.volatility).toBe(0);
    });

    it('不正な期間の場合エラーを投げる', async () => {
      await expect(
        portfolioPerformanceService.analyzePerformance(
          mockPortfolioId,
          mockUserId,
          'INVALID' as any
        )
      ).rejects.toThrow('Invalid period');
    });
  });

  describe('compareToBenchmark', () => {
    it('ベンチマーク比較を正常に実行する', async () => {
      const mockPortfolioReturns = [
        { date: '2024-01-01', dailyReturn: 0 },
        { date: '2024-01-02', dailyReturn: 2.0 },
        { date: '2024-01-03', dailyReturn: 1.5 }
      ];

      const mockBenchmarkReturns = [
        { date: '2024-01-01', dailyReturn: 0 },
        { date: '2024-01-02', dailyReturn: 1.0 },
        { date: '2024-01-03', dailyReturn: 0.8 }
      ];

      (db.all as jest.Mock)
        .mockResolvedValueOnce(mockPortfolioReturns) // Portfolio returns
        .mockResolvedValueOnce(mockBenchmarkReturns); // Benchmark returns

      const result = await portfolioPerformanceService.compareToBenchmark(
        mockPortfolioId,
        mockUserId,
        'TOPIX',
        252
      );

      expect(result).toEqual(expect.objectContaining({
        benchmark: 'TOPIX',
        portfolioReturn: expect.any(Number),
        benchmarkReturn: expect.any(Number),
        excessReturn: expect.any(Number),
        trackingError: expect.any(Number),
        informationRatio: expect.any(Number),
        beta: expect.any(Number),
        alpha: expect.any(Number),
        correlation: expect.any(Number),
        upCapture: expect.any(Number),
        downCapture: expect.any(Number)
      }));

      expect(result).toEqual(expect.objectContaining({
        portfolioReturn: expect.any(Number),
        benchmarkReturn: expect.any(Number)
      }));
    });

    it('データが不十分な場合はデフォルト値を返す', async () => {
      (db.all as jest.Mock)
        .mockResolvedValueOnce([]) // Portfolio returns
        .mockResolvedValueOnce([]); // Benchmark returns

      const result = await portfolioPerformanceService.compareToBenchmark(
        mockPortfolioId,
        mockUserId,
        'TOPIX',
        252
      );

      expect(result.portfolioReturn).toBe(0);
      expect(result.benchmarkReturn).toBe(0);
      expect(result).toEqual(expect.objectContaining({
        portfolioReturn: 0,
        benchmarkReturn: 0
      }));
      expect(result.beta).toBe(1);
      expect(result.alpha).toBe(0);
    });
  });

  describe('calculateSharpeRatio', () => {
    it('シャープレシオを正常に計算する', async () => {
      const returns = [1.0, 2.0, -0.5, 1.5, 0.8];
      const riskFreeRate = 0.02;

      const result = await (portfolioPerformanceService as any).calculateSharpeRatio(returns, riskFreeRate);

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('リターンが空の場合は0を返す', async () => {
      const result = await (portfolioPerformanceService as any).calculateSharpeRatio([], 0.02);

      expect(result).toBe(0);
    });

    it('ボラティリティが0の場合は0を返す', async () => {
      const returns = [1.0, 1.0, 1.0, 1.0]; // 同じリターン

      const result = await (portfolioPerformanceService as any).calculateSharpeRatio(returns, 0.02);

      expect(result).toBe(0);
    });
  });

  describe('calculateVolatility', () => {
    it('ボラティリティを正常に計算する', async () => {
      const returns = [1.0, 2.0, -0.5, 1.5, 0.8];

      const result = await (portfolioPerformanceService as any).calculateVolatility(returns);

      expect(result).toBeGreaterThan(0);
      expect(typeof result).toBe('number');
    });

    it('リターンが空の場合は0を返す', async () => {
      const result = await (portfolioPerformanceService as any).calculateVolatility([]);

      expect(result).toBe(0);
    });

    it('リターンが1つの場合は0を返す', async () => {
      const result = await (portfolioPerformanceService as any).calculateVolatility([1.0]);

      expect(result).toBe(0);
    });
  });

  describe('calculateMaxDrawdown', () => {
    it('最大ドローダウンを正常に計算する', async () => {
      const values = [1000000, 1100000, 1050000, 900000, 950000, 1200000];

      const result = await (portfolioPerformanceService as any).calculateMaxDrawdown(values);

      expect(result).toBeLessThan(0); // ドローダウンは負の値
      expect(typeof result).toBe('number');
    });

    it('常に上昇の場合は0を返す', async () => {
      const values = [1000000, 1100000, 1200000, 1300000];

      const result = await (portfolioPerformanceService as any).calculateMaxDrawdown(values);

      expect(result).toBe(0);
    });

    it('値が空の場合は0を返す', async () => {
      const result = await (portfolioPerformanceService as any).calculateMaxDrawdown([]);

      expect(result).toBe(0);
    });
  });
});