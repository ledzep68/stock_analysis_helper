import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { financialAnalysisService } from '../services/financialAnalysisService';
import { validateSymbol, createSecureApiResponse } from '../utils/security';

const router = express.Router();

// Rate limiting for analysis endpoints (more restrictive due to computational intensity)
const analysisLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 30, // 30 analysis requests per 15 minutes per IP
  message: createSecureApiResponse(false, undefined, 'Too many analysis requests, please try again later'),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(analysisLimiter);

/**
 * GET /api/analysis/:symbol/detailed
 * Get detailed financial analysis for a company
 */
router.get('/:symbol/detailed', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const detailedData = await financialAnalysisService.getDetailedFinancialData(validSymbol);
    
    if (!detailedData) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Financial data not found for this symbol'));
    }

    // Add disclaimer for legal compliance
    const responseData = {
      ...detailedData,
      disclaimer: '本情報は投資の参考資料であり、投資助言ではありません。最終的な投資判断はご自身の責任でお願いいたします。',
      dataSource: 'Yahoo Finance API',
      lastUpdated: detailedData.lastUpdated,
      calculationNote: '一部の指標は利用可能なデータから推定値を算出しています'
    };

    res.json(createSecureApiResponse(true, responseData));
    
  } catch (error) {
    console.error('Detailed analysis error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve detailed financial analysis'));
  }
});

/**
 * GET /api/analysis/:symbol/ratios
 * Get comprehensive financial ratio analysis
 */
router.get('/:symbol/ratios', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const ratioAnalysis = await financialAnalysisService.performRatioAnalysis(validSymbol);
    
    if (!ratioAnalysis) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Unable to perform ratio analysis for this symbol'));
    }

    // Add legal compliance disclaimer
    const responseData = {
      ...ratioAnalysis,
      disclaimer: '本分析は投資の参考資料であり、投資助言ではありません。最終的な投資判断はご自身の責任でお願いいたします。',
      methodology: 'Industry standard financial ratio analysis using benchmark comparisons',
      limitations: [
        '分析は過去のデータに基づいており、将来の結果を保証するものではありません',
        '業界ベンチマークは一般的な数値を使用しており、個別企業の状況を完全に反映していない場合があります',
        '一部の財務データは推定値を含む場合があります'
      ],
      lastCalculated: new Date().toISOString()
    };

    res.json(createSecureApiResponse(true, responseData));
    
  } catch (error) {
    console.error('Ratio analysis error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to perform ratio analysis'));
  }
});

/**
 * GET /api/analysis/:symbol/dcf
 * Get Discounted Cash Flow (DCF) valuation analysis
 */
router.get('/:symbol/dcf', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const dcfAnalysis = await financialAnalysisService.performDCFAnalysis(validSymbol);
    
    if (!dcfAnalysis) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Unable to perform DCF analysis for this symbol'));
    }

    // Add comprehensive disclaimers for DCF analysis
    const responseData = {
      ...dcfAnalysis,
      disclaimer: '本DCF分析は投資の参考資料であり、投資助言ではありません。最終的な投資判断はご自身の責任でお願いいたします。',
      methodology: 'Discounted Cash Flow (DCF) valuation model using projected free cash flows',
      assumptions: {
        ...dcfAnalysis.assumptions,
        note: '前提条件は市場平均と企業の過去実績に基づく推定値です'
      },
      riskFactors: [
        '将来の業績予測には不確実性が伴います',
        '市場環境の変化により前提条件が変わる可能性があります',
        '競合他社の動向や規制変更等の外部要因の影響を受ける可能性があります',
        'DCFモデルは理論的な評価手法であり、実際の市場価格とは乖離する場合があります'
      ],
      calculationDate: new Date().toISOString(),
      modelVersion: '1.0',
      confidenceNote: `信頼度「${dcfAnalysis.confidenceLevel}」は利用可能データの質と企業の財務安定性に基づいて算出`
    };

    res.json(createSecureApiResponse(true, responseData));
    
  } catch (error) {
    console.error('DCF analysis error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to perform DCF analysis'));
  }
});

/**
 * GET /api/analysis/:symbol/summary
 * Get comprehensive investment analysis summary
 */
router.get('/:symbol/summary', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    // Get all analysis data
    const [detailedData, ratioAnalysis, dcfAnalysis] = await Promise.all([
      financialAnalysisService.getDetailedFinancialData(validSymbol),
      financialAnalysisService.performRatioAnalysis(validSymbol),
      financialAnalysisService.performDCFAnalysis(validSymbol)
    ]);

    if (!detailedData || !ratioAnalysis || !dcfAnalysis) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Insufficient data for comprehensive analysis'));
    }

    // Create investment summary
    const investmentSummary = {
      symbol: validSymbol,
      companyName: detailedData.companyName,
      currentPrice: detailedData.currentPrice,
      analysis: {
        financial: {
          overallScore: ratioAnalysis.overallScore,
          overallRating: ratioAnalysis.overallRating,
          strengths: ratioAnalysis.strengths,
          weaknesses: ratioAnalysis.weaknesses,
          keyMetrics: {
            peRatio: detailedData.peRatio,
            pbRatio: detailedData.pbRatio,
            roe: detailedData.roe,
            debtToEquity: detailedData.debtToEquity,
            dividendYield: detailedData.dividendYield
          }
        },
        valuation: {
          currentPrice: dcfAnalysis.currentPrice,
          estimatedFairValue: dcfAnalysis.estimatedFairValue,
          upside: dcfAnalysis.upside,
          marginOfSafety: dcfAnalysis.marginOfSafety,
          confidenceLevel: dcfAnalysis.confidenceLevel,
          scenarios: dcfAnalysis.scenario
        },
        recommendation: {
          overall: ratioAnalysis.overallRating,
          reasoning: ratioAnalysis.recommendations,
          riskLevel: dcfAnalysis.confidenceLevel === 'High' ? 'Low' : 
                    dcfAnalysis.confidenceLevel === 'Medium' ? 'Medium' : 'High',
          timeHorizon: '中長期（1年以上）での保有を前提とした分析',
          nextSteps: [
            '最新の決算発表内容を確認',
            '業界動向と競合他社の分析',
            '投資目的と自身のリスク許容度を考慮',
            '分散投資の観点から投資比率を決定'
          ]
        }
      },
      disclaimer: '本分析結果は投資の参考資料であり、投資助言ではありません。投資に関する最終的な判断はご自身の責任で行ってください。',
      lastUpdated: new Date().toISOString(),
      dataQuality: {
        financialData: detailedData.lastUpdated ? 'Recent' : 'Limited',
        marketData: 'Real-time',
        analysisAccuracy: 'Estimated based on available data'
      }
    };

    res.json(createSecureApiResponse(true, investmentSummary));
    
  } catch (error) {
    console.error('Investment summary error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to generate investment summary'));
  }
});

export default router;