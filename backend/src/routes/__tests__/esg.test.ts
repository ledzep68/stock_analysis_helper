import request from 'supertest';
import express from 'express';
import esgRouter from '../esg';

// モックサービス
jest.mock('../../services/esgEvaluationService');
import { esgEvaluationService } from '../../services/esgEvaluationService';

// モック認証ミドルウェア
jest.mock('../../middleware/auth', () => ({
  authenticateToken: (req: any, res: any, next: any) => {
    req.user = { id: 'test-user', email: 'test@example.com' };
    next();
  }
}));

const app = express();
app.use(express.json());
app.use('/api/esg', esgRouter);

describe('ESG Routes', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('GET /api/esg/:symbol', () => {
    it('should get ESG data successfully', async () => {
      const mockESGData = {
        id: 1,
        symbol: 'TEST',
        companyName: 'Test Company',
        reportYear: 2023,
        environmentalScore: 85,
        socialScore: 78,
        governanceScore: 82,
        totalESGScore: 82,
        esgGrade: 'AA'
      };

      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(mockESGData);

      const response = await request(app)
        .get('/api/esg/TEST')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TEST');
      expect(response.body.data.totalESGScore).toBe(82);
    });

    it('should return 404 when ESG data not found', async () => {
      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/esg/NONEXISTENT')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ESGデータが見つかりません');
    });

    it('should handle query parameters', async () => {
      const mockESGData = {
        symbol: 'TEST',
        reportYear: 2022
      };

      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(mockESGData);

      await request(app)
        .get('/api/esg/TEST?year=2022')
        .expect(200);

      expect(esgEvaluationService.getESGData).toHaveBeenCalledWith('TEST', 2022);
    });
  });

  describe('GET /api/esg/:symbol/history', () => {
    it('should get ESG data history successfully', async () => {
      const mockHistory = [
        { symbol: 'TEST', reportYear: 2023, totalESGScore: 82 },
        { symbol: 'TEST', reportYear: 2022, totalESGScore: 78 }
      ];

      (esgEvaluationService.getESGDataHistory as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/esg/TEST/history')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TEST');
      expect(response.body.data.history).toHaveLength(2);
    });

    it('should handle years query parameter', async () => {
      (esgEvaluationService.getESGDataHistory as jest.Mock).mockResolvedValue([]);

      await request(app)
        .get('/api/esg/TEST/history?years=5')
        .expect(200);

      expect(esgEvaluationService.getESGDataHistory).toHaveBeenCalledWith('TEST', 5);
    });
  });

  describe('POST /api/esg/:symbol', () => {
    it('should save ESG data successfully', async () => {
      const mockESGData = {
        symbol: 'TEST',
        reportYear: 2023,
        dataSource: 'MANUAL',
        environmentalScore: 85
      };

      const savedData = { ...mockESGData, id: 1 };

      (esgEvaluationService.saveESGData as jest.Mock).mockResolvedValue(savedData);

      const response = await request(app)
        .post('/api/esg/TEST')
        .send({
          reportYear: 2023,
          dataSource: 'MANUAL',
          environmentalScore: 85
        })
        .expect(201);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TEST');
      expect(response.body.message).toBe('ESGデータが正常に保存されました');
    });

    it('should return 400 for missing required fields', async () => {
      const response = await request(app)
        .post('/api/esg/TEST')
        .send({
          environmentalScore: 85
          // missing reportYear and dataSource
        })
        .expect(400);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('reportYear と dataSource は必須です');
    });
  });

  describe('POST /api/esg/:symbol/evaluate', () => {
    it('should calculate ESG score successfully', async () => {
      const mockEvaluation = {
        symbol: 'TEST',
        evaluationDate: new Date(),
        environmentalScore: 85,
        socialScore: 78,
        governanceScore: 82,
        totalScore: 82,
        grade: 'AA'
      };

      (esgEvaluationService.calculateESGScore as jest.Mock).mockResolvedValue(mockEvaluation);

      const response = await request(app)
        .post('/api/esg/TEST/evaluate')
        .send({
          environmentalScore: 85,
          socialScore: 78,
          governanceScore: 82
        })
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.grade).toBe('AA');
      expect(response.body.message).toBe('ESG評価が正常に計算されました');
    });
  });

  describe('POST /api/esg/:symbol/risk-assessment', () => {
    it('should perform risk assessment successfully', async () => {
      const mockESGData = {
        symbol: 'TEST',
        environmentalScore: 85,
        socialScore: 78
      };

      const mockRiskAssessment = {
        symbol: 'TEST',
        totalRiskScore: 25,
        riskLevel: 'LOW' as const,
        climateRiskScore: 20,
        regulatoryRiskScore: 15,
        resourceScarcityRisk: 30,
        reputationRiskScore: 22,
        workforceRiskScore: 25,
        communityRiskScore: 15,
        managementRiskScore: 18,
        complianceRiskScore: 25,
        corruptionRiskScore: 15
      };

      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(mockESGData);
      (esgEvaluationService.performRiskAssessment as jest.Mock).mockResolvedValue(mockRiskAssessment);

      const response = await request(app)
        .post('/api/esg/TEST/risk-assessment')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.riskLevel).toBe('LOW');
      expect(response.body.message).toBe('ESGリスクアセスメントが正常に完了しました');
    });

    it('should return 404 when ESG data not found for risk assessment', async () => {
      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .post('/api/esg/TEST/risk-assessment')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ESGデータが見つかりません。まずESGデータを登録してください。');
    });
  });

  describe('GET /api/esg/:symbol/benchmark/:industryCode', () => {
    it('should compare with industry benchmark successfully', async () => {
      const mockComparison = {
        symbol: 'TEST',
        industryCode: 'TECH',
        comparison: {
          environmental: {
            companyScore: 85,
            industryAverage: 80,
            percentileRank: 75
          },
          total: {
            companyScore: 82,
            industryAverage: 78,
            percentileRank: 75
          }
        }
      };

      (esgEvaluationService.compareWithIndustryBenchmark as jest.Mock).mockResolvedValue(mockComparison);

      const response = await request(app)
        .get('/api/esg/TEST/benchmark/TECH')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.industryCode).toBe('TECH');
      expect(response.body.message).toBe('業界ベンチマークとの比較が正常に完了しました');
    });

    it('should handle comparison errors', async () => {
      (esgEvaluationService.compareWithIndustryBenchmark as jest.Mock)
        .mockRejectedValue(new Error('ESGデータまたは業界ベンチマークが見つかりません'));

      const response = await request(app)
        .get('/api/esg/TEST/benchmark/NONEXISTENT')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ESGデータまたは業界ベンチマークが見つかりません');
    });
  });

  describe('GET /api/esg/:symbol/trend', () => {
    it('should get ESG trend analysis successfully', async () => {
      const mockHistory = [
        { reportYear: 2023, environmentalScore: 85, socialScore: 78, governanceScore: 82, totalESGScore: 82, esgGrade: 'AA' },
        { reportYear: 2022, environmentalScore: 80, socialScore: 75, governanceScore: 80, totalESGScore: 78, esgGrade: 'A' },
        { reportYear: 2021, environmentalScore: 75, socialScore: 70, governanceScore: 75, totalESGScore: 73, esgGrade: 'A' }
      ];

      (esgEvaluationService.getESGDataHistory as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/esg/TEST/trend')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TEST');
      expect(response.body.data.trend).toHaveLength(3);
      expect(response.body.data.improvement.total).toBeGreaterThan(0); // 改善傾向
      expect(response.body.data.analysis.overallTrend).toBeDefined();
    });

    it('should return 404 when no history data found', async () => {
      (esgEvaluationService.getESGDataHistory as jest.Mock).mockResolvedValue([]);

      const response = await request(app)
        .get('/api/esg/TEST/trend')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ESG履歴データが見つかりません');
    });
  });

  describe('GET /api/esg/benchmarks/:industryCode', () => {
    it('should get industry benchmark successfully', async () => {
      const mockBenchmark = {
        industryCode: 'TECH',
        industryName: 'テクノロジー',
        benchmarkYear: 2023,
        avgEnvironmentalScore: 80,
        avgSocialScore: 75,
        avgGovernanceScore: 80,
        avgTotalScore: 78,
        companyCount: 40
      };

      (esgEvaluationService.getIndustryBenchmark as jest.Mock).mockResolvedValue(mockBenchmark);

      const response = await request(app)
        .get('/api/esg/benchmarks/TECH')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.industryCode).toBe('TECH');
    });

    it('should return 404 when benchmark not found', async () => {
      (esgEvaluationService.getIndustryBenchmark as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/esg/benchmarks/NONEXISTENT')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('指定された業界のベンチマークデータが見つかりません');
    });
  });

  describe('GET /api/esg/:symbol/dashboard', () => {
    it('should get ESG dashboard data successfully', async () => {
      const mockESGData = {
        symbol: 'TEST',
        companyName: 'Test Company',
        environmentalScore: 85,
        lastUpdated: new Date().toISOString()
      };

      const mockEvaluation = {
        symbol: 'TEST',
        environmentalScore: 85,
        socialScore: 78,
        governanceScore: 82,
        totalScore: 82,
        grade: 'AA',
        improvementRecommendations: 'Continue improving environmental practices'
      };

      const mockRiskAssessment = {
        totalRiskScore: 25,
        riskLevel: 'LOW' as const,
        riskFactors: '[]',
        mitigationStrategies: 'Continue current practices'
      };

      const mockHistory = [
        { reportYear: 2023, totalESGScore: 82, esgGrade: 'AA' }
      ];

      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(mockESGData);
      (esgEvaluationService.calculateESGScore as jest.Mock).mockResolvedValue(mockEvaluation);
      (esgEvaluationService.performRiskAssessment as jest.Mock).mockResolvedValue(mockRiskAssessment);
      (esgEvaluationService.getESGDataHistory as jest.Mock).mockResolvedValue(mockHistory);

      const response = await request(app)
        .get('/api/esg/TEST/dashboard')
        .expect(200);

      expect(response.body.success).toBe(true);
      expect(response.body.data.symbol).toBe('TEST');
      expect(response.body.data.currentScores).toBeDefined();
      expect(response.body.data.riskAssessment).toBeDefined();
      expect(response.body.data.trend).toBeDefined();
      expect(response.body.data.keyMetrics).toBeDefined();
      expect(response.body.data.recommendations).toBeDefined();
    });

    it('should return 404 when ESG data not found for dashboard', async () => {
      (esgEvaluationService.getESGData as jest.Mock).mockResolvedValue(null);

      const response = await request(app)
        .get('/api/esg/TEST/dashboard')
        .expect(404);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ESGデータが見つかりません');
    });
  });

  describe('Error handling', () => {
    it('should handle service errors gracefully', async () => {
      (esgEvaluationService.getESGData as jest.Mock).mockRejectedValue(new Error('Database error'));

      const response = await request(app)
        .get('/api/esg/TEST')
        .expect(500);

      expect(response.body.success).toBe(false);
      expect(response.body.error).toBe('ESGデータの取得に失敗しました');
    });
  });
});