import express, { Request, Response } from 'express';
import rateLimit from 'express-rate-limit';
import { industryComparisonService } from '../services/industryComparisonService';
import { validateSymbol, createSecureApiResponse } from '../utils/security';

const router = express.Router();

// Rate limiting for industry comparison endpoints
const industryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 industry comparison requests per 15 minutes per IP
  message: createSecureApiResponse(false, undefined, 'Too many industry comparison requests, please try again later'),
  standardHeaders: true,
  legacyHeaders: false,
});

router.use(industryLimiter);

/**
 * GET /api/industry/:symbol/comparison
 * Get comprehensive industry comparison analysis
 */
router.get('/:symbol/comparison', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const comparisonData = await industryComparisonService.performIndustryComparison(validSymbol);
    
    if (!comparisonData) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Company not found or insufficient industry data'));
    }

    // Add comprehensive disclaimers and legal compliance
    const responseData = {
      ...comparisonData,
      disclaimer: '本業界比較分析は投資の参考資料であり、投資助言ではありません。最終的な投資判断はご自身の責任でお願いいたします。',
      methodology: {
        description: '業界内および業界間の相対評価による比較分析',
        dataSource: '各企業の公開財務データおよび市場データ',
        benchmarkCalculation: '業界平均値および中央値を基準とした相対評価',
        rankingMethod: '主要財務指標の偏差値による総合ランキング',
        competitorSelection: '同業界内の時価総額上位企業を対象'
      },
      limitations: [
        '業界分類は一般的な基準に基づいており、事業の多角化度合いを完全に反映しない場合があります',
        '一部の財務データは推定値を含んでいます',
        '過去データに基づく分析であり、将来の業績を保証するものではありません',
        '市場環境の急激な変化により相対的な位置づけが変動する可能性があります',
        '業界ベンチマークは定期的に更新されますが、最新の業界動向を即座に反映しない場合があります'
      ],
      riskWarnings: [
        '業界リーダーであっても市場環境の変化により業績が悪化するリスクがあります',
        '業界平均を下回る企業でも改善ポテンシャルにより投資機会となる場合があります',
        '同業他社との比較のみでは投資判断に十分ではありません',
        'マクロ経済や政策変更等の外部要因の影響を受ける可能性があります'
      ],
      investmentGuidance: [
        '業界比較は投資判断の一要素として活用してください',
        '個別企業の財務分析と併せて総合的に判断することが重要です',
        '投資前に最新の決算資料や業界レポートをご確認ください',
        '分散投資の観点から業界集中リスクにご注意ください',
        '長期的な視点での投資戦略立案をお勧めします'
      ],
      lastCalculated: new Date().toISOString(),
      nextUpdate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), // 24 hours later
      dataQuality: {
        industryData: comparisonData.industryBenchmarks.sampleSize >= 20 ? 'High' : 'Moderate',
        sectorData: comparisonData.sectorBenchmarks.sampleSize >= 50 ? 'High' : 'Moderate',
        competitorData: comparisonData.competitorAnalysis.length >= 3 ? 'Sufficient' : 'Limited',
        overallReliability: 'Estimated based on available market data'
      }
    };

    res.json(createSecureApiResponse(true, responseData));
    
  } catch (error) {
    console.error('Industry comparison error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to perform industry comparison analysis'));
  }
});

/**
 * GET /api/industry/:symbol/ranking
 * Get industry ranking data only
 */
router.get('/:symbol/ranking', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const comparisonData = await industryComparisonService.performIndustryComparison(validSymbol);
    
    if (!comparisonData) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Company not found or insufficient ranking data'));
    }

    const rankingData = {
      symbol: validSymbol,
      companyName: comparisonData.companyName,
      industry: comparisonData.industry,
      sector: comparisonData.sector,
      ranking: comparisonData.ranking,
      overallRating: comparisonData.comparison.overallRating,
      investmentRecommendation: comparisonData.comparison.investmentRecommendation,
      disclaimer: '本ランキング情報は投資の参考資料であり、投資助言ではありません。',
      lastUpdated: new Date().toISOString()
    };

    res.json(createSecureApiResponse(true, rankingData));
    
  } catch (error) {
    console.error('Industry ranking error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve industry ranking'));
  }
});

/**
 * GET /api/industry/:symbol/competitors
 * Get competitor analysis data
 */
router.get('/:symbol/competitors', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;
    const limit = Math.min(parseInt(req.query.limit as string) || 5, 10); // Max 10 competitors

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const comparisonData = await industryComparisonService.performIndustryComparison(validSymbol);
    
    if (!comparisonData) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Company not found or insufficient competitor data'));
    }

    const competitorData = {
      symbol: validSymbol,
      companyName: comparisonData.companyName,
      industry: comparisonData.industry,
      targetCompany: {
        symbol: validSymbol,
        name: comparisonData.companyName,
        marketCap: comparisonData.companyMetrics.marketCap,
        peRatio: comparisonData.companyMetrics.peRatio,
        roe: comparisonData.companyMetrics.roe,
        dividendYield: comparisonData.companyMetrics.dividendYield,
        netMargin: comparisonData.companyMetrics.netMargin,
        revenueGrowth: comparisonData.companyMetrics.revenueGrowth
      },
      competitors: comparisonData.competitorAnalysis.slice(0, limit),
      industryAverages: {
        marketCap: comparisonData.industryBenchmarks.metrics.avgMarketCap,
        peRatio: comparisonData.industryBenchmarks.metrics.avgPeRatio,
        roe: comparisonData.industryBenchmarks.metrics.avgRoe,
        dividendYield: comparisonData.industryBenchmarks.metrics.avgDividendYield,
        netMargin: comparisonData.industryBenchmarks.metrics.avgNetMargin,
        revenueGrowth: comparisonData.industryBenchmarks.metrics.avgRevenueGrowth
      },
      analysis: {
        competitivePosition: comparisonData.comparison.overallRating,
        strengths: comparisonData.comparison.strengthsVsIndustry,
        competitiveAdvantages: comparisonData.comparison.competitiveAdvantages,
        marketPositioning: `業界内での相対的な位置づけ: ${comparisonData.comparison.overallRating}`
      },
      disclaimer: '本競合分析は投資の参考資料であり、投資助言ではありません。',
      notes: [
        '競合企業の選定は時価総額および事業内容の類似性に基づいています',
        '市場シェアは推定値です',
        '競合状況は市場環境の変化により変動する可能性があります'
      ],
      lastUpdated: new Date().toISOString()
    };

    res.json(createSecureApiResponse(true, competitorData));
    
  } catch (error) {
    console.error('Competitor analysis error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve competitor analysis'));
  }
});

/**
 * GET /api/industry/:symbol/benchmarks
 * Get industry and sector benchmark data
 */
router.get('/:symbol/benchmarks', async (req: Request, res: Response) => {
  try {
    const { symbol } = req.params;

    if (!symbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Symbol parameter is required'));
    }

    const validSymbol = validateSymbol(symbol);
    if (!validSymbol) {
      return res.status(400).json(createSecureApiResponse(false, undefined, 'Invalid symbol format'));
    }

    const comparisonData = await industryComparisonService.performIndustryComparison(validSymbol);
    
    if (!comparisonData) {
      return res.status(404).json(createSecureApiResponse(false, undefined, 'Company not found or insufficient benchmark data'));
    }

    const benchmarkData = {
      symbol: validSymbol,
      companyName: comparisonData.companyName,
      industry: comparisonData.industry,
      sector: comparisonData.sector,
      companyMetrics: comparisonData.companyMetrics,
      industryBenchmarks: comparisonData.industryBenchmarks,
      sectorBenchmarks: comparisonData.sectorBenchmarks,
      percentiles: comparisonData.comparison.industryPercentile,
      interpretation: {
        percentileExplanation: 'パーセンタイルは業界内での相対位置を表します（90%以上：上位10%、75%以上：上位25%）',
        benchmarkExplanation: '業界ベンチマークは同業界企業の平均値および中央値です',
        usageGuidance: 'ベンチマークとの比較により企業の相対的な競争力を評価できます'
      },
      disclaimer: '本ベンチマークデータは投資の参考資料であり、投資助言ではありません。',
      lastUpdated: new Date().toISOString()
    };

    res.json(createSecureApiResponse(true, benchmarkData));
    
  } catch (error) {
    console.error('Benchmark data error:', error);
    res.status(500).json(createSecureApiResponse(false, undefined, 'Failed to retrieve benchmark data'));
  }
});

export default router;