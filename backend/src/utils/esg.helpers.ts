import { ESGGrade, RiskLevel, ESGScoreWeights } from '../types/esg';

/**
 * ESG関連のヘルパー関数集
 */
export class ESGHelpers {
  
  /**
   * デフォルトのESGスコア重み
   */
  static readonly DEFAULT_WEIGHTS: ESGScoreWeights = {
    environmental: 0.33,
    social: 0.33,
    governance: 0.34
  };

  /**
   * スコア正規化（0-100の範囲に正規化）
   */
  static normalizeScore(value: number, min: number = 0, max: number = 100): number {
    return Math.max(0, Math.min(100, ((value - min) / (max - min)) * 100));
  }

  /**
   * ESGグレードの計算
   */
  static calculateESGGrade(totalScore: number): ESGGrade {
    if (totalScore >= 90) return 'AAA';
    if (totalScore >= 80) return 'AA';
    if (totalScore >= 70) return 'A';
    if (totalScore >= 60) return 'BBB';
    if (totalScore >= 50) return 'BB';
    if (totalScore >= 40) return 'B';
    return 'CCC';
  }

  /**
   * リスクレベルの決定
   */
  static determineRiskLevel(totalRiskScore: number): RiskLevel {
    if (totalRiskScore <= 25) return 'LOW';
    if (totalRiskScore <= 50) return 'MEDIUM';
    if (totalRiskScore <= 75) return 'HIGH';
    return 'CRITICAL';
  }

  /**
   * パーセンタイルランクの計算
   */
  static calculatePercentileRank(companyScore: number, industryAverage: number): number {
    // 簡易的なパーセンタイル計算
    if (companyScore >= industryAverage * 1.2) return 90;
    if (companyScore >= industryAverage * 1.1) return 75;
    if (companyScore >= industryAverage) return 50;
    if (companyScore >= industryAverage * 0.9) return 25;
    return 10;
  }

  /**
   * 複数スコアの加重平均計算
   */
  static calculateWeightedAverage(
    scores: number[], 
    weights: number[]
  ): number {
    if (scores.length !== weights.length) {
      throw new Error('スコアと重みの配列の長さが一致しません');
    }

    const validPairs = scores
      .map((score, index) => ({ score, weight: weights[index] }))
      .filter(pair => !isNaN(pair.score) && pair.score >= 0);

    if (validPairs.length === 0) return 0;

    const totalWeight = validPairs.reduce((sum, pair) => sum + pair.weight, 0);
    const weightedSum = validPairs.reduce((sum, pair) => sum + (pair.score * pair.weight), 0);

    return weightedSum / totalWeight;
  }

  /**
   * 環境スコアの計算
   */
  static calculateEnvironmentalScore(metrics: {
    carbonIntensity?: number;
    renewableEnergyRatio?: number;
    wasteManagementScore?: number;
    energyConsumption?: number;
  }): number {
    const scores = [];
    const weights = [];

    if (metrics.carbonIntensity !== undefined) {
      scores.push(this.normalizeScore(100 - metrics.carbonIntensity, 0, 100));
      weights.push(0.3);
    }

    if (metrics.renewableEnergyRatio !== undefined) {
      scores.push(metrics.renewableEnergyRatio);
      weights.push(0.3);
    }

    if (metrics.wasteManagementScore !== undefined) {
      scores.push(metrics.wasteManagementScore);
      weights.push(0.2);
    }

    if (metrics.energyConsumption !== undefined) {
      scores.push(this.normalizeScore(100 - metrics.energyConsumption, 0, 100));
      weights.push(0.2);
    }

    return scores.length > 0 ? this.calculateWeightedAverage(scores, weights) : 0;
  }

  /**
   * 社会スコアの計算
   */
  static calculateSocialScore(metrics: {
    employeeSatisfaction?: number;
    diversityScore?: number;
    humanRightsScore?: number;
    laborPracticesScore?: number;
    safetyIncidents?: number;
  }): number {
    const scores = [];
    const weights = [];

    if (metrics.employeeSatisfaction !== undefined) {
      scores.push(metrics.employeeSatisfaction);
      weights.push(0.25);
    }

    if (metrics.diversityScore !== undefined) {
      scores.push(metrics.diversityScore);
      weights.push(0.2);
    }

    if (metrics.humanRightsScore !== undefined) {
      scores.push(metrics.humanRightsScore);
      weights.push(0.25);
    }

    if (metrics.laborPracticesScore !== undefined) {
      scores.push(metrics.laborPracticesScore);
      weights.push(0.2);
    }

    if (metrics.safetyIncidents !== undefined) {
      scores.push(Math.max(0, 100 - (metrics.safetyIncidents * 10)));
      weights.push(0.1);
    }

    return scores.length > 0 ? this.calculateWeightedAverage(scores, weights) : 0;
  }

  /**
   * ガバナンススコアの計算
   */
  static calculateGovernanceScore(metrics: {
    boardIndependence?: number;
    transparencyScore?: number;
    auditQualityScore?: number;
    riskManagementScore?: number;
    executiveCompensationRatio?: number;
  }): number {
    const scores = [];
    const weights = [];

    if (metrics.boardIndependence !== undefined) {
      scores.push(metrics.boardIndependence);
      weights.push(0.25);
    }

    if (metrics.transparencyScore !== undefined) {
      scores.push(metrics.transparencyScore);
      weights.push(0.25);
    }

    if (metrics.auditQualityScore !== undefined) {
      scores.push(metrics.auditQualityScore);
      weights.push(0.2);
    }

    if (metrics.riskManagementScore !== undefined) {
      scores.push(metrics.riskManagementScore);
      weights.push(0.2);
    }

    if (metrics.executiveCompensationRatio !== undefined) {
      scores.push(this.normalizeScore(100 - metrics.executiveCompensationRatio, 0, 100));
      weights.push(0.1);
    }

    return scores.length > 0 ? this.calculateWeightedAverage(scores, weights) : 0;
  }

  /**
   * 評価ノートの生成
   */
  static generateEvaluationNotes(
    environmentalScore: number, 
    socialScore: number, 
    governanceScore: number
  ): string {
    const notes = [];
    
    if (environmentalScore >= 70) {
      notes.push('環境への取り組みが優秀');
    } else if (environmentalScore < 50) {
      notes.push('環境対策の改善が必要');
    }
    
    if (socialScore >= 70) {
      notes.push('社会的責任を果たしている');
    } else if (socialScore < 50) {
      notes.push('社会的取り組みの強化が必要');
    }
    
    if (governanceScore >= 70) {
      notes.push('ガバナンス体制が良好');
    } else if (governanceScore < 50) {
      notes.push('ガバナンス体制の見直しが必要');
    }
    
    return notes.length > 0 ? notes.join('、') : 'ESG総合評価を継続改善していくことが重要です';
  }

  /**
   * リスク要因の特定
   */
  static identifyRiskFactors(metrics: {
    carbonIntensity?: number;
    renewableEnergyRatio?: number;
    employeeSatisfaction?: number;
    diversityScore?: number;
    safetyIncidents?: number;
    boardIndependence?: number;
    transparencyScore?: number;
  }): string[] {
    const factors = [];
    
    if ((metrics.carbonIntensity || 0) > 70) factors.push('高炭素集約度');
    if ((metrics.renewableEnergyRatio || 0) < 30) factors.push('再生可能エネルギー比率が低い');
    if ((metrics.employeeSatisfaction || 0) < 60) factors.push('従業員満足度が低い');
    if ((metrics.diversityScore || 0) < 50) factors.push('ダイバーシティスコアが低い');
    if ((metrics.safetyIncidents || 0) > 5) factors.push('安全事故が多い');
    if ((metrics.boardIndependence || 0) < 60) factors.push('取締役独立性が低い');
    if ((metrics.transparencyScore || 0) < 60) factors.push('透明性スコアが低い');
    
    return factors;
  }

  /**
   * リスク軽減戦略の生成
   */
  static generateMitigationStrategies(riskLevel: RiskLevel): string {
    const strategies = {
      'LOW': '現在のESG取り組みを維持し、定期的なモニタリングを継続',
      'MEDIUM': '特定分野でのESG改善計画を策定し、実行',
      'HIGH': '包括的なESG改善プログラムの緊急実装が必要',
      'CRITICAL': '即座の対応と経営陣レベルでのESG戦略見直しが必要'
    };
    
    return strategies[riskLevel] || strategies['MEDIUM'];
  }

  /**
   * ESGスコアの妥当性検証
   */
  static validateScore(score: number): boolean {
    return !isNaN(score) && score >= 0 && score <= 100;
  }

  /**
   * 必須ESGフィールドの検証
   */
  static validateRequiredFields(data: {
    symbol?: string;
    reportYear?: number;
    dataSource?: string;
  }): { isValid: boolean; errors: string[] } {
    const errors = [];
    
    if (!data.symbol || data.symbol.trim().length === 0) {
      errors.push('銘柄コード（symbol）は必須です');
    }
    
    if (!data.reportYear || data.reportYear < 2000 || data.reportYear > new Date().getFullYear()) {
      errors.push('有効な報告年（reportYear）は必須です');
    }
    
    if (!data.dataSource || !['BLOOMBERG', 'MSCI', 'REFINITIV', 'MANUAL'].includes(data.dataSource)) {
      errors.push('有効なデータソース（dataSource）は必須です');
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * トレンド分析の実行
   */
  static analyzeTrend(scores: number[]): {
    trend: 'IMPROVING' | 'STABLE' | 'DECLINING';
    changeRate: number;
  } {
    if (scores.length < 2) {
      return { trend: 'STABLE', changeRate: 0 };
    }

    const latest = scores[0];
    const oldest = scores[scores.length - 1];
    const changeRate = oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;

    let trend: 'IMPROVING' | 'STABLE' | 'DECLINING' = 'STABLE';
    if (changeRate > 5) trend = 'IMPROVING';
    else if (changeRate < -5) trend = 'DECLINING';

    return { trend, changeRate: Math.round(changeRate * 100) / 100 };
  }
}