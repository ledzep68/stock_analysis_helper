/**
 * Enhanced Analysis Routes - High-Quality Financial Analysis
 * 高品質なデータによる財務分析API
 */

import { Router, Request, Response } from 'express';
import { enhancedFinancialService } from '../services/enhancedFinancialService';
import { authenticateToken } from '../middleware/auth';
import { validateInput, createSecureApiResponse } from '../utils/security';
import { apiLimitMiddleware, addLimitStatusToResponse } from '../middleware/apiLimitMiddleware';

const router = Router();

// 認証必須
router.use(authenticateToken);

/**
 * 高品質な財務分析の取得
 * GET /api/enhanced-analysis/:symbol/comprehensive
 */
router.get('/:symbol/comprehensive', 
  apiLimitMiddleware(),
  addLimitStatusToResponse,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      if (!validateInput.isValidSymbol(symbol)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid symbol format')
        );
      }
      
      const enhancedData = await enhancedFinancialService.getEnhancedFinancialData(symbol);
      
      res.json(createSecureApiResponse(true, enhancedData));
      
    } catch (error: any) {
      console.error('Enhanced comprehensive analysis error:', error);
      res.status(500).json(
        createSecureApiResponse(false, undefined, 'Failed to perform enhanced analysis')
      );
    }
  }
);

/**
 * 業界比較分析（高精度版）
 * GET /api/enhanced-analysis/:symbol/industry-comparison
 */
router.get('/:symbol/industry-comparison',
  apiLimitMiddleware(),
  addLimitStatusToResponse,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      if (!validateInput.isValidSymbol(symbol)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid symbol format')
        );
      }
      
      const enhancedData = await enhancedFinancialService.getEnhancedFinancialData(symbol);
      
      const industryComparison = {
        symbol: enhancedData.symbol,
        companyName: enhancedData.companyName,
        industry: enhancedData.industry,
        sector: enhancedData.sector,
        currentPrice: enhancedData.currentPrice,
        industryComparison: enhancedData.industryComparison,
        valuation: enhancedData.valuation,
        dataQuality: enhancedData.dataQuality,
        
        // 追加の比較分析
        competitivePosition: {
          industryRank: calculateIndustryRank(enhancedData),
          strengthsVsIndustry: identifyStrengths(enhancedData),
          weaknessesVsIndustry: identifyWeaknesses(enhancedData),
          competitiveAdvantages: identifyCompetitiveAdvantages(enhancedData)
        },
        
        investmentThesis: {
          bullCase: generateBullCase(enhancedData),
          bearCase: generateBearCase(enhancedData),
          keyRisks: identifyKeyRisks(enhancedData),
          catalysts: identifyCatalysts(enhancedData)
        }
      };
      
      res.json(createSecureApiResponse(true, industryComparison));
      
    } catch (error: any) {
      console.error('Enhanced industry comparison error:', error);
      res.status(500).json(
        createSecureApiResponse(false, undefined, 'Failed to perform industry comparison')
      );
    }
  }
);

/**
 * バリュエーション分析（高精度版）
 * GET /api/enhanced-analysis/:symbol/valuation
 */
router.get('/:symbol/valuation',
  apiLimitMiddleware(),
  addLimitStatusToResponse,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      if (!validateInput.isValidSymbol(symbol)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid symbol format')
        );
      }
      
      const enhancedData = await enhancedFinancialService.getEnhancedFinancialData(symbol);
      
      const valuationAnalysis = {
        symbol: enhancedData.symbol,
        companyName: enhancedData.companyName,
        currentPrice: enhancedData.currentPrice,
        valuation: enhancedData.valuation,
        
        // 詳細なバリュエーション
        multipleAnalysis: {
          peMultiple: {
            current: enhancedData.fundamentals.peRatio,
            industryMedian: enhancedData.industryComparison.industryAverages.peRatio,
            premium: ((enhancedData.fundamentals.peRatio / enhancedData.industryComparison.industryAverages.peRatio) - 1) * 100
          },
          pbMultiple: {
            current: enhancedData.fundamentals.pbRatio,
            industryMedian: enhancedData.industryComparison.industryAverages.pbRatio,
            premium: ((enhancedData.fundamentals.pbRatio / enhancedData.industryComparison.industryAverages.pbRatio) - 1) * 100
          }
        },
        
        // リスク調整後評価
        riskAdjustedValuation: {
          adjustedFairValue: enhancedData.valuation.fairValue * getRiskAdjustmentFactor(enhancedData),
          volatilityAdjustment: getVolatilityAdjustment(enhancedData),
          liquidityAdjustment: getLiquidityAdjustment(enhancedData)
        },
        
        dataQuality: enhancedData.dataQuality
      };
      
      res.json(createSecureApiResponse(true, valuationAnalysis));
      
    } catch (error: any) {
      console.error('Enhanced valuation analysis error:', error);
      res.status(500).json(
        createSecureApiResponse(false, undefined, 'Failed to perform valuation analysis')
      );
    }
  }
);

/**
 * 投資サマリー（高精度版）
 * GET /api/enhanced-analysis/:symbol/investment-summary
 */
router.get('/:symbol/investment-summary',
  apiLimitMiddleware(),
  addLimitStatusToResponse,
  async (req: Request, res: Response) => {
    try {
      const { symbol } = req.params;
      
      if (!validateInput.isValidSymbol(symbol)) {
        return res.status(400).json(
          createSecureApiResponse(false, undefined, 'Invalid symbol format')
        );
      }
      
      const enhancedData = await enhancedFinancialService.getEnhancedFinancialData(symbol);
      
      const investmentSummary = {
        symbol: enhancedData.symbol,
        companyName: enhancedData.companyName,
        industry: enhancedData.industry,
        sector: enhancedData.sector,
        
        // 投資ハイライト
        investmentHighlights: {
          recommendation: enhancedData.valuation.recommendation,
          targetPrice: enhancedData.valuation.targetPrice,
          upside: enhancedData.valuation.upside,
          confidenceLevel: enhancedData.valuation.confidenceLevel,
          priceRange: enhancedData.valuation.priceRange
        },
        
        // キー財務指標
        keyMetrics: {
          peRatio: {
            value: enhancedData.fundamentals.peRatio,
            rating: enhancedData.industryComparison.ratings.peRatio,
            percentile: enhancedData.industryComparison.percentiles.peRatio
          },
          roe: {
            value: enhancedData.fundamentals.roe,
            rating: enhancedData.industryComparison.ratings.roe,
            percentile: enhancedData.industryComparison.percentiles.roe
          },
          grossMargin: {
            value: enhancedData.fundamentals.grossMargin,
            rating: enhancedData.industryComparison.ratings.grossMargin,
            percentile: enhancedData.industryComparison.percentiles.grossMargin
          }
        },
        
        // リスクファクター
        riskAssessment: {
          businessRisk: assessBusinessRisk(enhancedData),
          financialRisk: assessFinancialRisk(enhancedData),
          marketRisk: assessMarketRisk(enhancedData),
          overallRiskLevel: calculateOverallRisk(enhancedData)
        },
        
        // 投資テーマ
        investmentThemes: generateInvestmentThemes(enhancedData),
        
        dataQuality: enhancedData.dataQuality,
        analysisDate: new Date().toISOString()
      };
      
      res.json(createSecureApiResponse(true, investmentSummary));
      
    } catch (error: any) {
      console.error('Enhanced investment summary error:', error);
      res.status(500).json(
        createSecureApiResponse(false, undefined, 'Failed to generate investment summary')
      );
    }
  }
);

// ヘルパーメソッド群
function calculateIndustryRank(data: any): string {
  const avgPercentile = Object.values(data.industryComparison.percentiles)
    .reduce((sum: number, p: any) => sum + p, 0) / Object.keys(data.industryComparison.percentiles).length;
  
  if (avgPercentile >= 80) return 'Top 20%';
  if (avgPercentile >= 60) return 'Top 40%';
  if (avgPercentile >= 40) return 'Middle 40%';
  if (avgPercentile >= 20) return 'Bottom 40%';
  return 'Bottom 20%';
}

function identifyStrengths(data: any): string[] {
  const strengths: string[] = [];
  const { ratings, percentiles } = data.industryComparison || {};
  
  if (!ratings || !percentiles) {
    return ['データ不足により分析不可'];
  }
  
  Object.entries(ratings).forEach(([metric, rating]) => {
    if (rating === 'Excellent' || rating === 'Good') {
      const percentile = percentiles[metric];
      if (metric === 'roe' && percentile >= 70) {
        strengths.push(`優秀なROE (${data.fundamentals?.roe?.toFixed(1) || 'N/A'}%, 業界上位${100-percentile}%)`);
      } else if (metric === 'grossMargin' && percentile >= 70) {
        strengths.push(`高い粗利率 (${data.fundamentals?.grossMargin?.toFixed(1) || 'N/A'}%, 業界上位${100-percentile}%)`);
      } else if (metric === 'revenueGrowth' && percentile >= 70) {
        strengths.push(`優れた売上成長 (${data.fundamentals?.revenueGrowth?.toFixed(1) || 'N/A'}%, 業界上位${100-percentile}%)`);
      }
    }
  });
  
  return strengths.length > 0 ? strengths : ['業界平均的な財務パフォーマンス'];
}

function identifyWeaknesses(data: any): string[] {
  const weaknesses: string[] = [];
  const { ratings, percentiles } = data.industryComparison || {};
  
  if (!ratings || !percentiles) {
    return ['データ不足により分析不可'];
  }
  
  Object.entries(ratings).forEach(([metric, rating]) => {
    if (rating === 'Poor' || rating === 'Below Average') {
      const percentile = percentiles[metric];
      if (metric === 'roe' && percentile <= 30) {
        weaknesses.push(`低いROE (${data.fundamentals?.roe?.toFixed(1) || 'N/A'}%, 業界下位${percentile}%)`);
      } else if (metric === 'grossMargin' && percentile <= 30) {
        weaknesses.push(`低い粗利率 (${data.fundamentals?.grossMargin?.toFixed(1) || 'N/A'}%, 業界下位${percentile}%)`);
      } else if (metric === 'peRatio' && percentile >= 80) {
        weaknesses.push(`高いバリュエーション (PER ${data.fundamentals?.peRatio?.toFixed(1) || 'N/A'}倍, 業界上位${100-percentile}%)`);
      }
    }
  });
  
  return weaknesses.length > 0 ? weaknesses : ['特筆すべき弱点なし'];
}

function identifyCompetitiveAdvantages(data: any): string[] {
  const advantages: string[] = [];
  const fundamentals = data.fundamentals;
  
  if (fundamentals.grossMargin > 50) {
    advantages.push('高い粗利率による価格競争力');
  }
  if (fundamentals.roe > 20) {
    advantages.push('優れた資本効率性');
  }
  if (fundamentals.currentRatio > 2) {
    advantages.push('強固な財務基盤');
  }
  if (fundamentals.revenueGrowth > 10) {
    advantages.push('持続的な成長性');
  }
  
  return advantages.length > 0 ? advantages : ['業界標準的な競争力'];
}

function generateBullCase(data: any): string[] {
  return [
    `目標株価 ¥${data.valuation.targetPrice} (+${data.valuation.upside.toFixed(1)}%)`,
    '業界平均を上回る成長率の継続',
    '市場シェア拡大による収益性向上',
    '効率化施策による利益率改善'
  ];
}

function generateBearCase(data: any): string[] {
  return [
    `下方リスク ¥${data.valuation.priceRange.bearCase} (-${(((data.currentPrice - data.valuation.priceRange.bearCase) / data.currentPrice) * 100).toFixed(1)}%)`,
    '競争激化による利益率圧迫',
    '市場成長率の鈍化',
    'マクロ経済環境の悪化影響'
  ];
}

function identifyKeyRisks(data: any): string[] {
  const risks: string[] = [];
  const fundamentals = data.fundamentals;
  
  if (fundamentals.debtToEquity > 1.0) {
    risks.push('高い負債比率による財務リスク');
  }
  if (fundamentals.peRatio > 30) {
    risks.push('高バリュエーションによる調整リスク');
  }
  if (fundamentals.revenueGrowth < 0) {
    risks.push('売上減少による業績悪化リスク');
  }
  
  return risks.length > 0 ? risks : ['標準的なリスクレベル'];
}

function identifyCatalysts(data: any): string[] {
  return [
    '新製品・サービスの市場投入',
    'DX推進による効率化',
    '海外展開の加速',
    '業界再編による統合効果'
  ];
}

function getRiskAdjustmentFactor(data: any): number {
  let factor = 1.0;
  
  // 財務リスク調整
  if (data.fundamentals.debtToEquity > 1.0) factor -= 0.1;
  if (data.fundamentals.currentRatio < 1.5) factor -= 0.05;
  
  // 収益性リスク調整
  if (data.fundamentals.roe < 10) factor -= 0.1;
  if (data.fundamentals.netMargin < 5) factor -= 0.05;
  
  return Math.max(factor, 0.7); // 最低0.7倍
}

function getVolatilityAdjustment(data: any): number {
  // 業界・銘柄特性による調整
  if (data.industry.includes('Technology') || data.industry.includes('情報・通信')) {
    return 0.25; // 25%のボラティリティ
  }
  return 0.20; // 20%のデフォルトボラティリティ
}

function getLiquidityAdjustment(data: any): number {
  // 流動性による調整（日本株は一般的に流動性ディスカウント）
  if (/^\d{4}$/.test(data.symbol)) {
    return 0.95; // 5%のディスカウント
  }
  return 1.0; // 米国株は調整なし
}

function assessBusinessRisk(data: any): 'Low' | 'Medium' | 'High' {
  const revenueVolatility = Math.abs(data.fundamentals.revenueGrowth);
  if (revenueVolatility > 20) return 'High';
  if (revenueVolatility > 10) return 'Medium';
  return 'Low';
}

function assessFinancialRisk(data: any): 'Low' | 'Medium' | 'High' {
  if (data.fundamentals.debtToEquity > 1.5) return 'High';
  if (data.fundamentals.debtToEquity > 0.8) return 'Medium';
  return 'Low';
}

function assessMarketRisk(data: any): 'Low' | 'Medium' | 'High' {
  if (data.fundamentals.peRatio > 30) return 'High';
  if (data.fundamentals.peRatio > 20) return 'Medium';
  return 'Low';
}

function calculateOverallRisk(data: any): 'Low' | 'Medium' | 'High' {
  const businessRisk = assessBusinessRisk(data);
  const financialRisk = assessFinancialRisk(data);
  const marketRisk = assessMarketRisk(data);
  
  const riskScore = 
    (businessRisk === 'High' ? 3 : businessRisk === 'Medium' ? 2 : 1) +
    (financialRisk === 'High' ? 3 : financialRisk === 'Medium' ? 2 : 1) +
    (marketRisk === 'High' ? 3 : marketRisk === 'Medium' ? 2 : 1);
  
  if (riskScore >= 7) return 'High';
  if (riskScore >= 5) return 'Medium';
  return 'Low';
}

function generateInvestmentThemes(data: any): string[] {
  const themes: string[] = [];
  
  if (data.fundamentals.revenueGrowth > 10) {
    themes.push('成長株投資');
  }
  if (data.fundamentals.dividendYield > 0.03) {
    themes.push('配当株投資');
  }
  if (data.valuation.upside > 20) {
    themes.push('バリュー投資');
  }
  if (data.fundamentals.roe > 15) {
    themes.push('高ROE投資');
  }
  
  return themes.length > 0 ? themes : ['バランス投資'];
}

export default router;