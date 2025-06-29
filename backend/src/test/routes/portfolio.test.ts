import request from 'supertest';
import express from 'express';
import portfolioRouter from '../../routes/portfolio';
import { portfolioService } from '../../services/portfolioService';
import { portfolioPerformanceService } from '../../services/portfolioPerformanceService';
import { portfolioRiskService } from '../../services/portfolioRiskService';
import { authenticateToken } from '../../middleware/auth';

// モック設定
jest.mock('../../services/portfolioService');
jest.mock('../../services/portfolioPerformanceService');
jest.mock('../../services/portfolioRiskService');
jest.mock('../../middleware/auth');

const app = express();
app.use(express.json());
app.use('/portfolio', portfolioRouter);

describe('Portfolio Routes', () => {
  const mockUserId = 'user123';
  const mockPortfolioId = 'portfolio123';

  beforeEach(() => {
    jest.clearAllMocks();
    (authenticateToken as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
      req.user = { id: mockUserId };
      next();
    });
  });

  describe('GET /portfolio', () => {
    it('ユーザーのポートフォリオ一覧を正常に取得する', async () => {
      const mockPortfolios = [
        {
          id: 'portfolio1',
          userId: mockUserId,
          name: 'ポートフォリオ1',
          description: 'テスト1',
          initialCapital: 1000000,
          currency: 'JPY',
          isActive: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        {
          id: 'portfolio2',
          userId: mockUserId,
          name: 'ポートフォリオ2',
          description: 'テスト2',
          initialCapital: 2000000,
          currency: 'JPY',
          isActive: 1,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];

      (portfolioService.getPortfoliosByUser as jest.Mock).mockResolvedValue(mockPortfolios);

      const response = await request(app)
        .get('/portfolio')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolios).toEqual(mockPortfolios);
      expect(response.body.data.total).toBe(2);
      expect(portfolioService.getPortfoliosByUser).toHaveBeenCalledWith(mockUserId);
    });

    it('ポートフォリオが存在しない場合は空配列を返す', async () => {
      (portfolioService.getPortfoliosByUser as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/portfolio')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolios).toEqual([]);
      expect(response.body.data.total).toBe(0);
    });

    it('認証されていない場合は401エラーを返す', async () => {
      (authenticateToken as jest.Mock).mockImplementation((req: any, res: any, next: any) => {
        req.user = undefined;
        next();
      });

      const response = await request(app)
        .get('/portfolio')
        .expect(401);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('User not authenticated');
    });
  });

  describe('POST /portfolio', () => {
    it('ポートフォリオを正常に作成する', async () => {
      const newPortfolio = {
        name: '新しいポートフォリオ',
        description: 'テスト用ポートフォリオ',
        initialCapital: 1500000,
        currency: 'JPY'
      };

      const mockCreatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        ...newPortfolio,
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (portfolioService.createPortfolio as jest.Mock).mockResolvedValue(mockCreatedPortfolio);

      const response = await request(app)
        .post('/portfolio')
        .send(newPortfolio)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio).toEqual(mockCreatedPortfolio);
      expect(portfolioService.createPortfolio).toHaveBeenCalledWith(
        mockUserId,
        newPortfolio.name,
        newPortfolio.description,
        newPortfolio.initialCapital,
        newPortfolio.currency
      );
    });

    it('必要なフィールドが欠けている場合は400エラーを返す', async () => {
      const invalidPortfolio = {
        description: 'テスト用ポートフォリオ',
        initialCapital: 1500000
        // nameが欠けている
      };

      const response = await request(app)
        .post('/portfolio')
        .send(invalidPortfolio)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Portfolio name is required');
    });

    it('空の名前の場合は400エラーを返す', async () => {
      const invalidPortfolio = {
        name: '   ', // 空白のみ
        description: 'テスト用ポートフォリオ',
        initialCapital: 1500000
      };

      const response = await request(app)
        .post('/portfolio')
        .send(invalidPortfolio)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Portfolio name is required');
    });

    it('デフォルト値で正常に作成する', async () => {
      const minimalPortfolio = {
        name: 'シンプルポートフォリオ'
      };

      const mockCreatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'シンプルポートフォリオ',
        description: undefined,
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (portfolioService.createPortfolio as jest.Mock).mockResolvedValue(mockCreatedPortfolio);

      const response = await request(app)
        .post('/portfolio')
        .send(minimalPortfolio)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(portfolioService.createPortfolio).toHaveBeenCalledWith(
        mockUserId,
        'シンプルポートフォリオ',
        undefined,
        1000000,
        'JPY'
      );
    });
  });

  describe('GET /portfolio/:portfolioId', () => {
    it('ポートフォリオ詳細を正常に取得する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        description: 'テスト用',
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(mockPortfolio);

      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio).toEqual(mockPortfolio);
      expect(portfolioService.getPortfolioById).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
    });

    it('存在しないポートフォリオの場合は404エラーを返す', async () => {
      (portfolioService.getPortfolioById as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/portfolio/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Portfolio not found');
    });
  });

  describe('PUT /portfolio/:portfolioId', () => {
    it('ポートフォリオを正常に更新する', async () => {
      const updates = {
        name: '更新されたポートフォリオ',
        description: '更新された説明'
      };

      const mockUpdatedPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        ...updates,
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (portfolioService.updatePortfolio as jest.Mock).mockResolvedValue(mockUpdatedPortfolio);

      const response = await request(app)
        .put(`/portfolio/${mockPortfolioId}`)
        .send(updates)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.portfolio).toEqual(mockUpdatedPortfolio);
      expect(portfolioService.updatePortfolio).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId,
        { name: updates.name, description: updates.description }
      );
    });

    it('存在しないポートフォリオの場合は404エラーを返す', async () => {
      (portfolioService.updatePortfolio as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .put('/portfolio/nonexistent')
        .send({ name: '新しい名前' })
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Portfolio not found');
    });
  });

  describe('DELETE /portfolio/:portfolioId', () => {
    it('ポートフォリオを正常に削除する', async () => {
      (portfolioService.deletePortfolio as jest.Mock).mockResolvedValue(true);

      const response = await request(app)
        .delete(`/portfolio/${mockPortfolioId}`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.message).toBe('Portfolio deleted successfully');
      expect(portfolioService.deletePortfolio).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
    });

    it('存在しないポートフォリオの場合は404エラーを返す', async () => {
      (portfolioService.deletePortfolio as jest.Mock).mockResolvedValue(false);

      const response = await request(app)
        .delete('/portfolio/nonexistent')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Portfolio not found');
    });
  });

  describe('GET /portfolio/:portfolioId/summary', () => {
    it('ポートフォリオサマリーを正常に取得する', async () => {
      const mockSummary = {
        portfolio: {
          id: mockPortfolioId,
          name: 'テストポートフォリオ'
        },
        totalValue: 1100000,
        totalCost: 1000000,
        unrealizedPnL: 100000,
        realizedPnL: 0,
        totalReturn: 100000,
        totalReturnPercent: 10.0,
        holdingsCount: 5,
        topHoldings: []
      };

      (portfolioService.getPortfolioSummary as jest.Mock).mockResolvedValue(mockSummary);

      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}/summary`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.summary).toEqual(mockSummary);
      expect(portfolioService.getPortfolioSummary).toHaveBeenCalledWith(mockPortfolioId, mockUserId);
    });
  });

  describe('POST /portfolio/:portfolioId/transactions', () => {
    it('取引を正常に追加する', async () => {
      const newTransaction = {
        symbol: 'AAPL',
        transactionType: 'BUY',
        quantity: 100,
        price: 150.50,
        fees: 10,
        notes: 'テスト取引'
      };

      const mockCreatedTransaction = {
        id: 'transaction123',
        portfolioId: mockPortfolioId,
        ...newTransaction,
        totalAmount: 15050,
        transactionDate: new Date().toISOString(),
        createdAt: new Date().toISOString()
      };

      (portfolioService.addTransaction as jest.Mock).mockResolvedValue(mockCreatedTransaction);

      const response = await request(app)
        .post(`/portfolio/${mockPortfolioId}/transactions`)
        .send(newTransaction)
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.transaction).toEqual(mockCreatedTransaction);
      expect(portfolioService.addTransaction).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId,
        expect.objectContaining({
          symbol: 'AAPL',
          transactionType: 'BUY',
          quantity: 100,
          price: 150.50,
          totalAmount: 15050,
          fees: 10,
          notes: 'テスト取引'
        })
      );
    });

    it('必要なフィールドが欠けている場合は400エラーを返す', async () => {
      const invalidTransaction = {
        symbol: 'AAPL',
        transactionType: 'BUY',
        // quantityとpriceが欠けている
        fees: 10
      };

      const response = await request(app)
        .post(`/portfolio/${mockPortfolioId}/transactions`)
        .send(invalidTransaction)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Required fields: symbol, transactionType, quantity, price');
    });

    it('不正な取引タイプの場合は400エラーを返す', async () => {
      const invalidTransaction = {
        symbol: 'AAPL',
        transactionType: 'INVALID',
        quantity: 100,
        price: 150.50
      };

      const response = await request(app)
        .post(`/portfolio/${mockPortfolioId}/transactions`)
        .send(invalidTransaction)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid transaction type');
    });

    it('負の数量や価格の場合は400エラーを返す', async () => {
      const invalidTransaction = {
        symbol: 'AAPL',
        transactionType: 'BUY',
        quantity: -100,
        price: 150.50
      };

      const response = await request(app)
        .post(`/portfolio/${mockPortfolioId}/transactions`)
        .send(invalidTransaction)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Quantity and price must be positive');
    });
  });

  describe('GET /portfolio/:portfolioId/performance', () => {
    it('パフォーマンス履歴を正常に取得する', async () => {
      const mockHistory = [
        {
          date: '2024-01-01',
          totalValue: 1000000,
          dailyReturn: 0,
          cumulativeReturn: 0
        },
        {
          date: '2024-01-02',
          totalValue: 1050000,
          dailyReturn: 5.0,
          cumulativeReturn: 5.0
        }
      ];

      (portfolioPerformanceService.getPerformanceHistory as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}/performance?days=30`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.history).toEqual(mockHistory);
      expect(response.body.data.total).toBe(2);
      expect(portfolioPerformanceService.getPerformanceHistory).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId,
        30
      );
    });
  });

  describe('GET /portfolio/:portfolioId/analysis', () => {
    it('パフォーマンス分析を正常に実行する', async () => {
      const mockAnalysis = {
        period: '1Y',
        startValue: 1000000,
        endValue: 1200000,
        totalReturn: 200000,
        totalReturnPercent: 20.0,
        annualizedReturn: 18.5,
        volatility: 15.2,
        sharpeRatio: 1.21,
        maxDrawdown: -8.5
      };

      (portfolioPerformanceService.analyzePerformance as jest.Mock).mockResolvedValue(mockAnalysis);

      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}/analysis?period=1Y`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.analysis).toEqual(mockAnalysis);
      expect(portfolioPerformanceService.analyzePerformance).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId,
        '1Y'
      );
    });

    it('不正な期間の場合は400エラーを返す', async () => {
      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}/analysis?period=INVALID`)
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Invalid period. Use 1M, 3M, 6M, 1Y, or ALL');
    });
  });

  describe('GET /portfolio/:portfolioId/risk', () => {
    it('リスク分析を正常に実行する', async () => {
      const mockRiskAnalysis = {
        overall: {
          portfolioId: mockPortfolioId,
          var95: 50000,
          var99: 75000,
          expectedShortfall: 60000,
          beta: 1.15,
          alpha: 0.02,
          correlationMatrix: {},
          sectorAllocation: { Technology: 60, Financial: 40 },
          concentrationRisk: 25,
          liquidityRisk: 20
        },
        breakdown: {
          systematicRisk: 15,
          unsystematicRisk: 10,
          concentrationRisk: 25,
          liquidityRisk: 20,
          currencyRisk: 0
        },
        recommendations: ['分散投資を推奨します']
      };

      (portfolioRiskService.analyzePortfolioRisk as jest.Mock).mockResolvedValue(mockRiskAnalysis);

      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}/risk`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riskAnalysis).toEqual(mockRiskAnalysis);
      expect(portfolioRiskService.analyzePortfolioRisk).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId
      );
    });
  });

  describe('POST /portfolio/:portfolioId/stress-test', () => {
    it('ストレステストを正常に実行する', async () => {
      const mockStressTestResults = [
        {
          scenario: '市場暴落シナリオ (-20%)',
          portfolioImpact: -220000,
          impactPercent: -20.0,
          worstHolding: {
            symbol: 'AAPL',
            impact: -32000,
            impactPercent: -2.9
          },
          recoveryTime: 40
        },
        {
          scenario: '金融危機シナリオ (-35%)',
          portfolioImpact: -385000,
          impactPercent: -35.0,
          worstHolding: {
            symbol: 'GOOGL',
            impact: -55000,
            impactPercent: -5.0
          },
          recoveryTime: 70
        }
      ];

      (portfolioRiskService.runStressTest as jest.Mock).mockResolvedValue(mockStressTestResults);

      const response = await request(app)
        .post(`/portfolio/${mockPortfolioId}/stress-test`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.stressTestResults).toEqual(mockStressTestResults);
      expect(response.body.data.total).toBe(2);
      expect(portfolioRiskService.runStressTest).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId
      );
    });
  });

  describe('GET /portfolio/:portfolioId/var', () => {
    it('VaRを正常に計算する', async () => {
      const mockVaR = {
        var: 50000,
        expectedShortfall: 65000
      };

      (portfolioRiskService.calculateVaR as jest.Mock).mockResolvedValue(mockVaR);

      const response = await request(app)
        .get(`/portfolio/${mockPortfolioId}/var?confidence=0.95&timeHorizon=1`)
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.var95).toEqual(mockVaR);
      expect(portfolioRiskService.calculateVaR).toHaveBeenCalledWith(
        mockPortfolioId,
        mockUserId,
        0.95,
        1
      );
    });
  });

  describe('Error handling', () => {
    it('サービスエラーの場合は500エラーを返す', async () => {
      (portfolioService.getPortfoliosByUser as jest.Mock).mockRejectedValue(
        new Error('Database connection failed')
      );

      const response = await request(app)
        .get('/portfolio')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('Failed to get portfolios');
    });
  });
});