import { db } from '../config/database';
import { ESGHelpers } from '../utils/esg.helpers';
import {
  ESGData,
  ESGEvaluation,
  ESGRiskAssessment,
  IndustryBenchmark,
  ESGComparisonResult
} from '../types/esg';

// 後方互換性のため、型をエクスポート
export type {
  ESGData,
  ESGEvaluation,
  ESGRiskAssessment,
  IndustryBenchmark
};

class ESGEvaluationService {
  
  /**
   * ESGデータの保存・更新
   */
  async saveESGData(esgData: ESGData): Promise<ESGData> {
    const sql = `
      INSERT OR REPLACE INTO esg_data (
        symbol, company_name, report_year, data_source,
        environmental_score, carbon_emissions, energy_consumption, water_usage,
        waste_management_score, renewable_energy_ratio, carbon_intensity,
        social_score, employee_satisfaction, diversity_score, safety_incidents,
        community_investment, human_rights_score, labor_practices_score,
        governance_score, board_independence, executive_compensation_ratio,
        transparency_score, audit_quality_score, risk_management_score,
        total_esg_score, esg_grade, esg_ranking, last_updated
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const params = [
      esgData.symbol,
      esgData.companyName,
      esgData.reportYear,
      esgData.dataSource,
      esgData.environmentalScore,
      esgData.carbonEmissions,
      esgData.energyConsumption,
      esgData.waterUsage,
      esgData.wasteManagementScore,
      esgData.renewableEnergyRatio,
      esgData.carbonIntensity,
      esgData.socialScore,
      esgData.employeeSatisfaction,
      esgData.diversityScore,
      esgData.safetyIncidents,
      esgData.communityInvestment,
      esgData.humanRightsScore,
      esgData.laborPracticesScore,
      esgData.governanceScore,
      esgData.boardIndependence,
      esgData.executiveCompensationRatio,
      esgData.transparencyScore,
      esgData.auditQualityScore,
      esgData.riskManagementScore,
      esgData.totalESGScore,
      esgData.esgGrade,
      esgData.esgRanking,
      new Date().toISOString()
    ];
    
    await db.run(sql, params);
    
    const savedData = await this.getESGData(esgData.symbol, esgData.reportYear);
    if (!savedData) {
      throw new Error('ESGデータの保存に失敗しました');
    }
    return savedData;
  }
  
  /**
   * ESGデータの取得
   */
  async getESGData(symbol: string, year?: number): Promise<ESGData | null> {
    let sql = `
      SELECT * FROM esg_data 
      WHERE symbol = ?
    `;
    const params: any[] = [symbol];
    
    if (year) {
      sql += ` AND report_year = ?`;
      params.push(year);
    } else {
      sql += ` ORDER BY report_year DESC LIMIT 1`;
    }
    
    const row = await db.get(sql, params);
    
    if (!row) return null;
    
    return this.mapRowToESGData(row);
  }
  
  /**
   * 複数年のESGデータ取得
   */
  async getESGDataHistory(symbol: string, years?: number): Promise<ESGData[]> {
    let sql = `
      SELECT * FROM esg_data 
      WHERE symbol = ?
      ORDER BY report_year DESC
    `;
    const params: any[] = [symbol];
    
    if (years) {
      sql += ` LIMIT ?`;
      params.push(years);
    }
    
    const rows = await db.all(sql, params);
    
    return rows.map(row => this.mapRowToESGData(row));
  }
  
  /**
   * ESG評価の計算
   */
  async calculateESGScore(symbol: string, data: Partial<ESGData>): Promise<ESGEvaluation> {
    // 各カテゴリーのスコア計算
    const environmentalScore = ESGHelpers.calculateEnvironmentalScore({
      carbonIntensity: data.carbonIntensity,
      renewableEnergyRatio: data.renewableEnergyRatio,
      wasteManagementScore: data.wasteManagementScore,
      energyConsumption: data.energyConsumption
    });
    
    const socialScore = ESGHelpers.calculateSocialScore({
      employeeSatisfaction: data.employeeSatisfaction,
      diversityScore: data.diversityScore,
      humanRightsScore: data.humanRightsScore,
      laborPracticesScore: data.laborPracticesScore,
      safetyIncidents: data.safetyIncidents
    });
    
    const governanceScore = ESGHelpers.calculateGovernanceScore({
      boardIndependence: data.boardIndependence,
      transparencyScore: data.transparencyScore,
      auditQualityScore: data.auditQualityScore,
      riskManagementScore: data.riskManagementScore,
      executiveCompensationRatio: data.executiveCompensationRatio
    });
    
    // 総合スコア計算
    const totalScore = ESGHelpers.calculateWeightedAverage(
      [environmentalScore, socialScore, governanceScore],
      [ESGHelpers.DEFAULT_WEIGHTS.environmental, ESGHelpers.DEFAULT_WEIGHTS.social, ESGHelpers.DEFAULT_WEIGHTS.governance]
    );
    
    // グレード計算
    const grade = ESGHelpers.calculateESGGrade(totalScore);
    
    const evaluation: ESGEvaluation = {
      symbol,
      evaluationDate: new Date(),
      evaluator: 'SYSTEM_AUTO',
      environmentalScore,
      socialScore,
      governanceScore,
      totalScore,
      grade,
      evaluationNotes: ESGHelpers.generateEvaluationNotes(environmentalScore, socialScore, governanceScore)
    };
    
    // 評価履歴に保存
    await this.saveEvaluation(evaluation);
    
    return evaluation;
  }
  
  
  /**
   * ESG評価の保存
   */
  async saveEvaluation(evaluation: ESGEvaluation): Promise<number> {
    const sql = `
      INSERT INTO esg_evaluation_history (
        symbol, evaluation_date, evaluator, environmental_score,
        social_score, governance_score, total_score, grade,
        evaluation_notes, key_strengths, key_concerns, improvement_recommendations
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.run(sql, [
      evaluation.symbol,
      evaluation.evaluationDate.toISOString().split('T')[0],
      evaluation.evaluator,
      evaluation.environmentalScore,
      evaluation.socialScore,
      evaluation.governanceScore,
      evaluation.totalScore,
      evaluation.grade,
      evaluation.evaluationNotes,
      evaluation.keyStrengths,
      evaluation.keyConcerns,
      evaluation.improvementRecommendations
    ]);
    
    return result.lastID;
  }
  
  /**
   * リスクアセスメントの実行
   */
  async performRiskAssessment(symbol: string, esgData: ESGData): Promise<ESGRiskAssessment> {
    // 各リスクカテゴリーのスコア計算
    const climateRiskScore = this.calculateClimateRisk(esgData);
    const regulatoryRiskScore = this.calculateRegulatoryRisk(esgData);
    const resourceScarcityRisk = this.calculateResourceScarcityRisk(esgData);
    
    const reputationRiskScore = this.calculateReputationRisk(esgData);
    const workforceRiskScore = this.calculateWorkforceRisk(esgData);
    const communityRiskScore = this.calculateCommunityRisk(esgData);
    
    const managementRiskScore = this.calculateManagementRisk(esgData);
    const complianceRiskScore = this.calculateComplianceRisk(esgData);
    const corruptionRiskScore = this.calculateCorruptionRisk(esgData);
    
    // 総合リスクスコア計算
    const totalRiskScore = (
      climateRiskScore + regulatoryRiskScore + resourceScarcityRisk +
      reputationRiskScore + workforceRiskScore + communityRiskScore +
      managementRiskScore + complianceRiskScore + corruptionRiskScore
    ) / 9;
    
    // リスクレベル決定
    const riskLevel = ESGHelpers.determineRiskLevel(totalRiskScore);
    
    const riskAssessment: ESGRiskAssessment = {
      symbol,
      assessmentDate: new Date(),
      climateRiskScore,
      regulatoryRiskScore,
      resourceScarcityRisk,
      reputationRiskScore,
      workforceRiskScore,
      communityRiskScore,
      managementRiskScore,
      complianceRiskScore,
      corruptionRiskScore,
      totalRiskScore,
      riskLevel,
      riskFactors: JSON.stringify(ESGHelpers.identifyRiskFactors({
        carbonIntensity: esgData.carbonIntensity,
        renewableEnergyRatio: esgData.renewableEnergyRatio,
        employeeSatisfaction: esgData.employeeSatisfaction,
        diversityScore: esgData.diversityScore,
        safetyIncidents: esgData.safetyIncidents,
        boardIndependence: esgData.boardIndependence,
        transparencyScore: esgData.transparencyScore
      })),
      mitigationStrategies: ESGHelpers.generateMitigationStrategies(riskLevel)
    };
    
    // リスクアセスメントを保存
    await this.saveRiskAssessment(riskAssessment);
    
    return riskAssessment;
  }
  
  // リスク計算メソッド群
  private calculateClimateRisk(data: ESGData): number {
    const carbonIntensity = data.carbonIntensity || 50;
    const renewableRatio = data.renewableEnergyRatio || 0;
    return Math.min(100, carbonIntensity + (100 - renewableRatio));
  }
  
  private calculateRegulatoryRisk(data: ESGData): number {
    const complianceScore = data.riskManagementScore || 50;
    return 100 - complianceScore;
  }
  
  private calculateResourceScarcityRisk(data: ESGData): number {
    const waterUsage = data.waterUsage || 50;
    const energyConsumption = data.energyConsumption || 50;
    return (waterUsage + energyConsumption) / 2;
  }
  
  private calculateReputationRisk(data: ESGData): number {
    const socialScore = data.socialScore || 50;
    return 100 - socialScore;
  }
  
  private calculateWorkforceRisk(data: ESGData): number {
    const employeeSatisfaction = data.employeeSatisfaction || 50;
    const diversityScore = data.diversityScore || 50;
    const safetyRisk = (data.safetyIncidents || 0) * 10;
    return Math.min(100, (100 - employeeSatisfaction) + (100 - diversityScore) + safetyRisk) / 3;
  }
  
  private calculateCommunityRisk(data: ESGData): number {
    const humanRightsScore = data.humanRightsScore || 50;
    const communityInvestment = data.communityInvestment || 50;
    return (100 - humanRightsScore + 100 - communityInvestment) / 2;
  }
  
  private calculateManagementRisk(data: ESGData): number {
    const governanceScore = data.governanceScore || 50;
    const boardIndependence = data.boardIndependence || 50;
    return (100 - governanceScore + 100 - boardIndependence) / 2;
  }
  
  private calculateComplianceRisk(data: ESGData): number {
    const auditQuality = data.auditQualityScore || 50;
    const transparency = data.transparencyScore || 50;
    return (100 - auditQuality + 100 - transparency) / 2;
  }
  
  private calculateCorruptionRisk(data: ESGData): number {
    const transparencyScore = data.transparencyScore || 50;
    const riskManagement = data.riskManagementScore || 50;
    return (100 - transparencyScore + 100 - riskManagement) / 2;
  }
  
  
  /**
   * リスクアセスメントの保存
   */
  async saveRiskAssessment(assessment: ESGRiskAssessment): Promise<number> {
    const sql = `
      INSERT INTO esg_risk_assessments (
        symbol, assessment_date, climate_risk_score, regulatory_risk_score,
        resource_scarcity_risk, reputation_risk_score, workforce_risk_score,
        community_risk_score, management_risk_score, compliance_risk_score,
        corruption_risk_score, total_risk_score, risk_level, risk_factors,
        mitigation_strategies
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    
    const result = await db.run(sql, [
      assessment.symbol,
      assessment.assessmentDate.toISOString().split('T')[0],
      assessment.climateRiskScore,
      assessment.regulatoryRiskScore,
      assessment.resourceScarcityRisk,
      assessment.reputationRiskScore,
      assessment.workforceRiskScore,
      assessment.communityRiskScore,
      assessment.managementRiskScore,
      assessment.complianceRiskScore,
      assessment.corruptionRiskScore,
      assessment.totalRiskScore,
      assessment.riskLevel,
      assessment.riskFactors,
      assessment.mitigationStrategies
    ]);
    
    return result.lastID;
  }
  
  /**
   * 業界ベンチマークとの比較
   */
  async compareWithIndustryBenchmark(symbol: string, industryCode: string): Promise<any> {
    const esgData = await this.getESGData(symbol);
    const benchmark = await this.getIndustryBenchmark(industryCode);
    
    if (!esgData || !benchmark) {
      throw new Error('ESGデータまたは業界ベンチマークが見つかりません');
    }
    
    return {
      symbol,
      industryCode,
      comparison: {
        environmental: {
          companyScore: esgData.environmentalScore || 0,
          industryAverage: benchmark.avgEnvironmentalScore,
          percentileRank: ESGHelpers.calculatePercentileRank(
            esgData.environmentalScore || 0, 
            benchmark.avgEnvironmentalScore
          )
        },
        social: {
          companyScore: esgData.socialScore || 0,
          industryAverage: benchmark.avgSocialScore,
          percentileRank: ESGHelpers.calculatePercentileRank(
            esgData.socialScore || 0, 
            benchmark.avgSocialScore
          )
        },
        governance: {
          companyScore: esgData.governanceScore || 0,
          industryAverage: benchmark.avgGovernanceScore,
          percentileRank: ESGHelpers.calculatePercentileRank(
            esgData.governanceScore || 0, 
            benchmark.avgGovernanceScore
          )
        },
        total: {
          companyScore: esgData.totalESGScore || 0,
          industryAverage: benchmark.avgTotalScore,
          percentileRank: ESGHelpers.calculatePercentileRank(
            esgData.totalESGScore || 0, 
            benchmark.avgTotalScore
          )
        }
      }
    };
  }
  
  
  /**
   * 業界ベンチマークの取得
   */
  async getIndustryBenchmark(industryCode: string, year?: number): Promise<IndustryBenchmark | null> {
    let sql = `
      SELECT * FROM esg_industry_benchmarks 
      WHERE industry_code = ?
    `;
    const params: any[] = [industryCode];
    
    if (year) {
      sql += ` AND benchmark_year = ?`;
      params.push(year);
    } else {
      sql += ` ORDER BY benchmark_year DESC LIMIT 1`;
    }
    
    const row = await db.get(sql, params);
    
    if (!row) return null;
    
    return {
      industryCode: row.industry_code,
      industryName: row.industry_name,
      benchmarkYear: row.benchmark_year,
      avgEnvironmentalScore: row.avg_environmental_score,
      avgSocialScore: row.avg_social_score,
      avgGovernanceScore: row.avg_governance_score,
      avgTotalScore: row.avg_total_score,
      companyCount: row.company_count
    };
  }
  
  /**
   * データベース行をESGDataオブジェクトに変換
   */
  private mapRowToESGData(row: any): ESGData {
    return {
      id: row.id,
      symbol: row.symbol,
      companyName: row.company_name,
      reportYear: row.report_year,
      dataSource: row.data_source,
      environmentalScore: row.environmental_score,
      carbonEmissions: row.carbon_emissions,
      energyConsumption: row.energy_consumption,
      waterUsage: row.water_usage,
      wasteManagementScore: row.waste_management_score,
      renewableEnergyRatio: row.renewable_energy_ratio,
      carbonIntensity: row.carbon_intensity,
      socialScore: row.social_score,
      employeeSatisfaction: row.employee_satisfaction,
      diversityScore: row.diversity_score,
      safetyIncidents: row.safety_incidents,
      communityInvestment: row.community_investment,
      humanRightsScore: row.human_rights_score,
      laborPracticesScore: row.labor_practices_score,
      governanceScore: row.governance_score,
      boardIndependence: row.board_independence,
      executiveCompensationRatio: row.executive_compensation_ratio,
      transparencyScore: row.transparency_score,
      auditQualityScore: row.audit_quality_score,
      riskManagementScore: row.risk_management_score,
      totalESGScore: row.total_esg_score,
      esgGrade: row.esg_grade,
      esgRanking: row.esg_ranking,
      lastUpdated: row.last_updated ? new Date(row.last_updated) : undefined,
      createdAt: row.created_at ? new Date(row.created_at) : undefined
    };
  }
}

export const esgEvaluationService = new ESGEvaluationService();