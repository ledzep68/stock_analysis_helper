import { esgEvaluationService, ESGData } from '../esgEvaluationService';

// モックデータベース
jest.mock('../../config/database', () => ({
  db: {
    run: jest.fn(),
    get: jest.fn(),
    all: jest.fn()
  }
}));

import { db } from '../../config/database';

describe('ESGEvaluationService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('saveESGData', () => {
    it('should save ESG data successfully', async () => {
      const mockESGData: ESGData = {
        symbol: 'TEST',
        companyName: 'Test Company',
        reportYear: 2023,
        dataSource: 'MANUAL',
        environmentalScore: 85,
        socialScore: 78,
        governanceScore: 82,
        totalESGScore: 82,
        esgGrade: 'AA'
      };

      // getESGDataのモック（保存後の取得）
      (db.get as jest.Mock).mockResolvedValue({
        id: 1,
        symbol: 'TEST',
        company_name: 'Test Company',
        report_year: 2023,
        data_source: 'MANUAL',
        environmental_score: 85,
        social_score: 78,
        governance_score: 82,
        total_esg_score: 82,
        esg_grade: 'AA',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      });

      // saveのモック
      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });

      const result = await esgEvaluationService.saveESGData(mockESGData);

      expect(db.run).toHaveBeenCalledWith(
        expect.stringContaining('INSERT OR REPLACE INTO esg_data'),
        expect.arrayContaining([
          'TEST',
          'Test Company',
          2023,
          'MANUAL',
          85,
          undefined, // carbon_emissions
          undefined, // energy_consumption
          undefined, // water_usage
          undefined, // waste_management_score
          undefined, // renewable_energy_ratio
          undefined, // carbon_intensity
          78,
          undefined, // employee_satisfaction
          undefined, // diversity_score
          undefined, // safety_incidents
          undefined, // community_investment
          undefined, // human_rights_score
          undefined, // labor_practices_score
          82,
          undefined, // board_independence
          undefined, // executive_compensation_ratio
          undefined, // transparency_score
          undefined, // audit_quality_score
          undefined, // risk_management_score
          82,
          'AA',
          undefined, // esg_ranking
          expect.any(String) // timestamp
        ])
      );

      expect(result.symbol).toBe('TEST');
      expect(result.totalESGScore).toBe(82);
    });
  });

  describe('getESGData', () => {
    it('should retrieve ESG data by symbol', async () => {
      const mockRow = {
        id: 1,
        symbol: 'TEST',
        company_name: 'Test Company',
        report_year: 2023,
        data_source: 'MANUAL',
        environmental_score: 85,
        social_score: 78,
        governance_score: 82,
        total_esg_score: 82,
        esg_grade: 'AA',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      (db.get as jest.Mock).mockResolvedValue(mockRow);

      const result = await esgEvaluationService.getESGData('TEST', 2023);

      expect(db.get).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM esg_data'),
        ['TEST', 2023]
      );

      expect(result).toBeDefined();
      expect(result?.symbol).toBe('TEST');
      expect(result?.totalESGScore).toBe(82);
    });

    it('should return null when ESG data not found', async () => {
      (db.get as jest.Mock).mockResolvedValue(null);

      const result = await esgEvaluationService.getESGData('NONEXISTENT');

      expect(result).toBeNull();
    });
  });

  describe('calculateESGScore', () => {
    it('should calculate ESG score correctly', async () => {
      const mockESGData: Partial<ESGData> = {
        carbonIntensity: 30,
        renewableEnergyRatio: 70,
        wasteManagementScore: 80,
        energyConsumption: 40,
        employeeSatisfaction: 75,
        diversityScore: 65,
        humanRightsScore: 85,
        laborPracticesScore: 80,
        safetyIncidents: 2,
        boardIndependence: 75,
        transparencyScore: 85,
        auditQualityScore: 90,
        riskManagementScore: 80,
        executiveCompensationRatio: 15
      };

      // saveEvaluationのモック
      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });

      const result = await esgEvaluationService.calculateESGScore('TEST', mockESGData);

      expect(result.symbol).toBe('TEST');
      expect(result.environmentalScore).toBeGreaterThan(0);
      expect(result.socialScore).toBeGreaterThan(0);
      expect(result.governanceScore).toBeGreaterThan(0);
      expect(result.totalScore).toBeGreaterThan(0);
      expect(result.grade).toMatch(/^(AAA|AA|A|BBB|BB|B|CCC)$/);
      expect(result.evaluationNotes).toBeDefined();
    });

    it('should assign correct grades based on total score', async () => {
      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });

      // 高スコアデータ
      const highScoreData: Partial<ESGData> = {
        renewableEnergyRatio: 95,
        wasteManagementScore: 95,
        employeeSatisfaction: 95,
        diversityScore: 95,
        humanRightsScore: 95,
        laborPracticesScore: 95,
        boardIndependence: 95,
        transparencyScore: 95,
        auditQualityScore: 95,
        riskManagementScore: 95
      };

      const result = await esgEvaluationService.calculateESGScore('TEST', highScoreData);
      
      expect(result.totalScore).toBeGreaterThan(80);
      expect(['AAA', 'AA', 'A']).toContain(result.grade);
    });
  });

  describe('performRiskAssessment', () => {
    it('should perform risk assessment correctly', async () => {
      const mockESGData: ESGData = {
        symbol: 'TEST',
        reportYear: 2023,
        dataSource: 'MANUAL',
        carbonIntensity: 30,
        renewableEnergyRatio: 70,
        employeeSatisfaction: 75,
        diversityScore: 65,
        safetyIncidents: 2,
        humanRightsScore: 85,
        riskManagementScore: 80,
        auditQualityScore: 90,
        transparencyScore: 85,
        governanceScore: 82
      };

      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });

      const result = await esgEvaluationService.performRiskAssessment('TEST', mockESGData);

      expect(result.symbol).toBe('TEST');
      expect(result.totalRiskScore).toBeGreaterThanOrEqual(0);
      expect(result.totalRiskScore).toBeLessThanOrEqual(100);
      expect(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).toContain(result.riskLevel);
      expect(result.riskFactors).toBeDefined();
      expect(result.mitigationStrategies).toBeDefined();
    });

    it('should assign correct risk levels based on risk score', async () => {
      (db.run as jest.Mock).mockResolvedValue({ lastID: 1 });

      // 低リスクデータ
      const lowRiskData: ESGData = {
        symbol: 'TEST',
        reportYear: 2023,
        dataSource: 'MANUAL',
        carbonIntensity: 10, // 低い炭素集約度
        renewableEnergyRatio: 90, // 高い再生可能エネルギー比率
        employeeSatisfaction: 90,
        diversityScore: 85,
        safetyIncidents: 0,
        humanRightsScore: 95,
        riskManagementScore: 95,
        auditQualityScore: 95,
        transparencyScore: 95,
        governanceScore: 95,
        boardIndependence: 90
      };

      const result = await esgEvaluationService.performRiskAssessment('TEST', lowRiskData);
      
      expect(['LOW', 'MEDIUM']).toContain(result.riskLevel);
      expect(result.totalRiskScore).toBeLessThan(60);
    });
  });

  describe('compareWithIndustryBenchmark', () => {
    it('should compare with industry benchmark correctly', async () => {
      // ESGデータのモック（mapRowToESGDataの結果を模擬）
      const mockESGRow = {
        id: 1,
        symbol: 'TEST',
        environmental_score: 85,
        social_score: 78,
        governance_score: 82,
        total_esg_score: 82,
        company_name: 'Test Company',
        report_year: 2023,
        data_source: 'MANUAL',
        created_at: new Date().toISOString(),
        last_updated: new Date().toISOString()
      };

      // 業界ベンチマークのモック
      const mockBenchmark = {
        industry_code: 'TECH',
        industry_name: 'テクノロジー',
        benchmark_year: 2023,
        avg_environmental_score: 80,
        avg_social_score: 75,
        avg_governance_score: 80,
        avg_total_score: 78,
        company_count: 40
      };

      (db.get as jest.Mock)
        .mockResolvedValueOnce(mockESGRow) // getESGData
        .mockResolvedValueOnce(mockBenchmark); // getIndustryBenchmark

      const result = await esgEvaluationService.compareWithIndustryBenchmark('TEST', 'TECH');

      expect(result.symbol).toBe('TEST');
      expect(result.industryCode).toBe('TECH');
      expect(result.comparison.environmental.companyScore).toBe(85);
      expect(result.comparison.environmental.industryAverage).toBe(80);
      expect(result.comparison.environmental.percentileRank).toBeGreaterThanOrEqual(50);
    });

    it('should throw error when data not found', async () => {
      (db.get as jest.Mock).mockResolvedValue(null);

      await expect(
        esgEvaluationService.compareWithIndustryBenchmark('NONEXISTENT', 'TECH')
      ).rejects.toThrow('ESGデータまたは業界ベンチマークが見つかりません');
    });
  });

  describe('getESGDataHistory', () => {
    it('should retrieve ESG data history', async () => {
      const mockRows = [
        {
          id: 1,
          symbol: 'TEST',
          report_year: 2023,
          total_esg_score: 82,
          esg_grade: 'AA'
        },
        {
          id: 2,
          symbol: 'TEST',
          report_year: 2022,
          total_esg_score: 78,
          esg_grade: 'A'
        }
      ];

      (db.all as jest.Mock).mockResolvedValue(mockRows);

      const result = await esgEvaluationService.getESGDataHistory('TEST', 3);

      expect(db.all).toHaveBeenCalledWith(
        expect.stringContaining('SELECT * FROM esg_data'),
        ['TEST', 3]
      );

      expect(result).toHaveLength(2);
      expect(result[0].reportYear).toBe(2023);
      expect(result[1].reportYear).toBe(2022);
    });
  });

  describe('getIndustryBenchmark', () => {
    it('should retrieve industry benchmark', async () => {
      const mockBenchmark = {
        industry_code: 'TECH',
        industry_name: 'テクノロジー',
        benchmark_year: 2023,
        avg_environmental_score: 80,
        avg_social_score: 75,
        avg_governance_score: 80,
        avg_total_score: 78,
        company_count: 40
      };

      (db.get as jest.Mock).mockResolvedValue(mockBenchmark);

      const result = await esgEvaluationService.getIndustryBenchmark('TECH', 2023);

      expect(result).toBeDefined();
      expect(result?.industryCode).toBe('TECH');
      expect(result?.avgTotalScore).toBe(78);
    });

    it('should return null when benchmark not found', async () => {
      (db.get as jest.Mock).mockResolvedValue(null);

      const result = await esgEvaluationService.getIndustryBenchmark('NONEXISTENT');

      expect(result).toBeNull();
    });
  });
});