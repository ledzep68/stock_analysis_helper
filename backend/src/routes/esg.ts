import express from 'express';
import { authenticateToken } from '../middleware/auth';
import { esgEvaluationService, ESGData } from '../services/esgEvaluationService';

const router = express.Router();

interface AuthenticatedRequest extends express.Request {
  user?: { id: string; email: string; };
}

/**
 * ESGデータの取得
 * GET /api/esg/:symbol
 */
router.get('/:symbol', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const { year } = req.query;
    
    const esgData = await esgEvaluationService.getESGData(
      symbol.toUpperCase(), 
      year ? parseInt(year as string) : undefined
    );
    
    if (!esgData) {
      return res.status(404).json({
        success: false,
        error: 'ESGデータが見つかりません'
      });
    }
    
    res.json({
      success: true,
      data: esgData
    });
  } catch (error) {
    console.error('ESGデータ取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESGデータの取得に失敗しました'
    });
  }
});

/**
 * ESGデータ履歴の取得
 * GET /api/esg/:symbol/history
 */
router.get('/:symbol/history', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const { years } = req.query;
    
    const history = await esgEvaluationService.getESGDataHistory(
      symbol.toUpperCase(), 
      years ? parseInt(years as string) : undefined
    );
    
    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        history
      }
    });
  } catch (error) {
    console.error('ESG履歴取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESG履歴の取得に失敗しました'
    });
  }
});

/**
 * ESGデータの保存・更新
 * POST /api/esg/:symbol
 */
router.post('/:symbol', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const esgData: ESGData = {
      ...req.body,
      symbol: symbol.toUpperCase()
    };
    
    // 必須フィールドの検証
    if (!esgData.reportYear || !esgData.dataSource) {
      return res.status(400).json({
        success: false,
        error: 'reportYear と dataSource は必須です'
      });
    }
    
    const savedData = await esgEvaluationService.saveESGData(esgData);
    
    res.status(201).json({
      success: true,
      data: savedData,
      message: 'ESGデータが正常に保存されました'
    });
  } catch (error) {
    console.error('ESGデータ保存エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESGデータの保存に失敗しました'
    });
  }
});

/**
 * ESG評価の計算
 * POST /api/esg/:symbol/evaluate
 */
router.post('/:symbol/evaluate', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const esgData = req.body as Partial<ESGData>;
    
    const evaluation = await esgEvaluationService.calculateESGScore(
      symbol.toUpperCase(), 
      esgData
    );
    
    res.json({
      success: true,
      data: evaluation,
      message: 'ESG評価が正常に計算されました'
    });
  } catch (error) {
    console.error('ESG評価計算エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESG評価の計算に失敗しました'
    });
  }
});

/**
 * ESGリスクアセスメント
 * POST /api/esg/:symbol/risk-assessment
 */
router.post('/:symbol/risk-assessment', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    
    // 最新のESGデータを取得
    const esgData = await esgEvaluationService.getESGData(symbol.toUpperCase());
    
    if (!esgData) {
      return res.status(404).json({
        success: false,
        error: 'ESGデータが見つかりません。まずESGデータを登録してください。'
      });
    }
    
    const riskAssessment = await esgEvaluationService.performRiskAssessment(
      symbol.toUpperCase(), 
      esgData
    );
    
    res.json({
      success: true,
      data: riskAssessment,
      message: 'ESGリスクアセスメントが正常に完了しました'
    });
  } catch (error) {
    console.error('ESGリスクアセスメントエラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESGリスクアセスメントに失敗しました'
    });
  }
});

/**
 * 業界ベンチマークとの比較
 * GET /api/esg/:symbol/benchmark/:industryCode
 */
router.get('/:symbol/benchmark/:industryCode', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol, industryCode } = req.params;
    
    const comparison = await esgEvaluationService.compareWithIndustryBenchmark(
      symbol.toUpperCase(), 
      industryCode.toUpperCase()
    );
    
    res.json({
      success: true,
      data: comparison,
      message: '業界ベンチマークとの比較が正常に完了しました'
    });
  } catch (error) {
    console.error('業界ベンチマーク比較エラー:', error);
    
    if (error instanceof Error && error.message.includes('見つかりません')) {
      return res.status(404).json({
        success: false,
        error: error.message
      });
    }
    
    res.status(500).json({
      success: false,
      error: '業界ベンチマークとの比較に失敗しました'
    });
  }
});

/**
 * ESGスコアトレンド分析
 * GET /api/esg/:symbol/trend
 */
router.get('/:symbol/trend', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    const { years = '5' } = req.query;
    
    const history = await esgEvaluationService.getESGDataHistory(
      symbol.toUpperCase(), 
      parseInt(years as string)
    );
    
    if (history.length === 0) {
      return res.status(404).json({
        success: false,
        error: 'ESG履歴データが見つかりません'
      });
    }
    
    // トレンド分析データの計算
    const trendData = history.map(data => ({
      year: data.reportYear,
      environmentalScore: data.environmentalScore || 0,
      socialScore: data.socialScore || 0,
      governanceScore: data.governanceScore || 0,
      totalScore: data.totalESGScore || 0,
      grade: data.esgGrade
    }));
    
    // 改善率の計算
    const calculateImprovement = (scores: number[]) => {
      if (scores.length < 2) return 0;
      const latest = scores[0];
      const oldest = scores[scores.length - 1];
      return oldest > 0 ? ((latest - oldest) / oldest) * 100 : 0;
    };
    
    const environmentalImprovement = calculateImprovement(
      trendData.map(d => d.environmentalScore)
    );
    const socialImprovement = calculateImprovement(
      trendData.map(d => d.socialScore)
    );
    const governanceImprovement = calculateImprovement(
      trendData.map(d => d.governanceScore)
    );
    const totalImprovement = calculateImprovement(
      trendData.map(d => d.totalScore)
    );
    
    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        trend: trendData,
        improvement: {
          environmental: Math.round(environmentalImprovement * 100) / 100,
          social: Math.round(socialImprovement * 100) / 100,
          governance: Math.round(governanceImprovement * 100) / 100,
          total: Math.round(totalImprovement * 100) / 100
        },
        analysis: {
          overallTrend: totalImprovement > 5 ? 'IMPROVING' : 
                       totalImprovement < -5 ? 'DECLINING' : 'STABLE',
          yearsAnalyzed: history.length,
          dataRange: {
            from: Math.min(...trendData.map(d => d.year)),
            to: Math.max(...trendData.map(d => d.year))
          }
        }
      }
    });
  } catch (error) {
    console.error('ESGトレンド分析エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESGトレンド分析に失敗しました'
    });
  }
});

/**
 * ESG業界ベンチマークの取得
 * GET /api/esg/benchmarks/:industryCode
 */
router.get('/benchmarks/:industryCode', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { industryCode } = req.params;
    const { year } = req.query;
    
    const benchmark = await esgEvaluationService.getIndustryBenchmark(
      industryCode.toUpperCase(),
      year ? parseInt(year as string) : undefined
    );
    
    if (!benchmark) {
      return res.status(404).json({
        success: false,
        error: '指定された業界のベンチマークデータが見つかりません'
      });
    }
    
    res.json({
      success: true,
      data: benchmark
    });
  } catch (error) {
    console.error('業界ベンチマーク取得エラー:', error);
    res.status(500).json({
      success: false,
      error: '業界ベンチマークの取得に失敗しました'
    });
  }
});

/**
 * ESGサマリーダッシュボード
 * GET /api/esg/:symbol/dashboard
 */
router.get('/:symbol/dashboard', authenticateToken, async (req: AuthenticatedRequest, res: express.Response) => {
  try {
    const { symbol } = req.params;
    
    // 最新のESGデータを取得
    const latestData = await esgEvaluationService.getESGData(symbol.toUpperCase());
    
    if (!latestData) {
      return res.status(404).json({
        success: false,
        error: 'ESGデータが見つかりません'
      });
    }
    
    // ESG評価を計算
    const evaluation = await esgEvaluationService.calculateESGScore(
      symbol.toUpperCase(), 
      latestData
    );
    
    // リスクアセスメントを実行
    const riskAssessment = await esgEvaluationService.performRiskAssessment(
      symbol.toUpperCase(), 
      latestData
    );
    
    // 履歴データを取得（過去3年分）
    const history = await esgEvaluationService.getESGDataHistory(symbol.toUpperCase(), 3);
    
    res.json({
      success: true,
      data: {
        symbol: symbol.toUpperCase(),
        companyName: latestData.companyName,
        lastUpdated: latestData.lastUpdated,
        
        // 現在のスコア
        currentScores: {
          environmental: evaluation.environmentalScore,
          social: evaluation.socialScore,
          governance: evaluation.governanceScore,
          total: evaluation.totalScore,
          grade: evaluation.grade
        },
        
        // リスク情報
        riskAssessment: {
          totalRiskScore: riskAssessment.totalRiskScore,
          riskLevel: riskAssessment.riskLevel,
          keyRisks: JSON.parse(riskAssessment.riskFactors || '[]'),
          mitigationStrategies: riskAssessment.mitigationStrategies
        },
        
        // トレンド（簡易版）
        trend: history.map(data => ({
          year: data.reportYear,
          totalScore: data.totalESGScore || 0,
          grade: data.esgGrade
        })),
        
        // キーメトリクス
        keyMetrics: {
          carbonIntensity: latestData.carbonIntensity,
          renewableEnergyRatio: latestData.renewableEnergyRatio,
          employeeSatisfaction: latestData.employeeSatisfaction,
          boardIndependence: latestData.boardIndependence,
          diversityScore: latestData.diversityScore
        },
        
        // 改善提案
        recommendations: evaluation.improvementRecommendations || 
          'ESGパフォーマンスの向上のため、定期的な評価と改善計画の実施を推奨します。'
      }
    });
  } catch (error) {
    console.error('ESGダッシュボード取得エラー:', error);
    res.status(500).json({
      success: false,
      error: 'ESGダッシュボードの取得に失敗しました'
    });
  }
});

export default router;