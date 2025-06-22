export interface Company {
  symbol: string;
  name: string;
  industry: string;
  sector: string;
  country: string;
  marketCap: number;
}

export interface FinancialData {
  symbol: string;
  price: number;
  previousClose: number;
  change: number;
  changePercent: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number;
  eps: number;
  dividendYield: number;
  week52High: number;
  week52Low: number;
}

export interface FinancialMetrics {
  symbol: string;
  per: number;
  pbr: number;
  eps: number;
  roe: number;
  roa: number;
  dividendYield: number;
  debtToEquity: number;
  currentRatio: number;
  quickRatio: number;
}

export interface InvestmentJudgment {
  symbol: string;
  recommendation: 'BUY' | 'SELL' | 'HOLD';
  confidence: number;
  targetPrice: number;
  currentPrice: number;
  reasons: string[];
  risks: string[];
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}