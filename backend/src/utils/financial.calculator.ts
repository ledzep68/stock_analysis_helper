/**
 * 金融計算ユーティリティ
 * ポートフォリオ最適化で使用される金融計算機能を提供
 */

export class FinancialCalculator {
  /**
   * 年率換算
   */
  static annualize(value: number, periods: number = 252): number {
    return value * Math.sqrt(periods);
  }

  /**
   * 複利計算
   */
  static compoundReturn(
    initialValue: number,
    rate: number,
    periods: number
  ): number {
    return initialValue * Math.pow(1 + rate, periods);
  }

  /**
   * Value at Risk (VaR) 計算
   */
  static calculateVaR(
    returns: number[],
    confidenceLevel: number = 0.95
  ): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const index = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    
    return Math.abs(sortedReturns[Math.max(0, Math.min(index, sortedReturns.length - 1))]);
  }

  /**
   * Conditional Value at Risk (CVaR) 計算
   */
  static calculateCVaR(
    returns: number[],
    confidenceLevel: number = 0.95
  ): number {
    if (returns.length === 0) return 0;
    
    const sortedReturns = [...returns].sort((a, b) => a - b);
    const cutoffIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
    const tailReturns = sortedReturns.slice(0, cutoffIndex + 1);
    
    if (tailReturns.length === 0) return 0;
    
    const averageTailReturn = tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length;
    return Math.abs(averageTailReturn);
  }

  /**
   * 最大ドローダウン計算
   */
  static calculateMaxDrawdown(values: number[]): {
    maxDrawdown: number;
    maxDrawdownPercent: number;
    startIndex: number;
    endIndex: number;
  } {
    if (values.length < 2) {
      return {
        maxDrawdown: 0,
        maxDrawdownPercent: 0,
        startIndex: 0,
        endIndex: 0
      };
    }

    let maxDrawdown = 0;
    let maxDrawdownPercent = 0;
    let peak = values[0];
    let peakIndex = 0;
    let startIndex = 0;
    let endIndex = 0;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
        peakIndex = i;
      } else {
        const drawdown = peak - values[i];
        const drawdownPercent = (peak - values[i]) / peak;
        
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownPercent = drawdownPercent;
          startIndex = peakIndex;
          endIndex = i;
        }
      }
    }

    return {
      maxDrawdown,
      maxDrawdownPercent,
      startIndex,
      endIndex
    };
  }

  /**
   * ベータ値計算
   */
  static calculateBeta(
    stockReturns: number[],
    marketReturns: number[]
  ): number {
    if (stockReturns.length !== marketReturns.length || stockReturns.length === 0) {
      return 1; // デフォルトベータ
    }

    const n = stockReturns.length;
    const stockMean = stockReturns.reduce((sum, r) => sum + r, 0) / n;
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / n;

    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < n; i++) {
      const stockDiff = stockReturns[i] - stockMean;
      const marketDiff = marketReturns[i] - marketMean;
      
      covariance += stockDiff * marketDiff;
      marketVariance += marketDiff * marketDiff;
    }

    if (marketVariance === 0) return 1;
    
    return covariance / marketVariance;
  }

  /**
   * アルファ値計算
   */
  static calculateAlpha(
    stockReturns: number[],
    marketReturns: number[],
    riskFreeRate: number = 0.02
  ): number {
    if (stockReturns.length === 0) return 0;
    
    const stockMean = stockReturns.reduce((sum, r) => sum + r, 0) / stockReturns.length;
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    const beta = this.calculateBeta(stockReturns, marketReturns);
    
    return stockMean - riskFreeRate - beta * (marketMean - riskFreeRate);
  }

  /**
   * 情報比率計算
   */
  static calculateInformationRatio(
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
      return 0;
    }

    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    
    if (excessReturns.length < 2) return 0;
    
    const variance = excessReturns.reduce((sum, r) => 
      sum + Math.pow(r - meanExcessReturn, 2), 0
    ) / (excessReturns.length - 1);
    
    const trackingError = Math.sqrt(variance);
    
    if (trackingError === 0) return 0;
    
    return meanExcessReturn / trackingError;
  }

  /**
   * トラッキングエラー計算
   */
  static calculateTrackingError(
    portfolioReturns: number[],
    benchmarkReturns: number[]
  ): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length === 0) {
      return 0;
    }

    const excessReturns = portfolioReturns.map((r, i) => r - benchmarkReturns[i]);
    const meanExcessReturn = excessReturns.reduce((sum, r) => sum + r, 0) / excessReturns.length;
    
    if (excessReturns.length < 2) return 0;
    
    const variance = excessReturns.reduce((sum, r) => 
      sum + Math.pow(r - meanExcessReturn, 2), 0
    ) / (excessReturns.length - 1);
    
    return Math.sqrt(variance);
  }

  /**
   * ソルティノ比率計算
   */
  static calculateSortinoRatio(
    returns: number[],
    riskFreeRate: number = 0.02,
    targetReturn: number = 0
  ): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const excessReturn = meanReturn - riskFreeRate;
    
    const downSideReturns = returns.filter(r => r < targetReturn);
    if (downSideReturns.length === 0) return excessReturn > 0 ? Infinity : 0;
    
    const downSideDeviation = Math.sqrt(
      downSideReturns.reduce((sum, r) => 
        sum + Math.pow(r - targetReturn, 2), 0
      ) / downSideReturns.length
    );
    
    if (downSideDeviation === 0) return excessReturn > 0 ? Infinity : 0;
    
    return excessReturn / downSideDeviation;
  }

  /**
   * カルマー比率計算
   */
  static calculateCalmarRatio(
    returns: number[],
    values: number[]
  ): number {
    if (returns.length === 0 || values.length === 0) return 0;
    
    const annualizedReturn = this.annualize(
      returns.reduce((sum, r) => sum + r, 0) / returns.length
    );
    
    const { maxDrawdownPercent } = this.calculateMaxDrawdown(values);
    
    if (maxDrawdownPercent === 0) return annualizedReturn > 0 ? Infinity : 0;
    
    return annualizedReturn / maxDrawdownPercent;
  }

  /**
   * 動的相関係数計算
   */
  static calculateRollingCorrelation(
    series1: number[],
    series2: number[],
    window: number = 30
  ): number[] {
    if (series1.length !== series2.length || series1.length < window) {
      return [];
    }

    const correlations: number[] = [];
    
    for (let i = window - 1; i < series1.length; i++) {
      const slice1 = series1.slice(i - window + 1, i + 1);
      const slice2 = series2.slice(i - window + 1, i + 1);
      
      const correlation = this.calculateCorrelation(slice1, slice2);
      correlations.push(correlation);
    }
    
    return correlations;
  }

  /**
   * 相関係数計算
   */
  static calculateCorrelation(series1: number[], series2: number[]): number {
    if (series1.length !== series2.length || series1.length === 0) {
      return 0;
    }

    const n = series1.length;
    const mean1 = series1.reduce((sum, x) => sum + x, 0) / n;
    const mean2 = series2.reduce((sum, x) => sum + x, 0) / n;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = series1[i] - mean1;
      const diff2 = series2[i] - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    
    if (denominator === 0) return 0;
    
    return numerator / denominator;
  }

  /**
   * 期待ショートフォール計算
   */
  static calculateExpectedShortfall(
    returns: number[],
    confidenceLevel: number = 0.95
  ): number {
    return this.calculateCVaR(returns, confidenceLevel);
  }

  /**
   * 安全第一比率計算
   */
  static calculateSafetyFirstRatio(
    returns: number[],
    minimumReturn: number
  ): number {
    if (returns.length === 0) return 0;
    
    const meanReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const standardDeviation = Math.sqrt(
      returns.reduce((sum, r) => 
        sum + Math.pow(r - meanReturn, 2), 0
      ) / (returns.length - 1)
    );
    
    if (standardDeviation === 0) return meanReturn >= minimumReturn ? Infinity : -Infinity;
    
    return (meanReturn - minimumReturn) / standardDeviation;
  }

  /**
   * 複数期間収益率の計算
   */
  static calculateMultiPeriodReturns(
    values: number[],
    periods: number[]
  ): { [period: number]: number } {
    const result: { [period: number]: number } = {};
    
    for (const period of periods) {
      if (period <= 0 || period >= values.length) {
        result[period] = 0;
        continue;
      }
      
      const startValue = values[values.length - period - 1];
      const endValue = values[values.length - 1];
      
      if (startValue === 0) {
        result[period] = 0;
      } else {
        result[period] = (endValue - startValue) / startValue;
      }
    }
    
    return result;
  }

  /**
   * ボラティリティ表面計算
   */
  static calculateVolatilitySurface(
    returns: number[],
    windows: number[]
  ): { [window: number]: number } {
    const result: { [window: number]: number } = {};
    
    for (const window of windows) {
      if (window <= 1 || window > returns.length) {
        result[window] = 0;
        continue;
      }
      
      const recentReturns = returns.slice(-window);
      const mean = recentReturns.reduce((sum, r) => sum + r, 0) / recentReturns.length;
      const variance = recentReturns.reduce((sum, r) => 
        sum + Math.pow(r - mean, 2), 0
      ) / (recentReturns.length - 1);
      
      result[window] = Math.sqrt(variance);
    }
    
    return result;
  }
}