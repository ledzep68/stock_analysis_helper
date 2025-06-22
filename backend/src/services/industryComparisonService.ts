import { sqliteDb } from '../config/sqlite';
import { validateSymbol, createSecureApiResponse } from '../utils/security';

export interface IndustryComparisonData {
  symbol: string;
  companyName: string;
  industry: string;
  sector: string;
  companyMetrics: CompanyMetrics;
  industryBenchmarks: IndustryBenchmarks;
  sectorBenchmarks: SectorBenchmarks;
  comparison: ComparisonResults;
  ranking: RankingData;
  competitorAnalysis: CompetitorData[];
}

export interface CompanyMetrics {
  marketCap: number;
  peRatio: number;
  pbRatio: number;
  eps: number;
  roe: number;
  roa: number;
  dividendYield: number;
  debtToEquity: number;
  currentRatio: number;
  grossMargin: number;
  operatingMargin: number;
  netMargin: number;
  revenueGrowth: number;
  earningsGrowth: number;
  priceToSales: number;
  priceToBook: number;
  freeCashFlowYield: number;
  returnOnInvestment: number;
}

export interface IndustryBenchmarks {
  industry: string;
  sampleSize: number;
  metrics: {
    avgMarketCap: number;
    medianMarketCap: number;
    avgPeRatio: number;
    medianPeRatio: number;
    avgPbRatio: number;
    medianPbRatio: number;
    avgRoe: number;
    medianRoe: number;
    avgDividendYield: number;
    medianDividendYield: number;
    avgDebtToEquity: number;
    medianDebtToEquity: number;
    avgGrossMargin: number;
    medianGrossMargin: number;
    avgOperatingMargin: number;
    medianOperatingMargin: number;
    avgNetMargin: number;
    medianNetMargin: number;
    avgRevenueGrowth: number;
    medianRevenueGrowth: number;
  };
  lastUpdated: Date;
}

export interface SectorBenchmarks {
  sector: string;
  sampleSize: number;
  metrics: {
    avgMarketCap: number;
    avgPeRatio: number;
    avgRoe: number;
    avgDividendYield: number;
    avgNetMargin: number;
    avgRevenueGrowth: number;
  };
  lastUpdated: Date;
}

export interface ComparisonResults {
  industryPercentile: { [key: string]: number };
  sectorPercentile: { [key: string]: number };
  strengthsVsIndustry: string[];
  weaknessesVsIndustry: string[];
  competitiveAdvantages: string[];
  investmentThesis: string[];
  riskFactors: string[];
  overallRating: 'Industry Leader' | 'Above Average' | 'Average' | 'Below Average' | 'Laggard';
  investmentRecommendation: 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell';
}

export interface RankingData {
  industryRank: {
    marketCap: { rank: number; total: number };
    profitability: { rank: number; total: number };
    valuation: { rank: number; total: number };
    efficiency: { rank: number; total: number };
    growth: { rank: number; total: number };
  };
  sectorRank: {
    overall: { rank: number; total: number };
    profitability: { rank: number; total: number };
    valuation: { rank: number; total: number };
  };
}

export interface CompetitorData {
  symbol: string;
  name: string;
  marketCap: number;
  peRatio: number;
  roe: number;
  dividendYield: number;
  netMargin: number;
  revenueGrowth: number;
  competitivePosition: 'Strong' | 'Moderate' | 'Weak';
  marketShare: number; // Estimated
}

export class IndustryComparisonService {

  async performIndustryComparison(symbol: string): Promise<IndustryComparisonData | null> {
    try {
      const validSymbol = validateSymbol(symbol);
      if (!validSymbol) {
        throw new Error('Invalid symbol format');
      }

      // Get company data with industry information
      const companyData = await this.getCompanyWithIndustryData(validSymbol);
      if (!companyData) {
        return null;
      }

      // Get company metrics
      const companyMetrics = await this.getCompanyMetrics(validSymbol);
      if (!companyMetrics) {
        return null;
      }

      // Get industry and sector benchmarks
      const [industryBenchmarks, sectorBenchmarks] = await Promise.all([
        this.getIndustryBenchmarks(companyData.industry),
        this.getSectorBenchmarks(companyData.sector)
      ]);

      // Perform comparison analysis
      const comparison = this.performComparison(companyMetrics, industryBenchmarks, sectorBenchmarks);

      // Get ranking data
      const ranking = await this.calculateRankings(validSymbol, companyData.industry, companyData.sector, companyMetrics);

      // Get competitor analysis
      const competitorAnalysis = await this.getCompetitorAnalysis(companyData.industry, validSymbol, 5);

      return {
        symbol: validSymbol,
        companyName: companyData.name,
        industry: companyData.industry,
        sector: companyData.sector,
        companyMetrics,
        industryBenchmarks,
        sectorBenchmarks,
        comparison,
        ranking,
        competitorAnalysis
      };

    } catch (error) {
      console.error('Error performing industry comparison:', error);
      throw error;
    }
  }

  private async getCompanyWithIndustryData(symbol: string) {
    try {
      const query = `
        SELECT c.symbol, c.name, c.industry, c.sector
        FROM companies c
        WHERE c.symbol = $1
      `;

      const result = await sqliteDb.query(query, [symbol]);
      return result.rows.length > 0 ? result.rows[0] : null;

    } catch (error) {
      console.error('Error getting company industry data:', error);
      return null;
    }
  }

  private async getCompanyMetrics(symbol: string): Promise<CompanyMetrics | null> {
    try {
      const query = `
        SELECT *
        FROM stock_prices
        WHERE symbol = $1
        ORDER BY recorded_at DESC
        LIMIT 1
      `;

      const result = await sqliteDb.query(query, [symbol]);
      
      if (result.rows.length === 0) {
        return null;
      }

      const row = result.rows[0];
      
      // Calculate metrics (some estimated from available data)
      return {
        marketCap: row.market_cap || 0,
        peRatio: parseFloat(row.pe_ratio) || 0,
        pbRatio: this.estimatePbRatio(parseFloat(row.pe_ratio)),
        eps: parseFloat(row.eps) || 0,
        roe: this.estimateRoe(parseFloat(row.pe_ratio)),
        roa: this.estimateRoa(parseFloat(row.pe_ratio)),
        dividendYield: parseFloat(row.dividend_yield) || 0,
        debtToEquity: 0.5, // Industry average estimate
        currentRatio: 1.5, // Conservative estimate
        grossMargin: 25, // Industry average estimate
        operatingMargin: 15, // Estimate
        netMargin: 10, // Estimate
        revenueGrowth: 5, // Conservative estimate
        earningsGrowth: 8, // Estimate
        priceToSales: this.estimatePriceToSales(parseFloat(row.pe_ratio)),
        priceToBook: this.estimatePriceToBook(parseFloat(row.pe_ratio)),
        freeCashFlowYield: this.estimateFreeCashFlowYield(row.market_cap, parseFloat(row.price)),
        returnOnInvestment: this.estimateRoi(parseFloat(row.pe_ratio))
      };

    } catch (error) {
      console.error('Error getting company metrics:', error);
      return null;
    }
  }

  private async getIndustryBenchmarks(industry: string): Promise<IndustryBenchmarks> {
    try {
      // In a production system, this would query the industry_stats table
      // For Phase 2, return realistic estimates based on industry type
      const benchmarks = this.getIndustryBenchmarkEstimates(industry);
      
      return {
        industry,
        sampleSize: 25, // Estimated sample size
        metrics: benchmarks,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error getting industry benchmarks:', error);
      throw error;
    }
  }

  private async getSectorBenchmarks(sector: string): Promise<SectorBenchmarks> {
    try {
      // In a production system, this would aggregate data from multiple industries
      const benchmarks = this.getSectorBenchmarkEstimates(sector);
      
      return {
        sector,
        sampleSize: 100, // Estimated sample size
        metrics: benchmarks,
        lastUpdated: new Date()
      };

    } catch (error) {
      console.error('Error getting sector benchmarks:', error);
      throw error;
    }
  }

  private performComparison(
    companyMetrics: CompanyMetrics, 
    industryBenchmarks: IndustryBenchmarks, 
    sectorBenchmarks: SectorBenchmarks
  ): ComparisonResults {
    
    // Calculate percentiles
    const industryPercentile = this.calculatePercentiles(companyMetrics, industryBenchmarks);
    const sectorPercentile = this.calculateSectorPercentiles(companyMetrics, sectorBenchmarks);

    // Identify strengths and weaknesses
    const strengthsVsIndustry = this.identifyStrengths(industryPercentile);
    const weaknessesVsIndustry = this.identifyWeaknesses(industryPercentile);

    // Generate competitive analysis
    const competitiveAdvantages = this.identifyCompetitiveAdvantages(industryPercentile);
    const investmentThesis = this.generateInvestmentThesis(industryPercentile, strengthsVsIndustry);
    const riskFactors = this.identifyRiskFactors(industryPercentile, weaknessesVsIndustry);

    // Calculate overall ratings
    const overallRating = this.calculateOverallRating(industryPercentile);
    const investmentRecommendation = this.generateInvestmentRecommendation(overallRating, industryPercentile);

    return {
      industryPercentile,
      sectorPercentile,
      strengthsVsIndustry,
      weaknessesVsIndustry,
      competitiveAdvantages,
      investmentThesis,
      riskFactors,
      overallRating,
      investmentRecommendation
    };
  }

  private async calculateRankings(
    symbol: string, 
    industry: string, 
    sector: string, 
    metrics: CompanyMetrics
  ): Promise<RankingData> {
    try {
      // In Phase 2, return estimated rankings
      // In production, this would query actual industry data
      
      const industrySize = 25; // Estimated industry size
      const sectorSize = 100; // Estimated sector size

      return {
        industryRank: {
          marketCap: { rank: Math.floor(Math.random() * industrySize) + 1, total: industrySize },
          profitability: { rank: this.estimateRank(metrics.roe, 15, industrySize), total: industrySize },
          valuation: { rank: this.estimateRank(metrics.peRatio, 20, industrySize, true), total: industrySize },
          efficiency: { rank: this.estimateRank(metrics.roa, 8, industrySize), total: industrySize },
          growth: { rank: this.estimateRank(metrics.revenueGrowth, 5, industrySize), total: industrySize }
        },
        sectorRank: {
          overall: { rank: Math.floor(Math.random() * sectorSize) + 1, total: sectorSize },
          profitability: { rank: this.estimateRank(metrics.roe, 12, sectorSize), total: sectorSize },
          valuation: { rank: this.estimateRank(metrics.peRatio, 22, sectorSize, true), total: sectorSize }
        }
      };

    } catch (error) {
      console.error('Error calculating rankings:', error);
      throw error;
    }
  }

  private async getCompetitorAnalysis(industry: string, excludeSymbol: string, limit: number): Promise<CompetitorData[]> {
    try {
      const query = `
        SELECT DISTINCT c.symbol, c.name, sp.market_cap, sp.pe_ratio, sp.dividend_yield
        FROM companies c
        JOIN stock_prices sp ON c.symbol = sp.symbol
        WHERE c.industry = $1 AND c.symbol != $2
        ORDER BY sp.market_cap DESC NULLS LAST
        LIMIT $3
      `;

      const result = await sqliteDb.query(query, [industry, excludeSymbol, limit]);
      
      return result.rows.map((row: any) => ({
        symbol: row.symbol,
        name: row.name,
        marketCap: row.market_cap || 0,
        peRatio: parseFloat(row.pe_ratio) || 0,
        roe: this.estimateRoe(parseFloat(row.pe_ratio) || 0),
        dividendYield: parseFloat(row.dividend_yield) || 0,
        netMargin: 10, // Estimate
        revenueGrowth: 5, // Estimate
        competitivePosition: this.assessCompetitivePosition(row.market_cap, parseFloat(row.pe_ratio)),
        marketShare: Math.random() * 20 + 5 // Random estimate 5-25%
      }));

    } catch (error) {
      console.error('Error getting competitor analysis:', error);
      return [];
    }
  }

  // Helper methods for calculations and estimates

  private estimatePbRatio(peRatio: number): number {
    return peRatio > 0 ? peRatio * 0.3 : 1.5;
  }

  private estimateRoe(peRatio: number): number {
    return peRatio > 0 ? (1 / peRatio) * 100 * 1.2 : 10;
  }

  private estimateRoa(peRatio: number): number {
    return peRatio > 0 ? (1 / peRatio) * 100 * 0.8 : 6;
  }

  private estimatePriceToSales(peRatio: number): number {
    return peRatio > 0 ? peRatio * 0.8 : 2.0;
  }

  private estimatePriceToBook(peRatio: number): number {
    return peRatio > 0 ? peRatio * 0.4 : 1.8;
  }

  private estimateFreeCashFlowYield(marketCap: number, price: number): number {
    return marketCap > 0 ? (marketCap * 0.05) / marketCap * 100 : 5;
  }

  private estimateRoi(peRatio: number): number {
    return peRatio > 0 ? (1 / peRatio) * 100 : 8;
  }

  private getIndustryBenchmarkEstimates(industry: string) {
    // Industry-specific benchmarks (simplified for Phase 2)
    const techBenchmarks = {
      avgMarketCap: 50000000000, medianMarketCap: 15000000000,
      avgPeRatio: 25, medianPeRatio: 22,
      avgPbRatio: 4.5, medianPbRatio: 3.8,
      avgRoe: 18, medianRoe: 16,
      avgDividendYield: 1.2, medianDividendYield: 1.0,
      avgDebtToEquity: 0.3, medianDebtToEquity: 0.25,
      avgGrossMargin: 65, medianGrossMargin: 62,
      avgOperatingMargin: 25, medianOperatingMargin: 22,
      avgNetMargin: 18, medianNetMargin: 16,
      avgRevenueGrowth: 12, medianRevenueGrowth: 10
    };

    const financialBenchmarks = {
      avgMarketCap: 30000000000, medianMarketCap: 8000000000,
      avgPeRatio: 12, medianPeRatio: 11,
      avgPbRatio: 1.2, medianPbRatio: 1.1,
      avgRoe: 12, medianRoe: 11,
      avgDividendYield: 3.5, medianDividendYield: 3.2,
      avgDebtToEquity: 0.8, medianDebtToEquity: 0.7,
      avgGrossMargin: 75, medianGrossMargin: 72,
      avgOperatingMargin: 35, medianOperatingMargin: 32,
      avgNetMargin: 25, medianNetMargin: 22,
      avgRevenueGrowth: 5, medianRevenueGrowth: 4
    };

    // Return appropriate benchmarks based on industry
    if (industry?.toLowerCase().includes('tech') || industry?.toLowerCase().includes('software')) {
      return techBenchmarks;
    } else if (industry?.toLowerCase().includes('bank') || industry?.toLowerCase().includes('financial')) {
      return financialBenchmarks;
    }

    // Default benchmarks
    return {
      avgMarketCap: 20000000000, medianMarketCap: 5000000000,
      avgPeRatio: 18, medianPeRatio: 16,
      avgPbRatio: 2.5, medianPbRatio: 2.2,
      avgRoe: 14, medianRoe: 12,
      avgDividendYield: 2.5, medianDividendYield: 2.2,
      avgDebtToEquity: 0.5, medianDebtToEquity: 0.4,
      avgGrossMargin: 45, medianGrossMargin: 42,
      avgOperatingMargin: 18, medianOperatingMargin: 15,
      avgNetMargin: 12, medianNetMargin: 10,
      avgRevenueGrowth: 7, medianRevenueGrowth: 6
    };
  }

  private getSectorBenchmarkEstimates(sector: string) {
    // Sector-wide averages
    return {
      avgMarketCap: 25000000000,
      avgPeRatio: 20,
      avgRoe: 15,
      avgDividendYield: 2.3,
      avgNetMargin: 13,
      avgRevenueGrowth: 8
    };
  }

  private calculatePercentiles(metrics: CompanyMetrics, benchmarks: IndustryBenchmarks) {
    return {
      marketCap: this.getPercentile(metrics.marketCap, benchmarks.metrics.medianMarketCap),
      peRatio: this.getPercentile(metrics.peRatio, benchmarks.metrics.medianPeRatio, true),
      roe: this.getPercentile(metrics.roe, benchmarks.metrics.medianRoe),
      dividendYield: this.getPercentile(metrics.dividendYield, benchmarks.metrics.medianDividendYield),
      netMargin: this.getPercentile(metrics.netMargin, benchmarks.metrics.medianNetMargin),
      revenueGrowth: this.getPercentile(metrics.revenueGrowth, benchmarks.metrics.medianRevenueGrowth)
    };
  }

  private calculateSectorPercentiles(metrics: CompanyMetrics, benchmarks: SectorBenchmarks) {
    return {
      marketCap: this.getPercentile(metrics.marketCap, benchmarks.metrics.avgMarketCap),
      peRatio: this.getPercentile(metrics.peRatio, benchmarks.metrics.avgPeRatio, true),
      roe: this.getPercentile(metrics.roe, benchmarks.metrics.avgRoe),
      dividendYield: this.getPercentile(metrics.dividendYield, benchmarks.metrics.avgDividendYield),
      netMargin: this.getPercentile(metrics.netMargin, benchmarks.metrics.avgNetMargin)
    };
  }

  private getPercentile(value: number, benchmark: number, lowerIsBetter = false): number {
    if (benchmark === 0) return 50;
    
    const ratio = value / benchmark;
    let percentile: number;

    if (lowerIsBetter) {
      // For metrics like PE ratio where lower is better
      if (ratio <= 0.7) percentile = 90;
      else if (ratio <= 0.85) percentile = 75;
      else if (ratio <= 1.0) percentile = 60;
      else if (ratio <= 1.15) percentile = 40;
      else if (ratio <= 1.3) percentile = 25;
      else percentile = 10;
    } else {
      // For metrics where higher is better
      if (ratio >= 1.3) percentile = 90;
      else if (ratio >= 1.15) percentile = 75;
      else if (ratio >= 1.0) percentile = 60;
      else if (ratio >= 0.85) percentile = 40;
      else if (ratio >= 0.7) percentile = 25;
      else percentile = 10;
    }

    return Math.min(95, Math.max(5, percentile));
  }

  private identifyStrengths(percentiles: { [key: string]: number }): string[] {
    const strengths: string[] = [];
    
    Object.entries(percentiles).forEach(([metric, percentile]) => {
      if (percentile >= 75) {
        strengths.push(`${this.getMetricDisplayName(metric)}が業界上位`);
      }
    });

    return strengths.length > 0 ? strengths : ['安定した事業基盤'];
  }

  private identifyWeaknesses(percentiles: { [key: string]: number }): string[] {
    const weaknesses: string[] = [];
    
    Object.entries(percentiles).forEach(([metric, percentile]) => {
      if (percentile <= 25) {
        weaknesses.push(`${this.getMetricDisplayName(metric)}の改善余地`);
      }
    });

    return weaknesses.length > 0 ? weaknesses : ['大きな弱点は見当たりません'];
  }

  private identifyCompetitiveAdvantages(percentiles: { [key: string]: number }): string[] {
    const advantages: string[] = [];
    
    if (percentiles.netMargin >= 75) {
      advantages.push('高い利益率による価格競争力');
    }
    if (percentiles.roe >= 75) {
      advantages.push('効率的な資本活用');
    }
    if (percentiles.revenueGrowth >= 75) {
      advantages.push('市場シェア拡大の実績');
    }

    return advantages.length > 0 ? advantages : ['業界標準的な競争力'];
  }

  private generateInvestmentThesis(percentiles: { [key: string]: number }, strengths: string[]): string[] {
    const thesis: string[] = [];
    
    const avgPercentile = Object.values(percentiles).reduce((sum, p) => sum + p, 0) / Object.values(percentiles).length;
    
    if (avgPercentile >= 70) {
      thesis.push('業界リーダー企業として長期成長が期待される');
    } else if (avgPercentile >= 50) {
      thesis.push('安定した業績基盤を持つ中核企業');
    } else {
      thesis.push('改善ポテンシャルを持つ企業');
    }

    if (strengths.length >= 3) {
      thesis.push('複数の競争優位性を保有');
    }

    thesis.push('業界動向と個別企業分析の継続監視が重要');

    return thesis;
  }

  private identifyRiskFactors(percentiles: { [key: string]: number }, weaknesses: string[]): string[] {
    const risks: string[] = [];
    
    if (percentiles.peRatio <= 25) {
      risks.push('割安感の背景にある事業リスクに注意');
    }
    if (percentiles.revenueGrowth <= 25) {
      risks.push('成長性の鈍化による競争力低下リスク');
    }
    if (weaknesses.length >= 3) {
      risks.push('複数の財務指標における競合劣位');
    }

    risks.push('業界全体の市場環境変化リスク');
    risks.push('競合他社の戦略変更による影響');

    return risks;
  }

  private calculateOverallRating(percentiles: { [key: string]: number }): 'Industry Leader' | 'Above Average' | 'Average' | 'Below Average' | 'Laggard' {
    const avgPercentile = Object.values(percentiles).reduce((sum, p) => sum + p, 0) / Object.values(percentiles).length;
    
    if (avgPercentile >= 80) return 'Industry Leader';
    if (avgPercentile >= 65) return 'Above Average';
    if (avgPercentile >= 45) return 'Average';
    if (avgPercentile >= 30) return 'Below Average';
    return 'Laggard';
  }

  private generateInvestmentRecommendation(rating: string, percentiles: { [key: string]: number }): 'Strong Buy' | 'Buy' | 'Hold' | 'Sell' | 'Strong Sell' {
    const avgPercentile = Object.values(percentiles).reduce((sum, p) => sum + p, 0) / Object.values(percentiles).length;
    
    if (rating === 'Industry Leader' && avgPercentile >= 80) return 'Strong Buy';
    if (rating === 'Above Average' || (rating === 'Industry Leader' && avgPercentile >= 70)) return 'Buy';
    if (rating === 'Average' || (rating === 'Above Average' && avgPercentile >= 50)) return 'Hold';
    if (rating === 'Below Average') return 'Sell';
    return 'Strong Sell';
  }

  private estimateRank(value: number, benchmark: number, totalSize: number, lowerIsBetter = false): number {
    const ratio = value / benchmark;
    let percentile: number;
    
    if (lowerIsBetter) {
      if (ratio <= 0.8) percentile = 0.9;
      else if (ratio <= 1.0) percentile = 0.7;
      else if (ratio <= 1.2) percentile = 0.5;
      else percentile = 0.3;
    } else {
      if (ratio >= 1.2) percentile = 0.9;
      else if (ratio >= 1.0) percentile = 0.7;
      else if (ratio >= 0.8) percentile = 0.5;
      else percentile = 0.3;
    }
    
    return Math.max(1, Math.ceil(totalSize * (1 - percentile)));
  }

  private assessCompetitivePosition(marketCap: number, peRatio: number): 'Strong' | 'Moderate' | 'Weak' {
    if (marketCap > 10000000000 && peRatio > 0 && peRatio < 25) return 'Strong';
    if (marketCap > 1000000000 && peRatio > 0 && peRatio < 30) return 'Moderate';
    return 'Weak';
  }

  private getMetricDisplayName(metric: string): string {
    const names: { [key: string]: string } = {
      marketCap: '時価総額',
      peRatio: 'PER',
      roe: 'ROE',
      dividendYield: '配当利回り',
      netMargin: '純利益率',
      revenueGrowth: '売上成長率'
    };
    return names[metric] || metric;
  }
}

export const industryComparisonService = new IndustryComparisonService();