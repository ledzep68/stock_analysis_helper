/**
 * ポートフォリオ最適化ユーティリティヘルパー
 * 最適化関連の共通処理とアルゴリズムを提供
 */

export class OptimizationHelper {
  /**
   * 共分散行列の検証
   */
  static validateCovarianceMatrix(matrix: number[][]): boolean {
    if (!matrix || matrix.length === 0) {
      return false;
    }

    const n = matrix.length;
    
    // 正方行列かチェック
    for (const row of matrix) {
      if (!row || row.length !== n) {
        return false;
      }
    }

    // 対称行列かチェック
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        if (Math.abs(matrix[i][j] - matrix[j][i]) > 1e-10) {
          return false;
        }
      }
    }

    // 正定値行列かチェック（対角要素が正）
    for (let i = 0; i < n; i++) {
      if (matrix[i][i] <= 0) {
        return false;
      }
    }

    return true;
  }

  /**
   * リターン配列の統計計算
   */
  static calculateReturnStatistics(returns: number[]) {
    if (returns.length === 0) {
      return { mean: 0, variance: 0, standardDeviation: 0 };
    }

    const mean = returns.reduce((sum, r) => sum + r, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / (returns.length - 1);
    const standardDeviation = Math.sqrt(variance);

    return { mean, variance, standardDeviation };
  }

  /**
   * 配分の正規化（合計を1にする）
   */
  static normalizeWeights(weights: number[]): number[] {
    const sum = weights.reduce((s, w) => s + w, 0);
    if (sum === 0) {
      return weights.map(() => 1 / weights.length);
    }
    return weights.map(w => w / sum);
  }

  /**
   * 制約条件の適用
   */
  static applyConstraints(
    weights: number[],
    constraints: {
      minWeight?: number;
      maxWeight?: number;
    }
  ): number[] {
    const { minWeight = 0, maxWeight = 1 } = constraints;
    
    // 制約適用
    let constrainedWeights = weights.map(w => 
      Math.max(minWeight, Math.min(maxWeight, w))
    );

    // 再正規化
    return this.normalizeWeights(constrainedWeights);
  }

  /**
   * シャープレシオの計算
   */
  static calculateSharpeRatio(
    expectedReturn: number,
    volatility: number,
    riskFreeRate: number = 0.02
  ): number {
    if (volatility === 0) return 0;
    return (expectedReturn - riskFreeRate) / volatility;
  }

  /**
   * ポートフォリオリターンの計算
   */
  static calculatePortfolioReturn(
    weights: number[],
    expectedReturns: number[]
  ): number {
    if (weights.length !== expectedReturns.length) {
      throw new Error('Weights and returns arrays must have the same length');
    }
    
    return weights.reduce((sum, w, i) => sum + w * expectedReturns[i], 0);
  }

  /**
   * ポートフォリオボラティリティの計算
   */
  static calculatePortfolioVolatility(
    weights: number[],
    covarianceMatrix: number[][]
  ): number {
    const n = weights.length;
    if (covarianceMatrix.length !== n || covarianceMatrix[0].length !== n) {
      throw new Error('Covariance matrix dimensions must match weights length');
    }

    let variance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        variance += weights[i] * weights[j] * covarianceMatrix[i][j];
      }
    }

    return Math.sqrt(Math.max(0, variance));
  }

  /**
   * リスク寄与度の計算
   */
  static calculateRiskContributions(
    weights: number[],
    covarianceMatrix: number[][]
  ): number[] {
    const n = weights.length;
    const totalRisk = this.calculatePortfolioVolatility(weights, covarianceMatrix);
    
    if (totalRisk === 0) {
      return weights.map(() => 0);
    }

    const contributions = [];
    for (let i = 0; i < n; i++) {
      let marginalRisk = 0;
      for (let j = 0; j < n; j++) {
        marginalRisk += weights[j] * covarianceMatrix[i][j];
      }
      contributions.push((weights[i] * marginalRisk) / totalRisk);
    }

    return contributions;
  }

  /**
   * 等配分ポートフォリオの生成
   */
  static createEqualWeightPortfolio(assetCount: number): number[] {
    return Array(assetCount).fill(1 / assetCount);
  }

  /**
   * 最小分散ポートフォリオの計算（簡易版）
   */
  static calculateMinimumVariancePortfolio(
    covarianceMatrix: number[][],
    constraints: { minWeight?: number; maxWeight?: number } = {}
  ): number[] {
    const n = covarianceMatrix.length;
    
    if (!this.validateCovarianceMatrix(covarianceMatrix)) {
      throw new Error('Invalid covariance matrix');
    }

    // 簡易的な最小分散計算（逆分散重み付け）
    const diagonalVariances = covarianceMatrix.map((row, i) => row[i]);
    const inverseVariances = diagonalVariances.map(v => 1 / Math.max(v, 1e-8));
    
    let weights = this.normalizeWeights(inverseVariances);
    weights = this.applyConstraints(weights, constraints);

    return weights;
  }

  /**
   * リスクパリティ重みの計算（反復計算）
   */
  static calculateRiskParityWeights(
    covarianceMatrix: number[][],
    constraints: { minWeight?: number; maxWeight?: number } = {},
    maxIterations: number = 100,
    tolerance: number = 1e-6
  ): number[] {
    const n = covarianceMatrix.length;
    
    if (!this.validateCovarianceMatrix(covarianceMatrix)) {
      throw new Error('Invalid covariance matrix');
    }

    // 初期重みは等配分
    let weights = this.createEqualWeightPortfolio(n);
    
    for (let iter = 0; iter < maxIterations; iter++) {
      const riskContributions = this.calculateRiskContributions(weights, covarianceMatrix);
      const totalRisk = this.calculatePortfolioVolatility(weights, covarianceMatrix);
      
      if (totalRisk === 0) break;

      // 各資産のリスク寄与度が等しくなるように重みを調整
      const targetContribution = totalRisk / n;
      const newWeights = weights.map((w, i) => {
        const currentContribution = riskContributions[i];
        if (currentContribution === 0) return w;
        return w * Math.sqrt(targetContribution / currentContribution);
      });

      // 制約適用と正規化
      let adjustedWeights = this.applyConstraints(newWeights, constraints);
      
      // 収束チェック
      const weightChange = adjustedWeights.reduce((sum, w, i) => 
        sum + Math.abs(w - weights[i]), 0
      );
      
      weights = adjustedWeights;
      
      if (weightChange < tolerance) {
        break;
      }
    }

    return weights;
  }

  /**
   * 効率的フロンティア上のポイント計算
   */
  static calculateEfficientFrontierPoint(
    targetReturn: number,
    expectedReturns: number[],
    covarianceMatrix: number[][]
  ): { weights: number[]; risk: number } {
    const n = expectedReturns.length;
    
    // 簡易的な計算（制約なし最適化の近似）
    // 実際の実装では二次計画法やその他の最適化手法を使用
    
    // リターンに基づいた重み付け（簡易版）
    const returnWeights = expectedReturns.map(r => Math.max(0, r - targetReturn + 0.05));
    let weights = this.normalizeWeights(returnWeights);
    
    if (weights.every(w => w === 0)) {
      weights = this.createEqualWeightPortfolio(n);
    }

    const risk = this.calculatePortfolioVolatility(weights, covarianceMatrix);
    
    return { weights, risk };
  }

  /**
   * 多様化比率の計算
   */
  static calculateDiversificationRatio(
    weights: number[],
    volatilities: number[]
  ): number {
    const weightedAverageVolatility = weights.reduce((sum, w, i) => 
      sum + w * volatilities[i], 0
    );
    
    const portfolioVolatility = Math.sqrt(
      weights.reduce((sum, w, i) => sum + Math.pow(w * volatilities[i], 2), 0)
    );

    if (portfolioVolatility === 0) return 1;
    return weightedAverageVolatility / portfolioVolatility;
  }

  /**
   * 集中度指数の計算（ハーフィンダール指数）
   */
  static calculateConcentrationIndex(weights: number[]): number {
    return weights.reduce((sum, w) => sum + Math.pow(w, 2), 0);
  }

  /**
   * 重みの差分から取引コストを推定
   */
  static estimateTradingCosts(
    currentWeights: number[],
    targetWeights: number[],
    portfolioValue: number,
    costParameters: {
      fixedCost?: number;
      variableCostRate?: number;
      marketImpactRate?: number;
    } = {}
  ): {
    tradingCosts: number;
    marketImpact: number;
    totalCost: number;
  } {
    const {
      fixedCost = 10,
      variableCostRate = 0.001,
      marketImpactRate = 0.0005
    } = costParameters;

    const totalTurnover = currentWeights.reduce((sum, current, i) => {
      return sum + Math.abs(targetWeights[i] - current);
    }, 0);

    const turnoverValue = totalTurnover * portfolioValue;
    const tradingCosts = fixedCost + turnoverValue * variableCostRate;
    const marketImpact = turnoverValue * marketImpactRate;
    const totalCost = tradingCosts + marketImpact;

    return { tradingCosts, marketImpact, totalCost };
  }

  /**
   * 重みの妥当性チェック
   */
  static validateWeights(weights: number[]): boolean {
    if (!weights || weights.length === 0) return false;
    
    // 負の重みがないかチェック
    if (weights.some(w => w < 0)) return false;
    
    // 合計が1に近いかチェック
    const sum = weights.reduce((s, w) => s + w, 0);
    if (Math.abs(sum - 1) > 1e-6) return false;
    
    return true;
  }
}