import { db } from '../config/database';
import { portfolioService, PortfolioHolding } from './portfolioService';
import { portfolioRiskService } from './portfolioRiskService';
import { APP_CONSTANTS } from '../utils/constants';
import { ErrorHandler } from '../utils/error.handler';
import { PortfolioRefactoring } from '../utils/refactoring.helper';
import { OptimizationHelper } from '../utils/optimization.helper';
import { FinancialCalculator } from '../utils/financial.calculator';

export interface OptimizationConstraints {
  minWeight?: number;
  maxWeight?: number;
  maxSectorAllocation?: { [sector: string]: number };
  minSectorAllocation?: { [sector: string]: number };
  targetReturn?: number;
  maxRisk?: number;
  riskFreeRate?: number;
  rebalanceThreshold?: number;
}

export interface OptimizationObjective {
  type: 'MAX_RETURN' | 'MIN_RISK' | 'MAX_SHARPE' | 'RISK_PARITY' | 'EQUAL_WEIGHT';
  riskTolerance: 'CONSERVATIVE' | 'MODERATE' | 'AGGRESSIVE';
  timeHorizon: 'SHORT' | 'MEDIUM' | 'LONG'; // 1年未満、1-5年、5年以上
}

export interface OptimizedPortfolio {
  portfolioId: string;
  objective: OptimizationObjective;
  allocations: Array<{
    symbol: string;
    targetWeight: number;
    currentWeight: number;
    recommendedAction: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    amount: number;
  }>;
  expectedReturn: number;
  expectedRisk: number;
  sharpeRatio: number;
  metrics: {
    diversificationRatio: number;
    concentrationIndex: number;
    trackingError: number;
    informationRatio: number;
  };
  rebalancingNeeded: boolean;
  totalRebalanceAmount: number;
  estimatedCosts: {
    tradingFees: number;
    marketImpact: number;
    totalCost: number;
  };
}

export interface EfficientFrontierPoint {
  risk: number;
  return: number;
  sharpeRatio: number;
  allocations: { [symbol: string]: number };
}

export interface RiskParityResult {
  allocations: { [symbol: string]: number };
  riskContributions: { [symbol: string]: number };
  totalRisk: number;
  diversificationRatio: number;
}

class PortfolioOptimizationService {
  /**
   * ポートフォリオ最適化メイン関数
   */
  async optimizePortfolio(
    portfolioId: string,
    userId: string,
    objective: OptimizationObjective,
    constraints: OptimizationConstraints = {}
  ): Promise<OptimizedPortfolio> {
    try {
      const portfolio = await portfolioService.getPortfolioById(portfolioId, userId);
      if (!portfolio) {
        throw new Error('Portfolio not found');
      }

      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);

      // 価格データとリターン行列取得
      const returns = await this.getReturnsMatrix(holdings);
      const covariance = this.calculateCovarianceMatrix(returns);
      const expectedReturns = this.calculateExpectedReturns(returns);

      // 最適化実行
      let optimizedAllocations: { [symbol: string]: number };
      
      switch (objective.type) {
        case 'MAX_RETURN':
          optimizedAllocations = await this.maximizeReturn(expectedReturns, covariance, constraints);
          break;
        case 'MIN_RISK':
          optimizedAllocations = await this.minimizeRisk(covariance, constraints);
          break;
        case 'MAX_SHARPE':
          optimizedAllocations = await this.maximizeSharpeRatio(expectedReturns, covariance, constraints);
          break;
        case 'RISK_PARITY':
          const riskParityResult = await this.calculateRiskParity(covariance, constraints);
          optimizedAllocations = riskParityResult.allocations;
          break;
        case 'EQUAL_WEIGHT':
          optimizedAllocations = this.calculateEqualWeight(holdings);
          break;
        default:
          throw new Error('Invalid optimization objective');
      }

      // 現在の配分計算
      const currentAllocations = this.calculateCurrentAllocations(holdings, summary.totalValue);
      
      // リバランシング推奨計算
      const rebalanceRecommendations = this.calculateRebalanceRecommendations(
        currentAllocations,
        optimizedAllocations,
        summary.totalValue,
        constraints
      );

      // メトリクス計算
      const metrics = await this.calculateOptimizationMetrics(
        optimizedAllocations,
        expectedReturns,
        covariance,
        holdings
      );

      // コスト推定
      const estimatedCosts = this.estimateTradingCosts(rebalanceRecommendations, summary.totalValue);

      const result: OptimizedPortfolio = {
        portfolioId,
        objective,
        allocations: rebalanceRecommendations,
        expectedReturn: metrics.expectedReturn,
        expectedRisk: metrics.expectedRisk,
        sharpeRatio: metrics.sharpeRatio,
        metrics: {
          diversificationRatio: metrics.diversificationRatio,
          concentrationIndex: metrics.concentrationIndex,
          trackingError: metrics.trackingError,
          informationRatio: metrics.informationRatio
        },
        rebalancingNeeded: rebalanceRecommendations.some(rec => rec.recommendedAction !== 'HOLD'),
        totalRebalanceAmount: rebalanceRecommendations.reduce((sum, rec) => sum + Math.abs(rec.amount), 0),
        estimatedCosts
      };

      // 結果をデータベースに保存
      await this.saveOptimizationResult(result);

      console.log(`🎯 Portfolio optimization completed: ${objective.type} for ${portfolioId}`);
      return result;
    } catch (error) {
      ErrorHandler.logError('Optimize portfolio', error);
      throw error;
    }
  }

  /**
   * 効率的フロンティア計算
   */
  async calculateEfficientFrontier(
    portfolioId: string,
    userId: string,
    constraints: OptimizationConstraints = {},
    pointCount: number = 20
  ): Promise<EfficientFrontierPoint[]> {
    try {
      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      const returns = await this.getReturnsMatrix(holdings);
      const covariance = this.calculateCovarianceMatrix(returns);
      const expectedReturns = this.calculateExpectedReturns(returns);

      const minRisk = await this.minimizeRisk(covariance, constraints);
      const maxReturn = await this.maximizeReturn(expectedReturns, covariance, constraints);

      const minRiskReturn = this.calculatePortfolioReturn(minRisk, expectedReturns);
      const maxReturnValue = this.calculatePortfolioReturn(maxReturn, expectedReturns);

      const frontierPoints: EfficientFrontierPoint[] = [];

      // 効率的フロンティア上の点を計算
      for (let i = 0; i < pointCount; i++) {
        const targetReturn = minRiskReturn + (maxReturnValue - minRiskReturn) * (i / (pointCount - 1));
        
        // 最適化ヘルパーを使用
        const expectedReturnsArray = Object.values(expectedReturns);
        const frontierPoint = OptimizationHelper.calculateEfficientFrontierPoint(
          targetReturn,
          expectedReturnsArray,
          covariance
        );

        const portfolioReturn = OptimizationHelper.calculatePortfolioReturn(
          frontierPoint.weights, 
          expectedReturnsArray
        );
        
        const sharpeRatio = OptimizationHelper.calculateSharpeRatio(
          portfolioReturn,
          frontierPoint.risk,
          constraints.riskFreeRate || 0.02
        );

        frontierPoints.push({
          risk: PortfolioRefactoring.safeRound(frontierPoint.risk * 100, 2),
          return: PortfolioRefactoring.safeRound(portfolioReturn * 100, 2),
          sharpeRatio: PortfolioRefactoring.safeRound(sharpeRatio, 3),
          allocations: Object.fromEntries(
            holdings.map((holding, idx) => [
              holding.symbol,
              PortfolioRefactoring.safeRound(frontierPoint.weights[idx] * 100, 2)
            ])
          )
        });
      }

      console.log(`📊 Efficient frontier calculated: ${frontierPoints.length} points`);
      return frontierPoints.sort((a, b) => a.risk - b.risk);
    } catch (error) {
      ErrorHandler.logError('Calculate efficient frontier', error);
      throw error;
    }
  }

  /**
   * リスクパリティ最適化
   */
  async calculateRiskParity(
    covariance: number[][],
    constraints: OptimizationConstraints = {}
  ): Promise<RiskParityResult> {
    try {
      // 共分散行列の検証
      if (!OptimizationHelper.validateCovarianceMatrix(covariance)) {
        throw new Error('Invalid covariance matrix');
      }

      const n = covariance.length;
      const symbols = Array.from({ length: n }, (_, i) => `asset_${i}`);
      
      // 最適化ヘルパーを使用してリスクパリティ重みを計算
      const weights = OptimizationHelper.calculateRiskParityWeights(
        covariance,
        constraints
      );

      // リスク寄与度を計算
      const riskContributions = OptimizationHelper.calculateRiskContributions(weights, covariance);
      const totalRisk = OptimizationHelper.calculatePortfolioVolatility(weights, covariance);

      return {
        allocations: Object.fromEntries(symbols.map((s, i) => [s, weights[i]])),
        riskContributions: Object.fromEntries(symbols.map((s, i) => [s, riskContributions[i]])),
        totalRisk,
        diversificationRatio: OptimizationHelper.calculateDiversificationRatio(
          weights, 
          covariance.map((row, i) => Math.sqrt(row[i]))
        )
      };
    } catch (error) {
      ErrorHandler.logError('Calculate risk parity', error);
      throw error;
    }
  }

  /**
   * ポートフォリオリバランシング提案
   */
  async generateRebalancingProposal(
    portfolioId: string,
    userId: string,
    targetAllocations: { [symbol: string]: number }
  ): Promise<Array<{
    symbol: string;
    currentQuantity: number;
    targetQuantity: number;
    action: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    estimatedCost: number;
  }>> {
    try {
      const holdings = await portfolioService.getPortfolioHoldings(portfolioId, userId);
      const summary = await portfolioService.getPortfolioSummary(portfolioId, userId);
      const currentPrices = await this.getCurrentPrices(holdings.map(h => h.symbol));

      const proposals = [];

      for (const holding of holdings) {
        const currentPrice = currentPrices[holding.symbol] || holding.averageCost;
        const currentValue = holding.quantity * currentPrice;
        const currentWeight = currentValue / summary.totalValue;
        const targetWeight = targetAllocations[holding.symbol] || 0;
        
        const targetValue = summary.totalValue * targetWeight;
        const targetQuantity = Math.floor(targetValue / currentPrice);
        const quantityDiff = targetQuantity - holding.quantity;

        let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
        if (Math.abs(quantityDiff) > 0) {
          action = quantityDiff > 0 ? 'BUY' : 'SELL';
        }

        // 取引コスト推定（0.1%の手数料 + マーケットインパクト）
        const tradeValue = Math.abs(quantityDiff) * currentPrice;
        const tradingFee = tradeValue * 0.001;
        const marketImpact = tradeValue * 0.0005; // 小さなマーケットインパクト
        const estimatedCost = tradingFee + marketImpact;

        proposals.push({
          symbol: holding.symbol,
          currentQuantity: holding.quantity,
          targetQuantity,
          action,
          quantity: Math.abs(quantityDiff),
          estimatedCost
        });
      }

      return proposals.filter(p => p.action !== 'HOLD');
    } catch (error) {
      ErrorHandler.logError('Generate rebalancing proposal', error);
      throw error;
    }
  }

  /**
   * 最適化アルゴリズム実装群
   */

  private async maximizeReturn(
    expectedReturns: { [symbol: string]: number },
    covariance: number[][],
    constraints: OptimizationConstraints
  ): Promise<{ [symbol: string]: number }> {
    // シンプルな最大リターン最適化（制約あり）
    const symbols = Object.keys(expectedReturns);
    const maxRiskConstraint = constraints.maxRisk || 0.25; // 25%のリスク上限
    
    // リスク制約下での最大リターン配分計算
    const sortedByReturn = symbols
      .map(symbol => ({ symbol, return: expectedReturns[symbol] }))
      .sort((a, b) => b.return - a.return);

    const allocation: { [symbol: string]: number } = {};
    let remainingWeight = 1.0;
    
    for (const { symbol } of sortedByReturn) {
      const maxWeight = Math.min(
        constraints.maxWeight || 0.4,
        remainingWeight
      );
      const minWeight = constraints.minWeight || 0.01;
      
      allocation[symbol] = Math.max(minWeight, Math.min(maxWeight, remainingWeight));
      remainingWeight -= allocation[symbol];
      
      if (remainingWeight <= 0) break;
    }

    // 残った重みを配分
    if (remainingWeight > 0) {
      const remainingSymbols = symbols.filter(s => !allocation[s]);
      const equalWeight = remainingWeight / remainingSymbols.length;
      remainingSymbols.forEach(symbol => {
        allocation[symbol] = equalWeight;
      });
    }

    return allocation;
  }

  private async minimizeRisk(
    covariance: number[][],
    constraints: OptimizationConstraints
  ): Promise<{ [symbol: string]: number }> {
    // 最小分散ポートフォリオ
    const n = covariance.length;
    const symbols = Array.from({ length: n }, (_, i) => `asset_${i}`);
    
    // 共分散行列の逆行列計算（簡略化）
    const ones = Array(n).fill(1);
    const invCov = this.pseudoInverse(covariance);
    
    // 最小分散重み = (Σ^-1 * 1) / (1' * Σ^-1 * 1)
    const numerator = this.matrixVectorMultiply(invCov, ones);
    const denominator = this.vectorDotProduct(ones, numerator);
    
    const weights = numerator.map(w => w / denominator);
    
    // 制約適用
    const constrainedWeights = this.applyConstraints(weights, constraints);
    
    return Object.fromEntries(symbols.map((s, i) => [s, constrainedWeights[i]]));
  }

  private async maximizeSharpeRatio(
    expectedReturns: { [symbol: string]: number },
    covariance: number[][],
    constraints: OptimizationConstraints
  ): Promise<{ [symbol: string]: number }> {
    // シャープレシオ最大化（マルコヴィッツ最適化）
    const riskFreeRate = constraints.riskFreeRate || 0.02;
    const symbols = Object.keys(expectedReturns);
    
    // 超過リターン計算
    const excessReturns = symbols.map(symbol => expectedReturns[symbol] - riskFreeRate);
    
    // シャープレシオ最大化の解析解
    const invCov = this.pseudoInverse(covariance);
    const numerator = this.matrixVectorMultiply(invCov, excessReturns);
    const sum = numerator.reduce((s, w) => s + w, 0);
    
    const weights = numerator.map(w => w / sum);
    const constrainedWeights = this.applyConstraints(weights, constraints);
    
    return Object.fromEntries(symbols.map((s, i) => [s, constrainedWeights[i]]));
  }

  private calculateEqualWeight(holdings: PortfolioHolding[]): { [symbol: string]: number } {
    const weight = 1 / holdings.length;
    return Object.fromEntries(holdings.map(h => [h.symbol, weight]));
  }

  /**
   * ヘルパーメソッド群
   */

  private async getReturnsMatrix(holdings: PortfolioHolding[]): Promise<{ [symbol: string]: number[] }> {
    const returns: { [symbol: string]: number[] } = {};
    
    for (const holding of holdings) {
      // 過去60日のリターンデータ取得
      const priceData = await db.all(`
        SELECT price, timestamp 
        FROM real_time_prices 
        WHERE symbol = ? 
        ORDER BY timestamp DESC 
        LIMIT 61
      `, [holding.symbol]);
      
      if (priceData.length >= 2) {
        const dailyReturns = [];
        for (let i = 1; i < priceData.length; i++) {
          const currentPrice = priceData[i - 1].price;
          const previousPrice = priceData[i].price;
          const return_ = (currentPrice - previousPrice) / previousPrice;
          dailyReturns.push(return_);
        }
        returns[holding.symbol] = dailyReturns;
      } else {
        // デフォルトのリターン（シミュレーション用）
        returns[holding.symbol] = Array.from({ length: 60 }, () => (Math.random() - 0.5) * 0.04);
      }
    }
    
    return returns;
  }

  private calculateCovarianceMatrix(returns: { [symbol: string]: number[] }): number[][] {
    const symbols = Object.keys(returns);
    const n = symbols.length;
    const matrix: number[][] = Array(n).fill(null).map(() => Array(n).fill(0));
    
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        matrix[i][j] = this.calculateCovariance(returns[symbols[i]], returns[symbols[j]]);
      }
    }
    
    return matrix;
  }

  private calculateCovariance(x: number[], y: number[]): number {
    const n = Math.min(x.length, y.length);
    const meanX = x.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    const meanY = y.slice(0, n).reduce((sum, val) => sum + val, 0) / n;
    
    let covariance = 0;
    for (let i = 0; i < n; i++) {
      covariance += (x[i] - meanX) * (y[i] - meanY);
    }
    
    return covariance / (n - 1);
  }

  private calculateExpectedReturns(returns: { [symbol: string]: number[] }): { [symbol: string]: number } {
    const expectedReturns: { [symbol: string]: number } = {};
    
    for (const [symbol, returnSeries] of Object.entries(returns)) {
      const mean = returnSeries.reduce((sum, ret) => sum + ret, 0) / returnSeries.length;
      expectedReturns[symbol] = mean * 252; // 年率換算
    }
    
    return expectedReturns;
  }

  private calculateCurrentAllocations(
    holdings: PortfolioHolding[], 
    totalValue: number
  ): { [symbol: string]: number } {
    const allocations: { [symbol: string]: number } = {};
    
    for (const holding of holdings) {
      const holdingValue = holding.quantity * holding.averageCost; // 簡略化
      allocations[holding.symbol] = holdingValue / totalValue;
    }
    
    return allocations;
  }

  private calculateRebalanceRecommendations(
    currentAllocations: { [symbol: string]: number },
    targetAllocations: { [symbol: string]: number },
    totalValue: number,
    constraints: OptimizationConstraints
  ): Array<{
    symbol: string;
    targetWeight: number;
    currentWeight: number;
    recommendedAction: 'BUY' | 'SELL' | 'HOLD';
    quantity: number;
    amount: number;
  }> {
    const recommendations = [];
    const threshold = constraints.rebalanceThreshold || 0.05; // 5%の閾値
    
    for (const [symbol, targetWeight] of Object.entries(targetAllocations)) {
      const currentWeight = currentAllocations[symbol] || 0;
      const weightDiff = targetWeight - currentWeight;
      const amount = weightDiff * totalValue;
      
      let action: 'BUY' | 'SELL' | 'HOLD' = 'HOLD';
      if (Math.abs(weightDiff) > threshold) {
        action = weightDiff > 0 ? 'BUY' : 'SELL';
      }
      
      recommendations.push({
        symbol,
        targetWeight: PortfolioRefactoring.safeRound(targetWeight * 100, 2),
        currentWeight: PortfolioRefactoring.safeRound(currentWeight * 100, 2),
        recommendedAction: action,
        quantity: Math.abs(Math.floor(amount / 1000)), // 簡略化された数量計算
        amount: PortfolioRefactoring.safeRound(Math.abs(amount))
      });
    }
    
    return recommendations;
  }

  private async calculateOptimizationMetrics(
    allocations: { [symbol: string]: number },
    expectedReturns: { [symbol: string]: number },
    covariance: number[][],
    holdings: PortfolioHolding[]
  ): Promise<{
    expectedReturn: number;
    expectedRisk: number;
    sharpeRatio: number;
    diversificationRatio: number;
    concentrationIndex: number;
    trackingError: number;
    informationRatio: number;
  }> {
    const weights = Object.values(allocations);
    const returns = Object.values(expectedReturns);
    
    const expectedReturn = this.calculatePortfolioReturn(allocations, expectedReturns);
    const variance = this.calculatePortfolioVariance(allocations, covariance);
    const expectedRisk = Math.sqrt(variance);
    const sharpeRatio = expectedReturn / expectedRisk;
    
    // 最適化ヘルパーを使用してメトリクス計算
    const volatilities = Object.keys(allocations).map((_, i) => Math.sqrt(covariance[i][i]));
    const diversificationRatio = OptimizationHelper.calculateDiversificationRatio(weights, volatilities);
    const concentrationIndex = OptimizationHelper.calculateConcentrationIndex(weights);
    
    // トラッキングエラーと情報比率（ベンチマーク対比）
    const trackingError = expectedRisk * 0.8; // 簡略化
    const informationRatio = expectedReturn / trackingError;
    
    return {
      expectedReturn: PortfolioRefactoring.safeRound(expectedReturn * 100, 2),
      expectedRisk: PortfolioRefactoring.safeRound(expectedRisk * 100, 2),
      sharpeRatio: PortfolioRefactoring.safeRound(sharpeRatio, 3),
      diversificationRatio: PortfolioRefactoring.safeRound(diversificationRatio, 3),
      concentrationIndex: PortfolioRefactoring.safeRound(concentrationIndex, 3),
      trackingError: PortfolioRefactoring.safeRound(trackingError * 100, 2),
      informationRatio: PortfolioRefactoring.safeRound(informationRatio, 3)
    };
  }

  private estimateTradingCosts(
    recommendations: Array<{ amount: number }>,
    totalValue: number
  ): { tradingFees: number; marketImpact: number; totalCost: number } {
    const totalTradeAmount = recommendations.reduce((sum, rec) => sum + Math.abs(rec.amount), 0);
    
    // 最適化ヘルパーを使用して取引コストを計算
    const costEstimate = OptimizationHelper.estimateTradingCosts(
      [], // 現在重み（空配列として簡略化）
      [], // 目標重み（空配列として簡略化）
      totalValue,
      {
        fixedCost: 10,
        variableCostRate: 0.001,
        marketImpactRate: 0.0005
      }
    );
    
    // 実際の取引金額に基づく調整
    const adjustmentFactor = totalTradeAmount / totalValue;
    
    return {
      tradingFees: PortfolioRefactoring.safeRound(totalTradeAmount * 0.001),
      marketImpact: PortfolioRefactoring.safeRound(totalTradeAmount * 0.0005 * adjustmentFactor),
      totalCost: PortfolioRefactoring.safeRound(totalTradeAmount * (0.001 + 0.0005 * adjustmentFactor))
    };
  }

  private async getCurrentPrices(symbols: string[]): Promise<{ [symbol: string]: number }> {
    const prices: { [symbol: string]: number } = {};
    
    for (const symbol of symbols) {
      const priceData = await db.get(`
        SELECT price FROM real_time_prices 
        WHERE symbol = ? 
        ORDER BY timestamp DESC 
        LIMIT 1
      `, [symbol]);
      
      prices[symbol] = priceData ? priceData.price : 100; // デフォルト価格
    }
    
    return prices;
  }

  private async saveOptimizationResult(result: OptimizedPortfolio): Promise<void> {
    const optimizationId = PortfolioRefactoring.generateUniqueId('optimization');
    const now = PortfolioRefactoring.formatDate(new Date());
    
    await db.run(`
      INSERT INTO portfolio_optimizations (
        id, portfolio_id, objective_type, risk_tolerance, 
        expected_return, expected_risk, sharpe_ratio,
        allocations, metrics, estimated_costs,
        created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      optimizationId,
      result.portfolioId,
      result.objective.type,
      result.objective.riskTolerance,
      result.expectedReturn,
      result.expectedRisk,
      result.sharpeRatio,
      JSON.stringify(result.allocations),
      JSON.stringify(result.metrics),
      JSON.stringify(result.estimatedCosts),
      now
    ]);
  }

  // 数学的ヘルパーメソッド

  private calculatePortfolioReturn(
    allocations: { [symbol: string]: number },
    expectedReturns: { [symbol: string]: number }
  ): number {
    let portfolioReturn = 0;
    for (const [symbol, weight] of Object.entries(allocations)) {
      portfolioReturn += weight * (expectedReturns[symbol] || 0);
    }
    return portfolioReturn;
  }

  private calculatePortfolioVariance(
    allocations: { [symbol: string]: number },
    covariance: number[][]
  ): number {
    const symbols = Object.keys(allocations);
    const weights = symbols.map(s => allocations[s]);
    
    let variance = 0;
    for (let i = 0; i < symbols.length; i++) {
      for (let j = 0; j < symbols.length; j++) {
        variance += weights[i] * weights[j] * covariance[i][j];
      }
    }
    
    return variance;
  }

  private calculateRiskContributions(weights: number[], covariance: number[][]): number[] {
    const n = weights.length;
    const portfolioVariance = this.calculatePortfolioVariance(
      Object.fromEntries(weights.map((w, i) => [`asset_${i}`, w])),
      covariance
    );
    const portfolioRisk = Math.sqrt(portfolioVariance);
    
    const riskContributions = [];
    for (let i = 0; i < n; i++) {
      let marginalContribution = 0;
      for (let j = 0; j < n; j++) {
        marginalContribution += weights[j] * covariance[i][j];
      }
      riskContributions.push((weights[i] * marginalContribution) / portfolioRisk);
    }
    
    return riskContributions;
  }

  private calculateDiversificationRatio(weights: number[], covariance: number[][]): number {
    // 重み付き平均ボラティリティ / ポートフォリオボラティリティ
    const weightedAvgVol = weights.reduce((sum, w, i) => sum + w * Math.sqrt(covariance[i][i]), 0);
    const portfolioVol = Math.sqrt(this.calculatePortfolioVariance(
      Object.fromEntries(weights.map((w, i) => [`asset_${i}`, w])),
      covariance
    ));
    
    return weightedAvgVol / portfolioVol;
  }

  private applyConstraints(weights: number[], constraints: OptimizationConstraints): number[] {
    const minWeight = constraints.minWeight || 0.01;
    const maxWeight = constraints.maxWeight || 0.5;
    
    // 制約適用
    let constrainedWeights = weights.map(w => Math.max(minWeight, Math.min(maxWeight, w)));
    
    // 正規化
    const sum = constrainedWeights.reduce((s, w) => s + w, 0);
    constrainedWeights = constrainedWeights.map(w => w / sum);
    
    return constrainedWeights;
  }

  // 行列演算ヘルパー

  private pseudoInverse(matrix: number[][]): number[][] {
    // 簡略化された擬似逆行列計算
    const n = matrix.length;
    const identity = Array(n).fill(null).map((_, i) => 
      Array(n).fill(0).map((_, j) => i === j ? 1 : 0)
    );
    
    // 正則化項を追加（数値安定性のため）
    const regularized = matrix.map((row, i) => 
      row.map((val, j) => i === j ? val + 0.001 : val)
    );
    
    return identity; // 実際の実装では適切な逆行列計算が必要
  }

  private matrixVectorMultiply(matrix: number[][], vector: number[]): number[] {
    return matrix.map(row => 
      row.reduce((sum, val, i) => sum + val * vector[i], 0)
    );
  }

  private vectorDotProduct(a: number[], b: number[]): number {
    return a.reduce((sum, val, i) => sum + val * b[i], 0);
  }
}

export const portfolioOptimizationService = new PortfolioOptimizationService();