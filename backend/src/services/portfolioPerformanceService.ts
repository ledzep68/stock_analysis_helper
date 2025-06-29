import { db } from '../config/database';
import { portfolioService, Portfolio } from './portfolioService';
import { APP_CONSTANTS } from '../utils/constants';
import { ErrorHandler } from '../utils/error.handler';

export interface PerformanceMetrics {
  portfolioId: string;
  date: Date;
  totalValue: number;
  totalCost: number;
  unrealizedPnL: number;
  realizedPnL: number;
  dailyReturn: number;
  cumulativeReturn: number;
  benchmarkReturn: number;
  sharpeRatio: number;
  volatility: number;
  maxDrawdown: number;
}

export interface PerformanceAnalysis {
  period: string;
  totalReturn: number;
  totalReturnPercent: number;
  annualizedReturn: number;
  volatility: number;
  sharpeRatio: number;
  maxDrawdown: number;
  maxDrawdownDate: Date | null;
  winRate: number;
  profitFactor: number;
  averageWin: number;
  averageLoss: number;
  bestDay: { date: Date; return: number };
  worstDay: { date: Date; return: number };
}

export interface BenchmarkComparison {
  portfolioReturn: number;
  benchmarkReturn: number;
  alpha: number;
  beta: number;
  correlation: number;
  trackingError: number;
  informationRatio: number;
}

class PortfolioPerformanceService {
  /**
   * ポートフォリオパフォーマンス計算・保存
   */
  async calculateAndSavePerformance(portfolioId: string, userId: string): Promise<PerformanceMetrics> {
    try {
      const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);
      const today = new Date().toISOString().split('T')[0];

      // 前日のパフォーマンス取得
      const previousPerformance = await this.getPreviousPerformance(portfolioId);
      
      // 日次リターン計算
      const dailyReturn = previousPerformance 
        ? ((summary.totalValue - previousPerformance.totalValue) / previousPerformance.totalValue) * 100
        : 0;

      // 累積リターン計算
      const cumulativeReturn = portfolio.initialCapital > 0 
        ? ((summary.totalValue - portfolio.initialCapital) / portfolio.initialCapital) * 100
        : 0;

      // ベンチマーク取得（TOPIX）
      const benchmarkReturn = await this.getBenchmarkReturn(today);

      // 過去のリターンデータから統計計算
      const historicalReturns = await this.getHistoricalReturns(portfolioId, 252); // 1年間
      const volatility = this.calculateVolatility(historicalReturns);
      const sharpeRatio = this.calculateSharpeRatio(historicalReturns, 0.001); // リスクフリーレート0.1%
      const maxDrawdown = this.calculateMaxDrawdown(historicalReturns);

      const metrics: PerformanceMetrics = {
        portfolioId,
        date: new Date(),
        totalValue: summary.totalValue,
        totalCost: summary.totalCost,
        unrealizedPnL: summary.unrealizedPnL,
        realizedPnL: summary.realizedPnL,
        dailyReturn,
        cumulativeReturn,
        benchmarkReturn,
        sharpeRatio,
        volatility,
        maxDrawdown
      };

      // データベースに保存
      await this.savePerformanceMetrics(metrics);

      console.log(`📊 Performance calculated for portfolio ${portfolioId}: ${cumulativeReturn.toFixed(2)}%`);
      return metrics;
    } catch (error) {
      ErrorHandler.logError('Calculate and save performance', error);
      throw error;
    }
  }

  /**
   * パフォーマンス履歴取得
   */
  async getPerformanceHistory(
    portfolioId: string, 
    userId: string, 
    days: number = 30
  ): Promise<PerformanceMetrics[]> {
    try {
      // ポートフォリオの存在確認
      const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      // 保有銘柄の確認
      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      if (holdings.length === 0) {
        // 保有銘柄がない場合は空配列を返す
        return [];
      }

      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - days);

      const rows = await db.all(`
        SELECT * FROM portfolio_performance 
        WHERE portfolio_id = ? AND date >= ?
        ORDER BY date DESC
      `, [portfolioId, cutoffDate.toISOString().split('T')[0]]);

      return rows.map((row: any) => this.mapRowToPerformanceMetrics(row));
    } catch (error) {
      ErrorHandler.logError('Get performance history', error);
      // エラーの場合も空配列を返す（500エラーを避ける）
      console.warn(`Performance history not available for portfolio ${portfolioId}: ${error}`);
      return [];
    }
  }

  /**
   * パフォーマンス分析
   */
  async analyzePerformance(
    portfolioId: string, 
    userId: string, 
    period: '1M' | '3M' | '6M' | '1Y' | 'ALL' = '1Y'
  ): Promise<PerformanceAnalysis> {
    try {
      const days = this.getPeriodDays(period);
      const history = await this.getPerformanceHistory(portfolioId, userId, days);

      if (history.length < 2) {
        throw new Error('Insufficient data for analysis');
      }

      const returns = history.map(h => h.dailyReturn).filter(r => r !== 0);
      const values = history.map(h => h.totalValue);

      // 基本統計
      const totalReturn = history[0].totalValue - history[history.length - 1].totalValue;
      const totalReturnPercent = (totalReturn / history[history.length - 1].totalValue) * 100;
      const annualizedReturn = this.calculateAnnualizedReturn(totalReturnPercent, history.length);
      const volatility = this.calculateVolatility(returns);
      const sharpeRatio = this.calculateSharpeRatio(returns);

      // 最大ドローダウン
      const { maxDrawdown, maxDrawdownDate } = this.calculateDetailedMaxDrawdown(values, history);

      // 勝率とプロフィットファクター
      const positiveReturns = returns.filter(r => r > 0);
      const negativeReturns = returns.filter(r => r < 0);
      const winRate = (positiveReturns.length / returns.length) * 100;
      
      const totalWins = positiveReturns.reduce((sum, r) => sum + r, 0);
      const totalLosses = Math.abs(negativeReturns.reduce((sum, r) => sum + r, 0));
      const profitFactor = totalLosses > 0 ? totalWins / totalLosses : 0;

      const averageWin = positiveReturns.length > 0 ? totalWins / positiveReturns.length : 0;
      const averageLoss = negativeReturns.length > 0 ? totalLosses / negativeReturns.length : 0;

      // ベスト・ワースト日
      const bestDayIndex = returns.indexOf(Math.max(...returns));
      const worstDayIndex = returns.indexOf(Math.min(...returns));

      return {
        period,
        totalReturn,
        totalReturnPercent,
        annualizedReturn,
        volatility,
        sharpeRatio,
        maxDrawdown,
        maxDrawdownDate,
        winRate,
        profitFactor,
        averageWin,
        averageLoss,
        bestDay: {
          date: history[bestDayIndex]?.date || new Date(),
          return: Math.max(...returns)
        },
        worstDay: {
          date: history[worstDayIndex]?.date || new Date(),
          return: Math.min(...returns)
        }
      };
    } catch (error) {
      ErrorHandler.logError('Analyze performance', error);
      throw error;
    }
  }

  /**
   * ベンチマーク比較
   */
  async compareToBenchmark(
    portfolioId: string, 
    userId: string, 
    benchmarkSymbol: string = 'TOPIX',
    days: number = 252
  ): Promise<BenchmarkComparison> {
    try {
      const history = await this.getPerformanceHistory(portfolioId, userId, days);
      const portfolioReturns = history.map(h => h.dailyReturn);
      
      // ベンチマークリターン取得
      const benchmarkReturns = await this.getBenchmarkReturns(benchmarkSymbol, days);

      if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 30) {
        throw new Error('Insufficient data for benchmark comparison');
      }

      const portfolioReturn = portfolioReturns.reduce((sum, r) => sum + r, 0);
      const benchmarkReturn = benchmarkReturns.reduce((sum, r) => sum + r, 0);

      // 統計計算
      const beta = this.calculateBeta(portfolioReturns, benchmarkReturns);
      const alpha = this.calculateAlpha(portfolioReturn, benchmarkReturn, beta);
      const correlation = this.calculateCorrelation(portfolioReturns, benchmarkReturns);
      const trackingError = this.calculateTrackingError(portfolioReturns, benchmarkReturns);
      const informationRatio = trackingError > 0 ? alpha / trackingError : 0;

      return {
        portfolioReturn,
        benchmarkReturn,
        alpha,
        beta,
        correlation,
        trackingError,
        informationRatio
      };
    } catch (error) {
      ErrorHandler.logError('Compare to benchmark', error);
      throw error;
    }
  }

  /**
   * パフォーマンスメトリクス保存
   */
  private async savePerformanceMetrics(metrics: PerformanceMetrics): Promise<void> {
    const metricsId = `metrics_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date = metrics.date.toISOString().split('T')[0];

    await db.run(`
      INSERT OR REPLACE INTO portfolio_performance (
        id, portfolio_id, date, total_value, total_cost, unrealized_pnl,
        realized_pnl, daily_return, cumulative_return, benchmark_return,
        sharpe_ratio, volatility, max_drawdown, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metricsId,
      metrics.portfolioId,
      date,
      metrics.totalValue,
      metrics.totalCost,
      metrics.unrealizedPnL,
      metrics.realizedPnL,
      metrics.dailyReturn,
      metrics.cumulativeReturn,
      metrics.benchmarkReturn,
      metrics.sharpeRatio,
      metrics.volatility,
      metrics.maxDrawdown,
      new Date().toISOString()
    ]);
  }

  /**
   * 前日パフォーマンス取得
   */
  private async getPreviousPerformance(portfolioId: string): Promise<PerformanceMetrics | null> {
    const result = await db.query(`
      SELECT * FROM portfolio_performance 
      WHERE portfolio_id = ? 
      ORDER BY date DESC 
      LIMIT 1 OFFSET 1
    `, [portfolioId]);

    const row = result.rows && result.rows.length > 0 ? result.rows[0] : null;
    return row ? this.mapRowToPerformanceMetrics(row) : null;
  }

  /**
   * 過去のリターンデータ取得
   */
  private async getHistoricalReturns(portfolioId: string, days: number): Promise<number[]> {
    const result = await db.query(`
      SELECT daily_return FROM portfolio_performance 
      WHERE portfolio_id = ? AND daily_return IS NOT NULL
      ORDER BY date DESC 
      LIMIT ?
    `, [portfolioId, days]);

    const rows = result.rows || [];
    return rows.map((row: any) => row.daily_return);
  }

  /**
   * ベンチマークリターン取得
   */
  private async getBenchmarkReturn(date: string): Promise<number> {
    // TODO: 実際のベンチマークデータ取得
    // 現在はダミーデータ
    return Math.random() * 2 - 1; // -1% to 1%
  }

  /**
   * ベンチマークリターン配列取得
   */
  private async getBenchmarkReturns(symbol: string, days: number): Promise<number[]> {
    // TODO: 実際のベンチマークデータ取得
    // 現在はダミーデータ
    return Array.from({ length: days }, () => Math.random() * 2 - 1);
  }

  /**
   * ボラティリティ計算
   */
  private calculateVolatility(returns: number[]): number {
    if (returns.length < 2) return 0;

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    return Math.sqrt(variance) * Math.sqrt(252); // 年率化
  }

  /**
   * シャープレシオ計算
   */
  private calculateSharpeRatio(returns: number[], riskFreeRate: number = 0.001): number {
    if (returns.length < 2) return 0;

    const avgReturn = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const volatility = this.calculateVolatility(returns) / Math.sqrt(252); // 日次ボラティリティ
    
    return volatility > 0 ? (avgReturn - riskFreeRate) / volatility : 0;
  }

  /**
   * 最大ドローダウン計算
   */
  private calculateMaxDrawdown(returns: number[]): number {
    if (returns.length < 2) return 0;

    let peak = 0;
    let maxDrawdown = 0;
    let cumulativeReturn = 0;

    for (const ret of returns.reverse()) {
      cumulativeReturn += ret;
      peak = Math.max(peak, cumulativeReturn);
      const drawdown = peak - cumulativeReturn;
      maxDrawdown = Math.max(maxDrawdown, drawdown);
    }

    return maxDrawdown;
  }

  /**
   * 詳細最大ドローダウン計算
   */
  private calculateDetailedMaxDrawdown(
    values: number[], 
    history: PerformanceMetrics[]
  ): { maxDrawdown: number; maxDrawdownDate: Date | null } {
    if (values.length < 2) return { maxDrawdown: 0, maxDrawdownDate: null };

    let peak = values[0];
    let maxDrawdown = 0;
    let maxDrawdownDate: Date | null = null;

    for (let i = 1; i < values.length; i++) {
      if (values[i] > peak) {
        peak = values[i];
      } else {
        const drawdown = ((peak - values[i]) / peak) * 100;
        if (drawdown > maxDrawdown) {
          maxDrawdown = drawdown;
          maxDrawdownDate = history[i].date;
        }
      }
    }

    return { maxDrawdown, maxDrawdownDate };
  }

  /**
   * 年率リターン計算
   */
  private calculateAnnualizedReturn(totalReturn: number, days: number): number {
    if (days <= 0) return 0;
    const years = days / 365;
    return Math.pow(1 + totalReturn / 100, 1 / years) - 1;
  }

  /**
   * ベータ計算
   */
  private calculateBeta(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) {
      return 1;
    }

    const n = portfolioReturns.length;
    const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / n;
    const benchmarkMean = benchmarkReturns.reduce((sum, r) => sum + r, 0) / n;

    let covariance = 0;
    let benchmarkVariance = 0;

    for (let i = 0; i < n; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const benchmarkDiff = benchmarkReturns[i] - benchmarkMean;
      
      covariance += portfolioDiff * benchmarkDiff;
      benchmarkVariance += benchmarkDiff * benchmarkDiff;
    }

    return benchmarkVariance > 0 ? covariance / benchmarkVariance : 1;
  }

  /**
   * アルファ計算
   */
  private calculateAlpha(
    portfolioReturn: number, 
    benchmarkReturn: number, 
    beta: number
  ): number {
    return portfolioReturn - (beta * benchmarkReturn);
  }

  /**
   * 相関係数計算
   */
  private calculateCorrelation(returns1: number[], returns2: number[]): number {
    if (returns1.length !== returns2.length || returns1.length < 2) {
      return 0;
    }

    const n = returns1.length;
    const mean1 = returns1.reduce((sum, r) => sum + r, 0) / n;
    const mean2 = returns2.reduce((sum, r) => sum + r, 0) / n;

    let numerator = 0;
    let sum1Sq = 0;
    let sum2Sq = 0;

    for (let i = 0; i < n; i++) {
      const diff1 = returns1[i] - mean1;
      const diff2 = returns2[i] - mean2;
      
      numerator += diff1 * diff2;
      sum1Sq += diff1 * diff1;
      sum2Sq += diff2 * diff2;
    }

    const denominator = Math.sqrt(sum1Sq * sum2Sq);
    return denominator > 0 ? numerator / denominator : 0;
  }

  /**
   * トラッキングエラー計算
   */
  private calculateTrackingError(portfolioReturns: number[], benchmarkReturns: number[]): number {
    if (portfolioReturns.length !== benchmarkReturns.length || portfolioReturns.length < 2) {
      return 0;
    }

    const differences = portfolioReturns.map((pr, i) => pr - benchmarkReturns[i]);
    return this.calculateVolatility(differences);
  }

  /**
   * 期間の日数取得
   */
  private getPeriodDays(period: string): number {
    switch (period) {
      case '1M': return 30;
      case '3M': return 90;
      case '6M': return 180;
      case '1Y': return 365;
      case 'ALL': return 10000;
      default: return 365;
    }
  }

  /**
   * データベース行をPerformanceMetricsオブジェクトにマッピング
   */
  private mapRowToPerformanceMetrics(row: any): PerformanceMetrics {
    return {
      portfolioId: row.portfolio_id,
      date: new Date(row.date),
      totalValue: row.total_value,
      totalCost: row.total_cost,
      unrealizedPnL: row.unrealized_pnl,
      realizedPnL: row.realized_pnl || 0,
      dailyReturn: row.daily_return || 0,
      cumulativeReturn: row.cumulative_return || 0,
      benchmarkReturn: row.benchmark_return || 0,
      sharpeRatio: row.sharpe_ratio || 0,
      volatility: row.volatility || 0,
      maxDrawdown: row.max_drawdown || 0
    };
  }
}

export const portfolioPerformanceService = new PortfolioPerformanceService();