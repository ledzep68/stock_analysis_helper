import { db } from '../config/database';
import { portfolioService, PortfolioHolding } from './portfolioService';
import { APP_CONSTANTS } from '../utils/constants';
import { ErrorHandler } from '../utils/error.handler';

export interface RiskMetrics {
  portfolioId: string;
  date: Date;
  var95: number;  // Value at Risk (95%)
  var99: number;  // Value at Risk (99%)
  expectedShortfall: number;
  beta: number;
  alpha: number;
  correlationMatrix: { [key: string]: { [key: string]: number } };
  sectorAllocation: { [sector: string]: number };
  concentrationRisk: number;
  liquidityRisk: number;
}

export interface PortfolioRisk {
  overall: RiskMetrics;
  breakdown: {
    systematicRisk: number;
    unsystematicRisk: number;
    concentrationRisk: number;
    liquidityRisk: number;
    currencyRisk: number;
  };
  recommendations: string[];
}

export interface StressTestResult {
  scenario: string;
  portfolioImpact: number;
  impactPercent: number;
  worstHolding: {
    symbol: string;
    impact: number;
    impactPercent: number;
  };
  recoveryTime: number; // days
}

class PortfolioRiskService {
  /**
   * ポートフォリオリスク分析
   */
  async analyzePortfolioRisk(portfolioId: string, userId: string): Promise<PortfolioRisk> {
    try {
      const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      
      // 保有銘柄が空の場合のデフォルト値を返す
      if (holdings.length === 0) {
        const defaultRisk: PortfolioRisk = {
          overall: {
            portfolioId,
            date: new Date(),
            var95: 0,
            var99: 0,
            expectedShortfall: 0,
            beta: 0,
            alpha: 0,
            correlationMatrix: {},
            sectorAllocation: {},
            concentrationRisk: 0,
            liquidityRisk: 0
          },
          breakdown: {
            systematicRisk: 0,
            unsystematicRisk: 0,
            concentrationRisk: 0,
            liquidityRisk: 0,
            currencyRisk: 0
          },
          recommendations: ['保有銘柄を追加してリスク分析を開始してください']
        };
        return defaultRisk;
      }

      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);

      // リスクメトリクス計算
      const riskMetrics = await this.calculateRiskMetrics(portfolioId, holdings, summary.totalValue, userId);
      
      // リスク分解
      const breakdown = await this.calculateRiskBreakdown(holdings, summary.totalValue);
      
      // 推奨事項生成
      const recommendations = this.generateRiskRecommendations(riskMetrics, breakdown);

      const portfolioRisk: PortfolioRisk = {
        overall: riskMetrics,
        breakdown,
        recommendations
      };

      // リスクメトリクスをデータベースに保存
      await this.saveRiskMetrics(riskMetrics);

      console.log(`🎯 Risk analysis completed for portfolio ${portfolioId}`);
      return portfolioRisk;
    } catch (error) {
      ErrorHandler.logError('Analyze portfolio risk', error);
      // エラーの場合もデフォルト値を返す（500エラーを避ける）
      console.warn(`Risk analysis not available for portfolio ${portfolioId}: ${error}`);
      return {
        overall: {
          portfolioId,
          date: new Date(),
          var95: 0,
          var99: 0,
          expectedShortfall: 0,
          beta: 0,
          alpha: 0,
          correlationMatrix: {},
          sectorAllocation: {},
          concentrationRisk: 0,
          liquidityRisk: 0
        },
        breakdown: {
          systematicRisk: 0,
          unsystematicRisk: 0,
          concentrationRisk: 0,
          liquidityRisk: 0,
          currencyRisk: 0
        },
        recommendations: ['リスク分析が利用できません。しばらく後に再試行してください。']
      };
    }
  }

  /**
   * ストレステスト実行
   */
  async runStressTest(portfolioId: string, userId: string): Promise<StressTestResult[]> {
    try {
      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      
      // 保有銘柄が空の場合は空配列を返す
      if (holdings.length === 0) {
        return [];
      }
      
      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);

      const scenarios = [
        { name: '市場暴落シナリオ (-20%)', factor: -0.20 },
        { name: '金融危機シナリオ (-35%)', factor: -0.35 },
        { name: '円高シナリオ', factor: -0.15 },
        { name: 'インフレシナリオ', factor: -0.10 },
        { name: '地政学リスク', factor: -0.25 }
      ];

      const results: StressTestResult[] = [];

      for (const scenario of scenarios) {
        const result = await this.calculateStressTestImpact(
          holdings, 
          summary.totalValue, 
          scenario.name, 
          scenario.factor
        );
        results.push(result);
      }

      console.log(`💥 Stress test completed for portfolio ${portfolioId}: ${results.length} scenarios`);
      return results;
    } catch (error) {
      ErrorHandler.logError('Run stress test', error);
      throw error;
    }
  }

  /**
   * VaR (Value at Risk) 計算
   */
  async calculateVaR(
    portfolioId: string, 
    userId: string, 
    confidenceLevel: number = 0.95,
    timeHorizon: number = 1
  ): Promise<{ var: number; expectedShortfall: number }> {
    try {
      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      
      // 保有銘柄が空の場合はゼロを返す
      if (holdings.length === 0) {
        return { var: 0, expectedShortfall: 0 };
      }
      
      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);

      // 過去のリターンデータを使用してVaR計算
      const historicalReturns = await this.getPortfolioHistoricalReturns(portfolioId, 252); // 1年間

      if (historicalReturns.length < 30) {
        // データが不足している場合はゼロを返す
        console.warn(`Insufficient historical data for VaR calculation for portfolio ${portfolioId}`);
        return { var: 0, expectedShortfall: 0 };
      }

      // ヒストリカル法によるVaR計算
      const sortedReturns = historicalReturns.sort((a, b) => a - b);
      const varIndex = Math.floor((1 - confidenceLevel) * sortedReturns.length);
      const var95 = Math.abs(sortedReturns[varIndex]) * summary.totalValue * Math.sqrt(timeHorizon);

      // Expected Shortfall (条件付期待損失)
      const tailReturns = sortedReturns.slice(0, varIndex + 1);
      const expectedShortfall = Math.abs(tailReturns.reduce((sum, r) => sum + r, 0) / tailReturns.length) 
        * summary.totalValue * Math.sqrt(timeHorizon);

      return { var: var95, expectedShortfall };
    } catch (error) {
      ErrorHandler.logError('Calculate VaR', error);
      // エラーの場合もゼロを返す（500エラーを避ける）
      console.warn(`VaR calculation not available for portfolio ${portfolioId}: ${error}`);
      return { var: 0, expectedShortfall: 0 };
    }
  }

  /**
   * リスクメトリクス計算
   */
  private async calculateRiskMetrics(
    portfolioId: string, 
    holdings: PortfolioHolding[], 
    totalValue: number,
    userId: string
  ): Promise<RiskMetrics> {
    // VaR計算
    const { var: var95, expectedShortfall } = await this.calculateVaR(portfolioId, userId, 0.95);
    const { var: var99 } = await this.calculateVaR(portfolioId, userId, 0.99);

    // 相関行列計算
    const correlationMatrix = await this.calculateCorrelationMatrix(holdings);

    // セクター配分計算
    const sectorAllocation = await this.calculateSectorAllocation(holdings, totalValue);

    // 集中リスク計算
    const concentrationRisk = this.calculateConcentrationRisk(holdings, totalValue);

    // 流動性リスク計算
    const liquidityRisk = await this.calculateLiquidityRisk(holdings, totalValue);

    // ベータとアルファ計算
    const { beta, alpha } = await this.calculateBetaAlpha(portfolioId);

    return {
      portfolioId,
      date: new Date(),
      var95,
      var99,
      expectedShortfall,
      beta,
      alpha,
      correlationMatrix,
      sectorAllocation,
      concentrationRisk,
      liquidityRisk
    };
  }

  /**
   * リスク分解計算
   */
  private async calculateRiskBreakdown(holdings: PortfolioHolding[], totalValue: number): Promise<any> {
    // システマティックリスク（市場リスク）
    const systematicRisk = await this.calculateSystematicRisk(holdings);

    // 非システマティックリスク（固有リスク）
    const unsystematicRisk = await this.calculateUnsystematicRisk(holdings);

    // 集中リスク
    const concentrationRisk = this.calculateConcentrationRisk(holdings, totalValue);

    // 流動性リスク
    const liquidityRisk = await this.calculateLiquidityRisk(holdings, totalValue);

    // 通貨リスク（現在は円建てのみなので0）
    const currencyRisk = 0;

    return {
      systematicRisk,
      unsystematicRisk,
      concentrationRisk,
      liquidityRisk,
      currencyRisk
    };
  }

  /**
   * 相関行列計算
   */
  private async calculateCorrelationMatrix(holdings: PortfolioHolding[]): Promise<{ [key: string]: { [key: string]: number } }> {
    const symbols = holdings.map(h => h.symbol);
    const correlationMatrix: { [key: string]: { [key: string]: number } } = {};

    for (const symbol1 of symbols) {
      correlationMatrix[symbol1] = {};
      for (const symbol2 of symbols) {
        if (symbol1 === symbol2) {
          correlationMatrix[symbol1][symbol2] = 1;
        } else {
          // 簡単な相関計算（実際の実装では価格データから計算）
          correlationMatrix[symbol1][symbol2] = 0.3 + Math.random() * 0.4; // 0.3-0.7の範囲
        }
      }
    }

    return correlationMatrix;
  }

  /**
   * セクター配分計算
   */
  private async calculateSectorAllocation(holdings: PortfolioHolding[], totalValue: number): Promise<{ [sector: string]: number }> {
    const sectorMap: { [sector: string]: number } = {};

    for (const holding of holdings) {
      // セクター情報取得（simplifiedのため固定値を使用）
      const sector = await this.getStockSector(holding.symbol);
      const holdingValue = holding.quantity * holding.averageCost; // 簡略化

      if (!sectorMap[sector]) {
        sectorMap[sector] = 0;
      }
      sectorMap[sector] += (holdingValue / totalValue) * 100;
    }

    return sectorMap;
  }

  /**
   * 集中リスク計算
   */
  private calculateConcentrationRisk(holdings: PortfolioHolding[], totalValue: number): number {
    const holdingValues = holdings.map(h => h.quantity * h.averageCost);
    const weights = holdingValues.map(value => value / totalValue);

    // ハーフィンダール・ハーシュマン指数 (HHI)
    const hhi = weights.reduce((sum, weight) => sum + Math.pow(weight, 2), 0);

    // 正規化（0-100スケール）
    return hhi * 100;
  }

  /**
   * 流動性リスク計算
   */
  private async calculateLiquidityRisk(holdings: PortfolioHolding[], totalValue: number): Promise<number> {
    let totalLiquidityScore = 0;
    let totalWeight = 0;

    for (const holding of holdings) {
      const liquidityScore = await this.getStockLiquidityScore(holding.symbol);
      const weight = (holding.quantity * holding.averageCost) / totalValue;
      
      totalLiquidityScore += liquidityScore * weight;
      totalWeight += weight;
    }

    // 流動性リスクは流動性スコアの逆数
    return totalWeight > 0 ? 100 - (totalLiquidityScore / totalWeight) : 50;
  }

  /**
   * ベータ・アルファ計算
   */
  private async calculateBetaAlpha(portfolioId: string): Promise<{ beta: number; alpha: number }> {
    // 過去のリターンデータからベータとアルファを計算
    const portfolioReturns = await this.getPortfolioHistoricalReturns(portfolioId, 252);
    const marketReturns = await this.getMarketReturns(252); // TOPIX等

    if (portfolioReturns.length < 30 || marketReturns.length < 30) {
      return { beta: 1, alpha: 0 }; // デフォルト値
    }

    const beta = this.calculateBeta(portfolioReturns, marketReturns);
    const alpha = this.calculateAlpha(portfolioReturns, marketReturns, beta);

    return { beta, alpha };
  }

  /**
   * システマティックリスク計算
   */
  private async calculateSystematicRisk(holdings: PortfolioHolding[]): Promise<number> {
    let totalSystematicRisk = 0;
    let totalWeight = 0;

    for (const holding of holdings) {
      const beta = await this.getStockBeta(holding.symbol);
      const weight = holding.quantity * holding.averageCost;
      
      totalSystematicRisk += Math.abs(beta - 1) * weight;
      totalWeight += weight;
    }

    return totalWeight > 0 ? (totalSystematicRisk / totalWeight) * 100 : 0;
  }

  /**
   * 非システマティックリスク計算
   */
  private async calculateUnsystematicRisk(holdings: PortfolioHolding[]): Promise<number> {
    // 分散化による非システマティックリスクの減少を計算
    const diversificationBenefit = Math.min(holdings.length / 30, 1); // 30銘柄で最大分散効果
    const baseUnsystematicRisk = 30; // ベース値
    
    return baseUnsystematicRisk * (1 - diversificationBenefit * 0.8);
  }

  /**
   * ストレステスト影響計算
   */
  private async calculateStressTestImpact(
    holdings: PortfolioHolding[], 
    totalValue: number, 
    scenario: string, 
    factor: number
  ): Promise<StressTestResult> {
    let totalImpact = 0;
    let worstImpact = 0;
    let worstSymbol = '';

    for (const holding of holdings) {
      const holdingValue = holding.quantity * holding.averageCost;
      const sectorSensitivity = await this.getSectorSensitivity(holding.symbol, scenario);
      const holdingImpact = holdingValue * factor * sectorSensitivity;
      
      totalImpact += holdingImpact;

      if (Math.abs(holdingImpact) > Math.abs(worstImpact)) {
        worstImpact = holdingImpact;
        worstSymbol = holding.symbol;
      }
    }

    // 回復時間の推定（シナリオの深刻度による）
    const recoveryTime = Math.abs(factor) * 200; // 日数

    return {
      scenario,
      portfolioImpact: totalImpact,
      impactPercent: (totalImpact / totalValue) * 100,
      worstHolding: {
        symbol: worstSymbol,
        impact: worstImpact,
        impactPercent: (worstImpact / totalValue) * 100
      },
      recoveryTime
    };
  }

  /**
   * リスク推奨事項生成
   */
  private generateRiskRecommendations(riskMetrics: RiskMetrics, breakdown: any): string[] {
    const recommendations: string[] = [];

    // 集中リスクチェック
    if (riskMetrics.concentrationRisk > 25) {
      recommendations.push('ポートフォリオの集中リスクが高いです。銘柄分散を検討してください。');
    }

    // 流動性リスクチェック
    if (riskMetrics.liquidityRisk > 30) {
      recommendations.push('流動性リスクが高いです。より流動性の高い銘柄への投資を検討してください。');
    }

    // セクター集中チェック
    const maxSectorAllocation = Math.max(...Object.values(riskMetrics.sectorAllocation));
    if (maxSectorAllocation > 40) {
      recommendations.push('特定セクターへの集中度が高いです。セクター分散を検討してください。');
    }

    // ベータチェック
    if (riskMetrics.beta > 1.5) {
      recommendations.push('ポートフォリオのベータが高く、市場変動に敏感です。守備的な銘柄の追加を検討してください。');
    }

    // VaRチェック
    if (riskMetrics.var95 > riskMetrics.var95 * 0.15) { // ポートフォリオの15%以上
      recommendations.push('VaRが高水準です。リスク許容度に応じてポジションサイズの調整を検討してください。');
    }

    if (recommendations.length === 0) {
      recommendations.push('リスク管理状況は良好です。現在の分散状況を維持してください。');
    }

    return recommendations;
  }

  /**
   * リスクメトリクス保存
   */
  private async saveRiskMetrics(metrics: RiskMetrics): Promise<void> {
    const metricsId = `risk_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const date = metrics.date.toISOString().split('T')[0];

    await db.run(`
      INSERT OR REPLACE INTO portfolio_risk_metrics (
        id, portfolio_id, date, var_95, var_99, expected_shortfall,
        beta, alpha, correlation_matrix, sector_allocation,
        concentration_risk, liquidity_risk, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      metricsId,
      metrics.portfolioId,
      date,
      metrics.var95,
      metrics.var99,
      metrics.expectedShortfall,
      metrics.beta,
      metrics.alpha,
      JSON.stringify(metrics.correlationMatrix),
      JSON.stringify(metrics.sectorAllocation),
      metrics.concentrationRisk,
      metrics.liquidityRisk,
      new Date().toISOString()
    ]);
  }

  // ヘルパーメソッド
  private async getPortfolioHistoricalReturns(portfolioId: string, days: number): Promise<number[]> {
    const result = await db.query(`
      SELECT daily_return FROM portfolio_performance 
      WHERE portfolio_id = ? AND daily_return IS NOT NULL
      ORDER BY date DESC 
      LIMIT ?
    `, [portfolioId, days]);

    const rows = result.rows || [];
    return rows.map((row: any) => row.daily_return);
  }

  private async getMarketReturns(days: number): Promise<number[]> {
    // TODO: 実際の市場データ取得
    return Array.from({ length: days }, () => Math.random() * 4 - 2);
  }

  private calculateBeta(portfolioReturns: number[], marketReturns: number[]): number {
    // 共分散とベータ計算の実装
    if (portfolioReturns.length !== marketReturns.length || portfolioReturns.length < 2) {
      return 1;
    }

    const n = portfolioReturns.length;
    const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / n;
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / n;

    let covariance = 0;
    let marketVariance = 0;

    for (let i = 0; i < n; i++) {
      const portfolioDiff = portfolioReturns[i] - portfolioMean;
      const marketDiff = marketReturns[i] - marketMean;
      
      covariance += portfolioDiff * marketDiff;
      marketVariance += marketDiff * marketDiff;
    }

    return marketVariance > 0 ? covariance / marketVariance : 1;
  }

  private calculateAlpha(portfolioReturns: number[], marketReturns: number[], beta: number): number {
    const portfolioMean = portfolioReturns.reduce((sum, r) => sum + r, 0) / portfolioReturns.length;
    const marketMean = marketReturns.reduce((sum, r) => sum + r, 0) / marketReturns.length;
    
    return portfolioMean - (beta * marketMean);
  }

  private async getStockSector(symbol: string): Promise<string> {
    // TODO: 実際のセクター情報取得
    const sectorMap: { [key: string]: string } = {
      '7203': 'Automotive',
      '9984': 'Technology',
      '6758': 'Technology',
      '4689': 'Technology',
      '8306': 'Financial'
    };
    return sectorMap[symbol] || 'Other';
  }

  private async getStockLiquidityScore(symbol: string): Promise<number> {
    // TODO: 実際の流動性スコア計算
    return 60 + Math.random() * 40; // 60-100の範囲
  }

  private async getStockBeta(symbol: string): Promise<number> {
    // TODO: 実際のベータ取得
    return 0.8 + Math.random() * 0.4; // 0.8-1.2の範囲
  }

  private async getSectorSensitivity(symbol: string, scenario: string): Promise<number> {
    // TODO: セクター別感応度の実装
    return 0.8 + Math.random() * 0.4; // 0.8-1.2の範囲
  }
}

export const portfolioRiskService = new PortfolioRiskService();