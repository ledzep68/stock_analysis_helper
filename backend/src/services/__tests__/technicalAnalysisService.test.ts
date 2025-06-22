import { calculateSMA, calculateEMA, calculateRSI, calculateMACD, calculateBollingerBands } from '../technicalAnalysisService';

describe('Technical Analysis Service', () => {
  const mockPrices = [100, 102, 101, 103, 105, 104, 106, 108, 107, 109, 111, 110, 112, 114, 113];

  describe('calculateSMA', () => {
    it('should calculate simple moving average correctly', () => {
      const result = calculateSMA(mockPrices, 5);
      
      // First 4 values should be null (not enough data)
      expect(result.slice(0, 4)).toEqual([null, null, null, null]);
      
      // 5th value should be average of first 5 prices
      const expectedFirst = (100 + 102 + 101 + 103 + 105) / 5;
      expect(result[4]).toBeCloseTo(expectedFirst, 2);
      
      // Last value should be average of last 5 prices
      const expectedLast = (110 + 112 + 114 + 113 + 113) / 5;
      expect(result[result.length - 1]).toBeCloseTo(expectedLast, 2);
    });

    it('should handle period longer than data', () => {
      const shortPrices = [100, 102, 101];
      const result = calculateSMA(shortPrices, 5);
      
      expect(result).toEqual([null, null, null]);
    });

    it('should handle empty array', () => {
      const result = calculateSMA([], 5);
      expect(result).toEqual([]);
    });
  });

  describe('calculateEMA', () => {
    it('should calculate exponential moving average correctly', () => {
      const result = calculateEMA(mockPrices, 5);
      
      // First value should be first price
      expect(result[0]).toBe(mockPrices[0]);
      
      // EMA should be different from SMA
      const sma = calculateSMA(mockPrices, 5);
      expect(result[result.length - 1]).not.toBe(sma[sma.length - 1]);
      
      // EMA should react faster to recent changes
      expect(result.length).toBe(mockPrices.length);
    });

    it('should handle single value', () => {
      const result = calculateEMA([100], 5);
      expect(result).toEqual([100]);
    });
  });

  describe('calculateRSI', () => {
    it('should calculate RSI correctly', () => {
      const result = calculateRSI(mockPrices, 14);
      
      // First 13 values should be null (not enough data)
      expect(result.slice(0, 13)).toEqual(new Array(13).fill(null));
      
      // RSI should be between 0 and 100
      const validRSI = result.filter(val => val !== null);
      validRSI.forEach(rsi => {
        expect(rsi).toBeGreaterThanOrEqual(0);
        expect(rsi).toBeLessThanOrEqual(100);
      });
    });

    it('should return 50 for no price movement', () => {
      const flatPrices = new Array(20).fill(100);
      const result = calculateRSI(flatPrices, 14);
      
      // Should be 50 when no movement
      expect(result[result.length - 1]).toBe(50);
    });
  });

  describe('calculateMACD', () => {
    it('should calculate MACD correctly', () => {
      const result = calculateMACD(mockPrices, 12, 26, 9);
      
      expect(result).toHaveProperty('macd');
      expect(result).toHaveProperty('signal');
      expect(result).toHaveProperty('histogram');
      
      // All arrays should have same length as input
      expect(result.macd.length).toBe(mockPrices.length);
      expect(result.signal.length).toBe(mockPrices.length);
      expect(result.histogram.length).toBe(mockPrices.length);
      
      // Histogram should be MACD - Signal
      for (let i = 0; i < mockPrices.length; i++) {
        if (result.macd[i] !== null && result.signal[i] !== null) {
          expect(result.histogram[i]).toBeCloseTo(
            result.macd[i]! - result.signal[i]!,
            6
          );
        }
      }
    });
  });

  describe('calculateBollingerBands', () => {
    it('should calculate Bollinger Bands correctly', () => {
      const result = calculateBollingerBands(mockPrices, 20, 2);
      
      expect(result).toHaveProperty('upper');
      expect(result).toHaveProperty('middle');
      expect(result).toHaveProperty('lower');
      
      // All arrays should have same length as input
      expect(result.upper.length).toBe(mockPrices.length);
      expect(result.middle.length).toBe(mockPrices.length);
      expect(result.lower.length).toBe(mockPrices.length);
      
      // Upper band should be higher than middle, middle higher than lower
      for (let i = 0; i < mockPrices.length; i++) {
        if (result.upper[i] !== null && result.middle[i] !== null && result.lower[i] !== null) {
          expect(result.upper[i]).toBeGreaterThan(result.middle[i]!);
          expect(result.middle[i]).toBeGreaterThan(result.lower[i]!);
        }
      }
      
      // Middle band should be SMA
      const sma = calculateSMA(mockPrices, 20);
      expect(result.middle).toEqual(sma);
    });
  });

  describe('Edge cases', () => {
    it('should handle negative prices', () => {
      const negativePrices = [-100, -102, -101, -103, -105];
      const sma = calculateSMA(negativePrices, 3);
      
      expect(sma[2]).toBeCloseTo(-101, 2);
      expect(sma[4]).toBeCloseTo(-103, 2);
    });

    it('should handle zero prices', () => {
      const zeroPrices = [0, 0, 0, 0, 0];
      const sma = calculateSMA(zeroPrices, 3);
      
      expect(sma[2]).toBe(0);
      expect(sma[4]).toBe(0);
    });

    it('should handle very large numbers', () => {
      const largePrices = [1e6, 1e6 + 1000, 1e6 - 500, 1e6 + 2000];
      const sma = calculateSMA(largePrices, 3);
      
      expect(sma[2]).toBeCloseTo(1e6 + 166.67, 0);
    });
  });
});