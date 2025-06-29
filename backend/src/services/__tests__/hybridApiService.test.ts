import { hybridApiService } from '../hybridApiService';
import { mockApiService } from '../mockApiService';

// Mock the services
jest.mock('../mockApiService');
jest.mock('../realApiService', () => ({
  realApiService: {
    getFinancialData: jest.fn(),
    getTechnicalAnalysis: jest.fn(),
    getHistoricalData: jest.fn()
  }
}));

import { realApiService } from '../realApiService';

const mockMockApiService = mockApiService as jest.Mocked<typeof mockApiService>;
const mockRealApiService = realApiService as jest.Mocked<typeof realApiService>;

describe('HybridApiService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getFinancialData', () => {
    const symbol = '7203';
    const mockFinancialData = {
      symbol,
      price: 2500,
      change: 50,
      changePercent: 2.04,
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

    it('should return real data when available', async () => {
      mockRealApiService.getFinancialData.mockResolvedValue(mockFinancialData);

      const result = await hybridApiService.getFinancialData(symbol);

      expect(mockRealApiService.getFinancialData).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(mockFinancialData);
    });

    it('should fallback to mock data when real API fails', async () => {
      mockRealApiService.getFinancialData.mockRejectedValue(new Error('API Error'));
      mockMockApiService.getFinancialData.mockResolvedValue(mockFinancialData);

      const result = await hybridApiService.getFinancialData(symbol);

      expect(mockRealApiService.getFinancialData).toHaveBeenCalledWith(symbol);
      expect(mockMockApiService.getFinancialData).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(mockFinancialData);
    });

    it('should throw error when both services fail', async () => {
      const realError = new Error('Real API Error');
      const mockError = new Error('Mock API Error');
      
      mockYahooFinanceService.getFinancialData.mockRejectedValue(realError);
      mockMockApiService.getFinancialData.mockRejectedValue(mockError);

      await expect(hybridApiService.getFinancialData(symbol))
        .rejects.toThrow('Both real and mock APIs failed');
    });
  });

  describe('getTechnicalAnalysis', () => {
    const symbol = '7203';
    const mockTechnicalData = {
      symbol,
      sma20: 2400,
      sma50: 2350,
      rsi: 65,
      macd: 10,
      signal: 8,
      bollinger: {
        upper: 2600,
        middle: 2500,
        lower: 2400
      },
      volume: 1000000,
      timestamp: new Date()
    };

    it('should return real technical data when available', async () => {
      mockYahooFinanceService.getTechnicalAnalysis.mockResolvedValue(mockTechnicalData);

      const result = await hybridApiService.getTechnicalAnalysis(symbol);

      expect(mockYahooFinanceService.getTechnicalAnalysis).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(mockTechnicalData);
    });

    it('should fallback to mock technical data when real API fails', async () => {
      mockYahooFinanceService.getTechnicalAnalysis.mockRejectedValue(new Error('API Error'));
      mockMockApiService.getTechnicalAnalysis.mockResolvedValue(mockTechnicalData);

      const result = await hybridApiService.getTechnicalAnalysis(symbol);

      expect(mockYahooFinanceService.getTechnicalAnalysis).toHaveBeenCalledWith(symbol);
      expect(mockMockApiService.getTechnicalAnalysis).toHaveBeenCalledWith(symbol);
      expect(result).toEqual(mockTechnicalData);
    });
  });

  describe('getHistoricalData', () => {
    const symbol = '7203';
    const days = 30;
    const mockHistoricalData = [
      { date: '2023-01-01', open: 2400, high: 2500, low: 2350, close: 2450, volume: 1000000 },
      { date: '2023-01-02', open: 2450, high: 2520, low: 2400, close: 2500, volume: 1100000 }
    ];

    it('should return real historical data when available', async () => {
      mockYahooFinanceService.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const result = await hybridApiService.getHistoricalData(symbol, days);

      expect(mockYahooFinanceService.getHistoricalData).toHaveBeenCalledWith(symbol, days);
      expect(result).toEqual(mockHistoricalData);
    });

    it('should fallback to mock historical data when real API fails', async () => {
      mockYahooFinanceService.getHistoricalData.mockRejectedValue(new Error('API Error'));
      mockMockApiService.getHistoricalData.mockResolvedValue(mockHistoricalData);

      const result = await hybridApiService.getHistoricalData(symbol, days);

      expect(mockYahooFinanceService.getHistoricalData).toHaveBeenCalledWith(symbol);
      expect(mockMockApiService.getHistoricalData).toHaveBeenCalledWith(symbol, days);
      expect(result).toEqual(mockHistoricalData);
    });
  });
});