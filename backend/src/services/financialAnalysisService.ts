import { sqliteDb } from '../config/sqlite';
import { validateSymbol, createSecureApiResponse } from '../utils/security';

export interface DetailedFinancialData {
  symbol: string;
  companyName: string;
  currentPrice: number;
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  eps: number;
  roe: number;
  roa: number;
  dividendYield: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  revenueGrowth: number;
  earningsGrowth: number;
  bookValuePerShare: number;
  priceToBook: number;
  priceToSales: number;
  enterpriseValue: number;
  evToEbitda: number;
  freeCashFlow: number;
  operatingCashFlow: number;
  week52High: number;
  week52Low: number;
  beta: number;
  sharesOutstanding: number;
  floatShares: number;
  insiderOwnership: number;
  institutionalOwnership: number;
  shortInterest: number;
  forwardPE: number;
  pegRatio: number;
  dividendPayoutRatio: number;
  returnOnInvestment: number;
  assetTurnover: number;
  inventoryTurnover: number;
  receivablesTurnover: number;
  lastUpdated: Date;
}

export interface FinancialRatioAnalysis {
  symbol: string;
  profitabilityRatios: {
    grossMargin: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    operatingMargin: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    netMargin: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    roe: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    roa: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    roi: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
  };
  liquidityRatios: {
    currentRatio: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    quickRatio: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
  };
  leverageRatios: {
    debtToEquity: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
  };
  valuationRatios: {
    peRatio: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    pbRatio: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    priceToSales: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    pegRatio: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
  };
  efficiencyRatios: {
    assetTurnover: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    inventoryTurnover: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
    receivablesTurnover: { value: number; rating: 'Excellent' | 'Good' | 'Average' | 'Poor'; benchmark: number };
  };
  overallScore: number; // 0-100
  overallRating: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
  strengths: string[];
  weaknesses: string[];
  recommendations: string[];
}

export interface DCFAnalysis {
  symbol: string;
  currentPrice: number;
  estimatedFairValue: number;
  upside: number; // percentage
  confidenceLevel: 'High' | 'Medium' | 'Low';
  assumptions: {
    revenueGrowthRate: number;
    terminalGrowthRate: number;
    discountRate: number;
    yearsProjected: number;
  };
  projectedCashFlows: {
    year: number;
    revenue: number;
    freeCashFlow: number;
    presentValue: number;
  }[];
  terminalValue: number;
  totalPresentValue: number;
  intrinsicValue: number;
  marginOfSafety: number;
  scenario: {
    bull: { fairValue: number; upside: number };
    base: { fairValue: number; upside: number };
    bear: { fairValue: number; upside: number };
  };
}

export class FinancialAnalysisService {

  async getDetailedFinancialData(symbol: string): Promise<DetailedFinancialData | null> {
    try {
      const validSymbol = validateSymbol(symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      // Get the latest stock price data
      const query = `
        SELECT 
          c.symbol,
          c.name as company_name,
          c.current_price as price,
          c.market_cap,
          c.current_price / 15.0 as pe_ratio,
          0.0 as eps,
          0.0 as dividend_yield
        FROM companies c
        WHERE c.symbol = ?
      `;

      const result = await sqliteDb.query(query, [validSymbol]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Calculate additional metrics from basic data
      const calculatedMetrics = this.calculateAdvancedMetrics(row);

      return {
        symbol: validSymbol,
        companyName: row.company_name,
        currentPrice: parseFloat(row.price),
        marketCap: row.market_cap || 0,
        peRatio: parseFloat(row.pe_ratio) || 0,
        pbRatio: calculatedMetrics.pbRatio,
        eps: parseFloat(row.eps) || 0,
        roe: calculatedMetrics.roe,
        roa: calculatedMetrics.roa,
        dividendYield: parseFloat(row.dividend_yield) || 0,
        debtToEquity: calculatedMetrics.debtToEquity,
        currentRatio: calculatedMetrics.currentRatio,
        quickRatio: calculatedMetrics.quickRatio,
        grossMargin: calculatedMetrics.grossMargin,
        operatingMargin: calculatedMetrics.operatingMargin,
        netMargin: calculatedMetrics.netMargin,
        revenueGrowth: calculatedMetrics.revenueGrowth,
        earningsGrowth: calculatedMetrics.earningsGrowth,
        bookValuePerShare: calculatedMetrics.bookValuePerShare,
        priceToBook: calculatedMetrics.priceToBook,
        priceToSales: calculatedMetrics.priceToSales,
        enterpriseValue: calculatedMetrics.enterpriseValue,
        evToEbitda: calculatedMetrics.evToEbitda,
        freeCashFlow: calculatedMetrics.freeCashFlow,
        operatingCashFlow: calculatedMetrics.operatingCashFlow,
        week52High: parseFloat(row.week_52_high) || 0,
        week52Low: parseFloat(row.week_52_low) || 0,
        beta: calculatedMetrics.beta,
        sharesOutstanding: calculatedMetrics.sharesOutstanding,
        floatShares: calculatedMetrics.floatShares,
        insiderOwnership: calculatedMetrics.insiderOwnership,
        institutionalOwnership: calculatedMetrics.institutionalOwnership,
        shortInterest: calculatedMetrics.shortInterest,
        forwardPE: calculatedMetrics.forwardPE,
        pegRatio: calculatedMetrics.pegRatio,
        dividendPayoutRatio: calculatedMetrics.dividendPayoutRatio,
        returnOnInvestment: calculatedMetrics.returnOnInvestment,
        assetTurnover: calculatedMetrics.assetTurnover,
        inventoryTurnover: calculatedMetrics.inventoryTurnover,
        receivablesTurnover: calculatedMetrics.receivablesTurnover,
        lastUpdated: new Date(row.recorded_at)
      };

    } catch (error) {
      console.error('Error getting detailed financial data:', error);
      throw error;
    }
  }

  async performRatioAnalysis(symbol: string): Promise<FinancialRatioAnalysis | null> {
    try {
      const financialData = await this.getDetailedFinancialData(symbol);
      if (!financialData) {
        return null;
      }

      // Get industry benchmarks
      const industryBenchmarks = await this.getIndustryBenchmarks(symbol);

      const analysis: FinancialRatioAnalysis = {
        symbol,
        profitabilityRatios: {
          grossMargin: this.rateMetric(financialData.grossMargin, industryBenchmarks.grossMargin, 'higher'),
          operatingMargin: this.rateMetric(financialData.operatingMargin, industryBenchmarks.operatingMargin, 'higher'),
          netMargin: this.rateMetric(financialData.netMargin, industryBenchmarks.netMargin, 'higher'),
          roe: this.rateMetric(financialData.roe, industryBenchmarks.roe, 'higher'),
          roa: this.rateMetric(financialData.roa, industryBenchmarks.roa, 'higher'),
          roi: this.rateMetric(financialData.returnOnInvestment, industryBenchmarks.roi, 'higher')
        },
        liquidityRatios: {
          currentRatio: this.rateMetric(financialData.currentRatio, industryBenchmarks.currentRatio, 'optimal'),
          quickRatio: this.rateMetric(financialData.quickRatio, industryBenchmarks.quickRatio, 'optimal')
        },
        leverageRatios: {
          debtToEquity: this.rateMetric(financialData.debtToEquity, industryBenchmarks.debtToEquity, 'lower')
        },
        valuationRatios: {
          peRatio: this.rateMetric(financialData.peRatio, industryBenchmarks.peRatio, 'lower'),
          pbRatio: this.rateMetric(financialData.pbRatio, industryBenchmarks.pbRatio, 'lower'),
          priceToSales: this.rateMetric(financialData.priceToSales, industryBenchmarks.priceToSales, 'lower'),
          pegRatio: this.rateMetric(financialData.pegRatio, industryBenchmarks.pegRatio, 'lower')
        },
        efficiencyRatios: {
          assetTurnover: this.rateMetric(financialData.assetTurnover, industryBenchmarks.assetTurnover, 'higher'),
          inventoryTurnover: this.rateMetric(financialData.inventoryTurnover, industryBenchmarks.inventoryTurnover, 'higher'),
          receivablesTurnover: this.rateMetric(financialData.receivablesTurnover, industryBenchmarks.receivablesTurnover, 'higher')
        },
        overallScore: 0,
        overallRating: 'Hold',
        strengths: [],
        weaknesses: [],
        recommendations: []
      };

      // Calculate overall score and generate insights
      analysis.overallScore = this.calculateOverallScore(analysis);
      analysis.overallRating = this.getOverallRating(analysis.overallScore);
      analysis.strengths = this.identifyStrengths(analysis);
      analysis.weaknesses = this.identifyWeaknesses(analysis);
      analysis.recommendations = this.generateRecommendations(analysis);

      return analysis;

    } catch (error) {
      console.error('Error performing ratio analysis:', error);
      throw error;
    }
  }

  async performDCFAnalysis(symbol: string): Promise<DCFAnalysis | null> {
    try {
      const financialData = await this.getDetailedFinancialData(symbol);
      if (!financialData) {
        return null;
      }

      // DCF model assumptions
      const assumptions = {
        revenueGrowthRate: Math.max(0.03, Math.min(0.15, financialData.revenueGrowth / 100)), // 3-15%
        terminalGrowthRate: 0.025, // 2.5% long-term growth
        discountRate: 0.10, // 10% WACC
        yearsProjected: 5
      };

      // Calculate current free cash flow (estimated from available data)
      const currentFCF = financialData.freeCashFlow || financialData.operatingCashFlow * 0.75;
      
      // Project future cash flows
      const projectedCashFlows = [];
      let currentRevenue = financialData.marketCap / (financialData.priceToSales || 1);
      
      for (let year = 1; year <= assumptions.yearsProjected; year++) {
        currentRevenue *= (1 + assumptions.revenueGrowthRate);
        const fcf = currentRevenue * (financialData.netMargin / 100) * 0.8; // Estimate FCF
        const presentValue = fcf / Math.pow(1 + assumptions.discountRate, year);
        
        projectedCashFlows.push({
          year,
          revenue: currentRevenue,
          freeCashFlow: fcf,
          presentValue
        });
      }

      // Calculate terminal value
      const terminalFCF = projectedCashFlows[projectedCashFlows.length - 1].freeCashFlow;
      const terminalValue = (terminalFCF * (1 + assumptions.terminalGrowthRate)) / 
                          (assumptions.discountRate - assumptions.terminalGrowthRate);
      const terminalPV = terminalValue / Math.pow(1 + assumptions.discountRate, assumptions.yearsProjected);

      // Calculate total present value
      const cashFlowPV = projectedCashFlows.reduce((sum, cf) => sum + cf.presentValue, 0);
      const totalPresentValue = cashFlowPV + terminalPV;

      // Calculate per-share intrinsic value
      const sharesOutstanding = financialData.sharesOutstanding || (financialData.marketCap / financialData.currentPrice);
      const intrinsicValue = totalPresentValue / sharesOutstanding;
      
      const upside = ((intrinsicValue - financialData.currentPrice) / financialData.currentPrice) * 100;
      const marginOfSafety = Math.max(0, (intrinsicValue - financialData.currentPrice) / intrinsicValue * 100);

      // Scenario analysis
      const scenarios = this.generateScenarios(assumptions, projectedCashFlows, terminalValue, sharesOutstanding, financialData.currentPrice);

      const confidenceLevel = this.getConfidenceLevel(financialData, marginOfSafety);

      return {
        symbol,
        currentPrice: financialData.currentPrice,
        estimatedFairValue: intrinsicValue,
        upside,
        confidenceLevel,
        assumptions,
        projectedCashFlows,
        terminalValue: terminalPV,
        totalPresentValue,
        intrinsicValue,
        marginOfSafety,
        scenario: scenarios
      };

    } catch (error) {
      console.error('Error performing DCF analysis:', error);
      throw error;
    }
  }

  private calculateAdvancedMetrics(basicData: any) {
    // Since we have limited data, we'll use industry-standard estimates
    // In a production system, these would come from comprehensive financial statements
    
    const marketCap = basicData.market_cap || 0;
    const price = parseFloat(basicData.price) || 0;
    const eps = parseFloat(basicData.eps) || 0;
    const pe = parseFloat(basicData.pe_ratio) || 0;
    
    // Estimate shares outstanding
    const sharesOutstanding = eps > 0 ? marketCap / price : 1000000;
    
    return {
      pbRatio: pe * 0.3, // Rough estimate
      roe: pe > 0 ? (1 / pe) * 100 * 1.2 : 0, // Estimate based on PE
      roa: pe > 0 ? (1 / pe) * 100 * 0.8 : 0,
      debtToEquity: 0.5, // Industry average assumption
      currentRatio: 1.5, // Conservative assumption
      quickRatio: 1.2,
      grossMargin: 25, // Industry average assumption
      operatingMargin: 15,
      netMargin: 10,
      revenueGrowth: 5, // Conservative assumption
      earningsGrowth: 8,
      bookValuePerShare: price * 0.7, // Estimate
      priceToBook: price / (price * 0.7),
      priceToSales: pe * 0.8,
      enterpriseValue: marketCap * 1.1,
      evToEbitda: pe * 0.9,
      freeCashFlow: marketCap * 0.05,
      operatingCashFlow: marketCap * 0.07,
      beta: 1.0, // Market average
      sharesOutstanding,
      floatShares: sharesOutstanding * 0.9,
      insiderOwnership: 10,
      institutionalOwnership: 60,
      shortInterest: 3,
      forwardPE: pe * 0.9,
      pegRatio: pe / 8, // Estimate based on growth
      dividendPayoutRatio: parseFloat(basicData.dividend_yield) * 2 || 0,
      returnOnInvestment: pe > 0 ? (1 / pe) * 100 : 0,
      assetTurnover: 1.2,
      inventoryTurnover: 6,
      receivablesTurnover: 8
    };
  }

  private async getIndustryBenchmarks(symbol: string) {
    // For Phase 2, return standard benchmarks
    // In Phase 3, this will query the industry_stats table
    return {
      grossMargin: 30,
      operatingMargin: 15,
      netMargin: 10,
      roe: 15,
      roa: 8,
      roi: 12,
      currentRatio: 1.5,
      quickRatio: 1.0,
      debtToEquity: 0.5,
      peRatio: 20,
      pbRatio: 2.5,
      priceToSales: 3.0,
      pegRatio: 1.5,
      assetTurnover: 1.0,
      inventoryTurnover: 6,
      receivablesTurnover: 8
    };
  }

  private rateMetric(value: number, benchmark: number, direction: 'higher' | 'lower' | 'optimal') {
    let rating: 'Excellent' | 'Good' | 'Average' | 'Poor';
    
    if (direction === 'higher') {
      if (value >= benchmark * 1.2) rating = 'Excellent';
      else if (value >= benchmark * 1.1) rating = 'Good';
      else if (value >= benchmark * 0.9) rating = 'Average';
      else rating = 'Poor';
    } else if (direction === 'lower') {
      if (value <= benchmark * 0.8) rating = 'Excellent';
      else if (value <= benchmark * 0.9) rating = 'Good';
      else if (value <= benchmark * 1.1) rating = 'Average';
      else rating = 'Poor';
    } else { // optimal
      if (Math.abs(value - benchmark) <= benchmark * 0.1) rating = 'Excellent';
      else if (Math.abs(value - benchmark) <= benchmark * 0.2) rating = 'Good';
      else if (Math.abs(value - benchmark) <= benchmark * 0.3) rating = 'Average';
      else rating = 'Poor';
    }

    return { value, rating, benchmark };
  }

  private calculateOverallScore(analysis: FinancialRatioAnalysis): number {
    const weights = {
      profitability: 0.3,
      liquidity: 0.2,
      leverage: 0.2,
      valuation: 0.2,
      efficiency: 0.1
    };

    const scoreMapping = { 'Excellent': 100, 'Good': 75, 'Average': 50, 'Poor': 25 };

    const profitabilityScore = Object.values(analysis.profitabilityRatios)
      .reduce((sum, ratio) => sum + scoreMapping[ratio.rating], 0) / Object.keys(analysis.profitabilityRatios).length;

    const liquidityScore = Object.values(analysis.liquidityRatios)
      .reduce((sum, ratio) => sum + scoreMapping[ratio.rating], 0) / Object.keys(analysis.liquidityRatios).length;

    const leverageScore = Object.values(analysis.leverageRatios)
      .reduce((sum, ratio) => sum + scoreMapping[ratio.rating], 0) / Object.keys(analysis.leverageRatios).length;

    const valuationScore = Object.values(analysis.valuationRatios)
      .reduce((sum, ratio) => sum + scoreMapping[ratio.rating], 0) / Object.keys(analysis.valuationRatios).length;

    const efficiencyScore = Object.values(analysis.efficiencyRatios)
      .reduce((sum, ratio) => sum + scoreMapping[ratio.rating], 0) / Object.keys(analysis.efficiencyRatios).length;

    return Math.round(
      profitabilityScore * weights.profitability +
      liquidityScore * weights.liquidity +
      leverageScore * weights.leverage +
      valuationScore * weights.valuation +
      efficiencyScore * weights.efficiency
    );
  }

  private getOverallRating(score: number): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    if (score >= 80) return 'Strong Buy';
    if (score >= 65) return 'Buy';
    if (score >= 45) return 'Hold';
    if (score >= 30) return 'Sell';
    return 'Strong Sell';
  }

  private identifyStrengths(analysis: FinancialRatioAnalysis): string[] {
    const strengths: string[] = [];
    
    // Check each category for excellent ratings
    Object.entries(analysis.profitabilityRatios).forEach(([key, ratio]) => {
      if (ratio.rating === 'Excellent') {
        strengths.push(`優秀な${this.getMetricName(key)}`);
      }
    });

    Object.entries(analysis.liquidityRatios).forEach(([key, ratio]) => {
      if (ratio.rating === 'Excellent') {
        strengths.push(`健全な${this.getMetricName(key)}`);
      }
    });

    // Add more strength identification logic
    if (strengths.length === 0) {
      strengths.push('安定した財務基盤');
    }

    return strengths.slice(0, 5); // Limit to top 5
  }

  private identifyWeaknesses(analysis: FinancialRatioAnalysis): string[] {
    const weaknesses: string[] = [];
    
    // Check each category for poor ratings
    Object.entries(analysis.profitabilityRatios).forEach(([key, ratio]) => {
      if (ratio.rating === 'Poor') {
        weaknesses.push(`${this.getMetricName(key)}の改善が必要`);
      }
    });

    Object.entries(analysis.valuationRatios).forEach(([key, ratio]) => {
      if (ratio.rating === 'Poor') {
        weaknesses.push(`${this.getMetricName(key)}が割高`);
      }
    });

    if (weaknesses.length === 0) {
      weaknesses.push('特に大きな問題は見当たりません');
    }

    return weaknesses.slice(0, 5); // Limit to top 5
  }

  private generateRecommendations(analysis: FinancialRatioAnalysis): string[] {
    const recommendations: string[] = [];
    
    if (analysis.overallScore >= 70) {
      recommendations.push('参考：良好な財務指標を示しており、投資検討の価値があります');
    } else if (analysis.overallScore >= 50) {
      recommendations.push('参考：一部に改善の余地がありますが、全体的には安定しています');
    } else {
      recommendations.push('参考：慎重な検討が必要です');
    }

    // Add specific recommendations based on weaknesses
    if (analysis.profitabilityRatios.netMargin.rating === 'Poor') {
      recommendations.push('利益率向上の取り組みに注目');
    }

    if (analysis.valuationRatios.peRatio.rating === 'Poor') {
      recommendations.push('現在の株価水準での投資は慎重に');
    }

    recommendations.push('投資前に最新の業績発表をご確認ください');
    recommendations.push('この分析は参考情報であり、投資助言ではありません');

    return recommendations.slice(0, 6);
  }

  private getMetricName(key: string): string {
    const names: { [key: string]: string } = {
      grossMargin: '売上総利益率',
      operatingMargin: '営業利益率',
      netMargin: '純利益率',
      roe: 'ROE',
      roa: 'ROA',
      roi: 'ROI',
      currentRatio: '流動比率',
      quickRatio: '当座比率',
      debtToEquity: '負債自己資本比率',
      peRatio: 'PER',
      pbRatio: 'PBR',
      priceToSales: 'PSR',
      pegRatio: 'PEG比率',
      assetTurnover: '総資産回転率',
      inventoryTurnover: '棚卸資産回転率',
      receivablesTurnover: '売上債権回転率'
    };
    return names[key] || key;
  }

  private generateScenarios(assumptions: any, projectedCashFlows: any[], terminalValue: number, sharesOutstanding: number, currentPrice: number) {
    const scenarios = ['bull', 'base', 'bear'];
    const growthMultipliers = { bull: 1.3, base: 1.0, bear: 0.7 };
    
    const scenarioResults: any = {};

    scenarios.forEach(scenario => {
      const multiplier = growthMultipliers[scenario as keyof typeof growthMultipliers];
      const adjustedCashFlows = projectedCashFlows.map(cf => ({
        ...cf,
        freeCashFlow: cf.freeCashFlow * multiplier,
        presentValue: cf.presentValue * multiplier
      }));
      
      const adjustedTerminalValue = terminalValue * multiplier;
      const totalPV = adjustedCashFlows.reduce((sum, cf) => sum + cf.presentValue, 0) + adjustedTerminalValue;
      const fairValue = totalPV / sharesOutstanding;
      const upside = ((fairValue - currentPrice) / currentPrice) * 100;
      
      scenarioResults[scenario] = { fairValue, upside };
    });

    return scenarioResults;
  }

  private getConfidenceLevel(financialData: DetailedFinancialData, marginOfSafety: number): 'High' | 'Medium' | 'Low' {
    let confidenceScore = 0;
    
    // Factors that increase confidence
    if (marginOfSafety > 20) confidenceScore += 2;
    else if (marginOfSafety > 10) confidenceScore += 1;
    
    if (financialData.roe > 15) confidenceScore += 1;
    if (financialData.debtToEquity < 0.5) confidenceScore += 1;
    if (financialData.currentRatio > 1.5) confidenceScore += 1;
    if (financialData.revenueGrowth > 5) confidenceScore += 1;

    if (confidenceScore >= 5) return 'High';
    if (confidenceScore >= 3) return 'Medium';
    return 'Low';
  }
}

export const financialAnalysisService = new FinancialAnalysisService();