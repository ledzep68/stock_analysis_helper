import { dataPersistenceService } from '../dataPersistenceService';
import { db } from '../../config/database';

// テスト用のモック設定
jest.mock('../../config/database');
const mockDb = db as jest.Mocked<typeof db>;

describe('DataPersistenceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('savePriceRecord', () => {
    it('should save price record to database', async () => {
      const mockRecord = {
        symbol: '7203',
        price: 2850.0,
        change: 15.0,
        changePercent: 0.53,
        volume: 12000000,
        marketCap: undefined,
        pe: undefined,
        eps: undefined,
        dividendYield: undefined,
        week52High: undefined,
        week52Low: undefined,
        timestamp: new Date(),
        source: 'live' as const
      };

      mockDb.run.mockResolvedValue({ changes: 1, lastID: 'test-id' });

      await dataPersistenceService.savePriceRecord(mockRecord);

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO real_time_prices'),
        expect.arrayContaining([
          expect.any(String), // id
          mockRecord.symbol,
          mockRecord.price,
          mockRecord.change,
          mockRecord.changePercent,
          mockRecord.volume,
          mockRecord.marketCap,
          mockRecord.pe,
          mockRecord.eps,
          mockRecord.dividendYield,
          mockRecord.week52High,
          mockRecord.week52Low,
          mockRecord.timestamp.toISOString(),
          mockRecord.source,
          expect.any(String) // created_at
        ])
      );
    });

    it('should handle database errors gracefully', async () => {
      const mockRecord = {
        symbol: '7203',
        price: 2850.0,
        change: 15.0,
        changePercent: 0.53,
        volume: 12000000,
        marketCap: undefined,
        pe: undefined,
        eps: undefined,
        dividendYield: undefined,
        week52High: undefined,
        week52Low: undefined,
        timestamp: new Date(),
        source: 'live' as const
      };

      const mockError = new Error('Database error');
      mockDb.run.mockRejectedValue(mockError);

      // エラーがスローされないことを確認
      await expect(dataPersistenceService.savePriceRecord(mockRecord)).resolves.not.toThrow();
    });
  });

  describe('cleanupOldData', () => {
    it('should remove data older than retention days', async () => {
      mockDb.run.mockResolvedValue({ changes: 10, lastID: null });

      await dataPersistenceService.cleanupOldData();

      expect(mockDb.run).toHaveBeenCalledWith(
        expect.stringContaining('DELETE FROM real_time_prices'),
        expect.arrayContaining([expect.any(String)])
      );
    });

    it('should handle cleanup errors gracefully', async () => {
      const mockError = new Error('Cleanup error');
      mockDb.run.mockRejectedValue(mockError);

      await expect(dataPersistenceService.cleanupOldData()).resolves.not.toThrow();
    });
  });

  describe('exportData', () => {
    const mockPriceData = [
      {
        id: 'test-1',
        symbol: '7203',
        price: 2850.0,
        change_amount: 15.0,
        change_percent: 0.53,
        volume: 12000000,
        timestamp: '2023-01-01T00:00:00.000Z',
        source: 'live'
      },
      {
        id: 'test-2',
        symbol: '7203',
        price: 2865.0,
        change_amount: 30.0,
        change_percent: 1.06,
        volume: 13000000,
        timestamp: '2023-01-01T01:00:00.000Z',
        source: 'live'
      }
    ];

    beforeEach(() => {
      mockDb.all.mockResolvedValue(mockPriceData);
    });

    it('should export data in JSON format', async () => {
      const result = await dataPersistenceService.exportData('7203', 'json');
      const parsedResult = JSON.parse(result);

      expect(parsedResult).toHaveLength(2);
      expect(parsedResult[0]).toHaveProperty('symbol', '7203');
      expect(parsedResult[0]).toHaveProperty('price', 2850.0);
    });

    it('should export data in CSV format', async () => {
      const result = await dataPersistenceService.exportData('7203', 'csv');

      expect(result).toContain('symbol,price,changeAmount,changePercent,volume,timestamp,source');
      expect(result).toContain('7203,2850,15,0.53,12000000,2023-01-01T00:00:00.000Z,live');
      expect(result).toContain('7203,2865,30,1.06,13000000,2023-01-01T01:00:00.000Z,live');
    });

    it('should handle export errors gracefully', async () => {
      const mockError = new Error('Export error');
      mockDb.all.mockRejectedValue(mockError);

      await expect(dataPersistenceService.exportData('7203', 'json')).rejects.toThrow('Export error');
    });
  });

  describe('getPriceStatistics', () => {
    it('should calculate price statistics correctly', async () => {
      const mockStatsData = {
        min_price: 2800.0,
        max_price: 2900.0,
        avg_price: 2850.0,
        record_count: 100,
        latest_timestamp: '2023-01-01T12:00:00.000Z'
      };

      mockDb.get.mockResolvedValue(mockStatsData);

      const result = await dataPersistenceService.getPriceStatistics('7203', 30);

      expect(result).toEqual({
        symbol: '7203',
        days: 30,
        minPrice: 2800.0,
        maxPrice: 2900.0,
        averagePrice: 2850.0,
        totalRecords: 100,
        priceRange: 100.0,
        volatility: expect.any(Number),
        latestTimestamp: '2023-01-01T12:00:00.000Z'
      });
    });

    it('should handle missing data gracefully', async () => {
      mockDb.get.mockResolvedValue(null);

      const result = await dataPersistenceService.getPriceStatistics('INVALID', 30);

      expect(result).toEqual({
        symbol: 'INVALID',
        days: 30,
        minPrice: 0,
        maxPrice: 0,
        averagePrice: 0,
        totalRecords: 0,
        priceRange: 0,
        volatility: 0,
        latestTimestamp: null
      });
    });
  });

  describe('checkDataIntegrity', () => {
    it('should return healthy status for good data', async () => {
      mockDb.get
        .mockResolvedValueOnce({ total_records: 1000 })
        .mockResolvedValueOnce({ duplicate_count: 0 })
        .mockResolvedValueOnce({ invalid_price_count: 0 })
        .mockResolvedValueOnce({ old_data_count: 0 });

      const result = await dataPersistenceService.checkDataIntegrity();

      expect(result.status).toBe('HEALTHY');
      expect(result.issues).toHaveLength(0);
      expect(result.totalRecords).toBe(1000);
    });

    it('should detect integrity issues', async () => {
      mockDb.get
        .mockResolvedValueOnce({ total_records: 1000 })
        .mockResolvedValueOnce({ duplicate_count: 5 })
        .mockResolvedValueOnce({ invalid_price_count: 2 })
        .mockResolvedValueOnce({ old_data_count: 100 });

      const result = await dataPersistenceService.checkDataIntegrity();

      expect(result.status).toBe('ISSUES_FOUND');
      expect(result.issues).toHaveLength(3);
      expect(result.issues).toContain('5 duplicate records found');
      expect(result.issues).toContain('2 records with invalid prices');
      expect(result.issues).toContain('100 records older than retention period');
    });
  });

  describe('optimizeDatabase', () => {
    it('should run database optimization commands', async () => {
      mockDb.run.mockResolvedValue({ changes: 0, lastID: null });

      await dataPersistenceService.optimizeDatabase();

      expect(mockDb.run).toHaveBeenCalledWith('VACUUM');
      expect(mockDb.run).toHaveBeenCalledWith('ANALYZE');
    });

    it('should handle optimization errors gracefully', async () => {
      const mockError = new Error('Optimization error');
      mockDb.run.mockRejectedValue(mockError);

      await expect(dataPersistenceService.optimizeDatabase()).resolves.not.toThrow();
    });
  });

  describe('startPersistence and stopPersistence', () => {
    it('should start and stop persistence intervals', () => {
      const originalSetInterval = global.setInterval;
      const originalClearInterval = global.clearInterval;
      const mockSetInterval = jest.fn();
      const mockClearInterval = jest.fn();

      global.setInterval = mockSetInterval;
      global.clearInterval = mockClearInterval;

      dataPersistenceService.startPersistence();
      expect(mockSetInterval).toHaveBeenCalled();

      dataPersistenceService.stopPersistence();
      expect(mockClearInterval).toHaveBeenCalled();

      global.setInterval = originalSetInterval;
      global.clearInterval = originalClearInterval;
    });
  });
});