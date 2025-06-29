import { realTimePriceService } from '../realTimePriceService';
import { hybridApiService } from '../hybridApiService';

// Mock dependencies
jest.mock('../hybridApiService');

const mockHybridApiService = hybridApiService as jest.Mocked<typeof hybridApiService>;

describe('RealTimePriceService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    // Clear cache before each test
    (realTimePriceService as any).priceCache.clear();
  });

  describe('getPriceUpdate', () => {
    const symbol = '7203';
    const mockFinancialData = {
      symbol,
      price: 2500,
      change: 50,
      changePercent: 2.0,
      volume: 1000000,
      marketCap: 25000000000,
      pe: 12.5,
      eps: 200,
      dividendYield: 0.025,
      week52High: 2800,
      week52Low: 2000,
      previousClose: 2450,
      timestamp: new Date()
    };

    it('should fetch and return price update', async () => {
      mockHybridApiService.getFinancialData.mockResolvedValue(mockFinancialData);

      const result = await realTimePriceService.getPriceUpdate(symbol);

      expect(mockHybridApiService.getFinancialData).toHaveBeenCalledWith(symbol);
      expect(result).toEqual({
        symbol,
        price: 2500,
        change: 50,
        changePercent: 2.0,
        volume: 1000000,
        timestamp: expect.any(Date),
        source: 'live'
      });
    });

    it('should return cached data if still valid', async () => {
      // First call to populate cache
      mockHybridApiService.getFinancialData.mockResolvedValue(mockFinancialData);
      await realTimePriceService.getPriceUpdate(symbol);

      // Second call should use cache
      mockHybridApiService.getFinancialData.mockClear();
      const result = await realTimePriceService.getPriceUpdate(symbol);

      expect(mockHybridApiService.getFinancialData).not.toHaveBeenCalled();
      expect(result).toEqual({
        symbol,
        price: 2500,
        change: 50,
        changePercent: 2.0,
        volume: 1000000,
        timestamp: expect.any(Date),
        source: 'live'
      });
    });

    it('should refresh cache when expired', async () => {
      // Mock cache with expired data
      const expiredData = {
        ...mockFinancialData,
        timestamp: new Date(Date.now() - 60000) // 1 minute ago
      };
      
      (realTimePriceService as any).priceCache.set(symbol, {
        data: expiredData,
        timestamp: new Date(Date.now() - 60000)
      });

      mockHybridApiService.getFinancialData.mockResolvedValue(mockFinancialData);

      const result = await realTimePriceService.getPriceUpdate(symbol);

      expect(mockHybridApiService.getFinancialData).toHaveBeenCalledWith(symbol);
      expect(result).toEqual({
        symbol,
        price: 2500,
        change: 50,
        changePercent: 2.0,
        volume: 1000000,
        timestamp: expect.any(Date),
        source: 'live'
      });
    });

    it('should return null when API fails', async () => {
      mockHybridApiService.getFinancialData.mockRejectedValue(new Error('API Error'));

      const result = await realTimePriceService.getPriceUpdate(symbol);

      expect(result).toBeNull();
    });

    it('should handle invalid financial data', async () => {
      mockHybridApiService.getFinancialData.mockResolvedValue(null as any);

      const result = await realTimePriceService.getPriceUpdate(symbol);

      expect(result).toBeNull();
    });
  });

  describe('cache management', () => {
    it('should validate cache correctly', () => {
      const symbol = '7203';
      const validCache = {
        data: { price: 2500 },
        timestamp: new Date()
      };
      const expiredCache = {
        data: { price: 2500 },
        timestamp: new Date(Date.now() - 60000) // 1 minute ago
      };

      // Test valid cache
      (realTimePriceService as any).priceCache.set(symbol, validCache);
      const isValid = (realTimePriceService as any).isCacheValid(validCache);
      expect(isValid).toBe(true);

      // Test expired cache
      (realTimePriceService as any).priceCache.set(symbol, expiredCache);
      const isExpired = (realTimePriceService as any).isCacheValid(expiredCache);
      expect(isExpired).toBe(false);
    });

    it('should convert financial data to price update message', () => {
      const financialData = {
        symbol: '7203',
        price: 2500,
        change: 50,
        changePercent: 2.0,
        volume: 1000000,
        timestamp: new Date()
      };

      const priceUpdate = (realTimePriceService as any).convertToUpdateMessage(financialData);

      expect(priceUpdate).toEqual({
        symbol: '7203',
        price: 2500,
        change: 50,
        changePercent: 2.0,
        volume: 1000000,
        timestamp: expect.any(Date),
        source: 'live'
      });
    });
  });

  describe('clearCache', () => {
    it('should clear all cached data', async () => {
      const symbols = ['7203', '9984', '6758'];
      
      // Populate cache
      for (const symbol of symbols) {
        mockHybridApiService.getFinancialData.mockResolvedValue({
          symbol,
          price: 2500,
          change: 50,
          changePercent: 2.0,
          volume: 1000000,
          marketCap: 25000000000,
          pe: 12.5,
          eps: 200,
          dividendYield: 0.025,
          week52High: 2800,
          week52Low: 2000,
          previousClose: 2450,
          timestamp: new Date()
        });
        await realTimePriceService.getPriceUpdate(symbol);
      }

      expect((realTimePriceService as any).priceCache.size).toBe(3);

      realTimePriceService.clearCache();

      expect((realTimePriceService as any).priceCache.size).toBe(0);
    });
  });
});