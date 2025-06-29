import { portfolioService } from '../../services/portfolioService';
import { db } from '../../config/database';

// データベースモック
jest.mock('../../config/database', () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

describe('PortfolioService', () => {
  const mockUserId = 'user123';
  const mockPortfolioId = 'portfolio123';

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createPortfolio', () => {
    it('ポートフォリオを正常に作成する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        description: 'テスト用のポートフォリオです',
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });
      (db.get as jest.Mock).mockResolvedValue(mockPortfolio);

      const result = await portfolioService.createPortfolio(
        mockUserId,
        'テストポートフォリオ',
        'テスト用のポートフォリオです',
        1000000,
        'JPY'
      );

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO portfolios'),
        expect.arrayContaining([
          expect.any(String),
          mockUserId,
          'テストポートフォリオ',
          'テスト用のポートフォリオです',
          1000000,
          'JPY',
          true,
          expect.any(String),
          expect.any(String)
        ])
      );

      expect(result).toEqual(expect.objectContaining({
        name: 'テストポートフォリオ',
        description: 'テスト用のポートフォリオです',
        initialCapital: 1000000,
        currency: 'JPY'
      }));
    });

    it('名前が空の場合エラーを投げる', async () => {
      await expect(
        portfolioService.createPortfolio(mockUserId, '', 'テスト', 1000000, 'JPY')
      ).rejects.toThrow('Portfolio name cannot be empty');
    });

    it('初期資本が0以下の場合エラーを投げる', async () => {
      await expect(
        portfolioService.createPortfolio(mockUserId, 'テスト', 'テスト', -1000, 'JPY')
      ).rejects.toThrow('Initial capital must be positive');
    });
  });

  describe('getPortfolioById', () => {
    it('ポートフォリオを正常に取得する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        description: 'テスト用のポートフォリオです',
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      (db.get as jest.Mock).mockResolvedValue(mockPortfolio);

      const result = await portfolioService.getPortfolioById(mockPortfolioId, mockUserId);

      expect(db.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM portfolios'),
        [mockPortfolioId, mockUserId]
      );

      expect(result).toEqual(mockPortfolio);
    });

    it('存在しないポートフォリオの場合nullを返す', async () => {
      (db.get as jest.Mock).mockResolvedValue(undefined);

      const result = await portfolioService.getPortfolioById('nonexistent', mockUserId);

      expect(result).toBeNull();
    });
  });

  describe('getPortfoliosByUser', () => {
    it('ユーザーのポートフォリオ一覧を取得する', async () => {
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

      (db.all as jest.Mock).mockResolvedValue(mockPortfolios);

      const result = await portfolioService.getPortfoliosByUser(mockUserId);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM portfolios'),
        [mockUserId]
      );

      expect(result).toEqual(mockPortfolios);
      expect(result).toHaveLength(2);
    });

    it('ポートフォリオが存在しない場合は空配列を返す', async () => {
      (db.all as jest.Mock).mockResolvedValue([]);

      const result = await portfolioService.getPortfoliosByUser(mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('addTransaction', () => {
    const mockTransaction = {
      symbol: 'AAPL',
      transactionType: 'BUY' as const,
      quantity: 100,
      price: 150.00,
      totalAmount: 15000,
      fees: 10,
      transactionDate: new Date(),
      notes: 'テスト取引'
    };

    it('取引を正常に追加する', async () => {
      const mockSavedTransaction = {
        id: 'transaction123',
        portfolioId: mockPortfolioId,
        ...mockTransaction,
        createdAt: new Date().toISOString()
      };

      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });
      (db.get as jest.Mock).mockResolvedValue(mockSavedTransaction);

      const result = await portfolioService.addTransaction(
        mockPortfolioId,
        mockUserId,
        mockTransaction
      );

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO portfolio_transactions'),
        expect.arrayContaining([
          expect.any(String),
          mockPortfolioId,
          mockTransaction.symbol,
          mockTransaction.transactionType,
          mockTransaction.quantity,
          mockTransaction.price,
          mockTransaction.totalAmount,
          mockTransaction.fees,
          expect.any(String),
          mockTransaction.notes,
          expect.any(String)
        ])
      );

      expect(result).toEqual(mockSavedTransaction);
    });

    it('不正な取引タイプの場合エラーを投げる', async () => {
      const invalidTransaction = {
        ...mockTransaction,
        transactionType: 'INVALID' as any
      };

      await expect(
        portfolioService.addTransaction(mockPortfolioId, mockUserId, invalidTransaction)
      ).rejects.toThrow('Invalid transaction type');
    });

    it('数量が0以下の場合エラーを投げる', async () => {
      const invalidTransaction = {
        ...mockTransaction,
        quantity: 0
      };

      await expect(
        portfolioService.addTransaction(mockPortfolioId, mockUserId, invalidTransaction)
      ).rejects.toThrow('Quantity must be positive');
    });

    it('価格が0以下の場合エラーを投げる', async () => {
      const invalidTransaction = {
        ...mockTransaction,
        price: 0
      };

      await expect(
        portfolioService.addTransaction(mockPortfolioId, mockUserId, invalidTransaction)
      ).rejects.toThrow('Price must be positive');
    });
  });

  describe('getPortfolioSummary', () => {
    it('ポートフォリオサマリーを正常に取得する', async () => {
      const mockPortfolio = {
        id: mockPortfolioId,
        userId: mockUserId,
        name: 'テストポートフォリオ',
        description: 'テスト用のポートフォリオです',
        initialCapital: 1000000,
        currency: 'JPY',
        isActive: 1,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00,
          currentPrice: 160.00,
          marketValue: 16000,
          unrealizedPnL: 1000,
          percentAllocation: 50.0
        },
        {
          symbol: 'GOOGL',
          quantity: 50,
          averageCost: 2000.00,
          currentPrice: 2100.00,
          marketValue: 105000,
          unrealizedPnL: 5000,
          percentAllocation: 50.0
        }
      ];

      (db.get as jest.Mock).mockResolvedValue(mockPortfolio);
      (db.all as jest.Mock).mockResolvedValue(mockHoldings);

      const result = await portfolioService.getPortfolioSummary(mockPortfolioId, mockUserId);

      expect(result).toEqual(expect.objectContaining({
        portfolio: mockPortfolio,
        totalValue: expect.any(Number),
        totalCost: expect.any(Number),
        unrealizedPnL: expect.any(Number),
        realizedPnL: expect.any(Number),
        totalReturn: expect.any(Number),
        totalReturnPercent: expect.any(Number),
        holdingsCount: mockHoldings.length,
        topHoldings: expect.any(Array)
      }));

      expect(result.holdingsCount).toBe(2);
      expect(result.topHoldings).toHaveLength(2);
    });

    it('存在しないポートフォリオの場合エラーを投げる', async () => {
      (db.get as jest.Mock).mockResolvedValue(null);

      await expect(
        portfolioService.getPortfolioSummary('nonexistent', mockUserId)
      ).rejects.toThrow('Portfolio not found');
    });
  });

  describe('getPortfolioHoldings', () => {
    it('ポートフォリオの保有銘柄を取得する', async () => {
      const mockHoldings = [
        {
          symbol: 'AAPL',
          quantity: 100,
          averageCost: 150.00,
          currentPrice: 160.00,
          marketValue: 16000,
          unrealizedPnL: 1000,
          percentAllocation: 60.0
        },
        {
          symbol: 'GOOGL',
          quantity: 25,
          averageCost: 2000.00,
          currentPrice: 2200.00,
          marketValue: 55000,
          unrealizedPnL: 5000,
          percentAllocation: 40.0
        }
      ];

      (db.all as jest.Mock).mockResolvedValue(mockHoldings);

      const result = await portfolioService.getPortfolioHoldings(mockPortfolioId, mockUserId);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT'),
        expect.arrayContaining([mockPortfolioId])
      );

      expect(result).toEqual(mockHoldings);
      expect(result).toHaveLength(2);
    });

    it('保有銘柄が存在しない場合は空配列を返す', async () => {
      (db.all as jest.Mock).mockResolvedValue([]);

      const result = await portfolioService.getPortfolioHoldings(mockPortfolioId, mockUserId);

      expect(result).toEqual([]);
    });
  });

  describe('updatePortfolio', () => {
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

      (db.run as jest.Mock).mockResolvedValue({ changes: 1 });
      (db.get as jest.Mock).mockResolvedValue(mockUpdatedPortfolio);

      const result = await portfolioService.updatePortfolio(mockPortfolioId, mockUserId, updates);

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE portfolios SET'),
        expect.arrayContaining([
          updates.name,
          updates.description,
          expect.any(String),
          mockPortfolioId,
          mockUserId
        ])
      );

      expect(result).toEqual(mockUpdatedPortfolio);
    });

    it('存在しないポートフォリオの場合nullを返す', async () => {
      (db.run as jest.Mock).mockResolvedValue({ changes: 0 });

      const result = await portfolioService.updatePortfolio(
        'nonexistent',
        mockUserId,
        { name: '新しい名前' }
      );

      expect(result).toBeNull();
    });
  });

  describe('deletePortfolio', () => {
    it('ポートフォリオを正常に削除する', async () => {
      (db.run as jest.Mock)
        .mockResolvedValueOnce({ changes: 1 }) // DELETE transactions
        .mockResolvedValueOnce({ changes: 1 }) // DELETE holdings
        .mockResolvedValueOnce({ changes: 1 }); // DELETE portfolio

      const result = await portfolioService.deletePortfolio(mockPortfolioId, mockUserId);

      expect(db.run).toHaveBeenCalledTimes(3);
      expect(result).toBe(true);
    });

    it('存在しないポートフォリオの場合falseを返す', async () => {
      (db.run as jest.Mock)
        .mockResolvedValueOnce({ changes: 0 }) // DELETE transactions
        .mockResolvedValueOnce({ changes: 0 }) // DELETE holdings
        .mockResolvedValueOnce({ changes: 0 }); // DELETE portfolio

      const result = await portfolioService.deletePortfolio('nonexistent', mockUserId);

      expect(result).toBe(false);
    });
  });
});