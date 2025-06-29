// ESG関連の型定義を集約

export interface ESGData {
  id?: number;
  symbol: string;
  companyName?: string;
  reportYear: number;
  dataSource: 'BLOOMBERG' | 'MSCI' | 'REFINITIV' | 'MANUAL';
  
  // 環境スコア
  environmentalScore?: number;
  carbonEmissions?: number;
  energyConsumption?: number;
  waterUsage?: number;
  wasteManagementScore?: number;
  renewableEnergyRatio?: number;
  carbonIntensity?: number;
  
  // 社会スコア
  socialScore?: number;
  employeeSatisfaction?: number;
  diversityScore?: number;
  safetyIncidents?: number;
  communityInvestment?: number;
  humanRightsScore?: number;
  laborPracticesScore?: number;
  
  // ガバナンススコア
  governanceScore?: number;
  boardIndependence?: number;
  executiveCompensationRatio?: number;
  transparencyScore?: number;
  auditQualityScore?: number;
  riskManagementScore?: number;
  
  // 総合スコア
  totalESGScore?: number;
  esgGrade?: ESGGrade;
  esgRanking?: number;
  
  lastUpdated?: Date;
  createdAt?: Date;
}

export type ESGGrade = 'AAA' | 'AA' | 'A' | 'BBB' | 'BB' | 'B' | 'CCC';

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';

export interface ESGEvaluation {
  id?: number;
  symbol: string;
  evaluationDate: Date;
  evaluator?: string;
  
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  totalScore: number;
  grade: ESGGrade;
  
  evaluationNotes?: string;
  keyStrengths?: string;
  keyConcerns?: string;
  improvementRecommendations?: string;
  
  createdAt?: Date;
}

export interface ESGRiskAssessment {
  id?: number;
  symbol: string;
  assessmentDate: Date;
  
  // 環境リスク
  climateRiskScore: number;
  regulatoryRiskScore: number;
  resourceScarcityRisk: number;
  
  // 社会リスク
  reputationRiskScore: number;
  workforceRiskScore: number;
  communityRiskScore: number;
  
  // ガバナンスリスク
  managementRiskScore: number;
  complianceRiskScore: number;
  corruptionRiskScore: number;
  
  totalRiskScore: number;
  riskLevel: RiskLevel;
  
  riskFactors?: string;
  mitigationStrategies?: string;
  
  createdAt?: Date;
}

export interface IndustryBenchmark {
  industryCode: string;
  industryName: string;
  benchmarkYear: number;
  avgEnvironmentalScore: number;
  avgSocialScore: number;
  avgGovernanceScore: number;
  avgTotalScore: number;
  companyCount: number;
}

export interface ESGScoreWeights {
  environmental: number;
  social: number;
  governance: number;
}

export interface ESGMetrics {
  carbonIntensity?: number;
  renewableEnergyRatio?: number;
  employeeSatisfaction?: number;
  boardIndependence?: number;
  diversityScore?: number;
  safetyIncidents?: number;
  transparencyScore?: number;
}

export interface ESGComparisonResult {
  symbol: string;
  industryCode: string;
  comparison: {
    environmental: {
      companyScore: number;
      industryAverage: number;
      percentileRank: number;
    };
    social: {
      companyScore: number;
      industryAverage: number;
      percentileRank: number;
    };
    governance: {
      companyScore: number;
      industryAverage: number;
      percentileRank: number;
    };
    total: {
      companyScore: number;
      industryAverage: number;
      percentileRank: number;
    };
  };
}

export interface ESGTrendData {
  year: number;
  environmentalScore: number;
  socialScore: number;
  governanceScore: number;
  totalScore: number;
  grade: ESGGrade;
}

export interface ESGDashboardData {
  symbol: string;
  companyName?: string;
  lastUpdated: string;
  currentScores: {
    environmental: number;
    social: number;
    governance: number;
    total: number;
    grade: ESGGrade;
  };
  riskAssessment: {
    totalRiskScore: number;
    riskLevel: RiskLevel;
    keyRisks: string[];
    mitigationStrategies: string;
  };
  trend: ESGTrendData[];
  keyMetrics: ESGMetrics;
  recommendations: string;
}