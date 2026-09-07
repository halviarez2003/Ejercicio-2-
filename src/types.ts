export interface StockMetadata {
  ticker: string;
  name: string;
  sector: string;
  color: string;
}

export interface HistoricalPriceRow {
  date: string; // YYYY-MM-DD
  [ticker: string]: number | string; // Adjusted close prices
}

export interface AssetStats {
  ticker: string;
  name: string;
  color: string;
  count: number;
  initialPrice: number;
  latestPrice: number;
  cumulativeReturn: number; // in %
  meanDailyReturn: number;  // arithmetic simple mean
  annualizedReturn: number; // in % (252 days)
  dailyVolatility: number;  // std dev
  annualizedVolatility: number; // in % (daily * sqrt(252))
  sharpeRatio: number;
}

export interface ProcessedMarketData {
  tickers: string[];
  dates: string[];
  prices: Record<string, number[]>; // ticker -> array of aligned Adjusted Close prices
  returns: Record<string, number[]>; // ticker -> array of simple returns: (P_t / P_{t-1}) - 1
  cumulativeReturns: Record<string, number[]>; // ticker -> array of prod(1 + R) - 1
  meanDailyReturns: number[]; // vector of mean daily simple returns
  annualizedReturns: number[]; // vector of annualized returns (252 days)
  dailyCovarianceMatrix: number[][]; // N x N
  annualizedCovarianceMatrix: number[][]; // N x N (daily * 252)
  correlationMatrix: number[][]; // N x N
  assetStats: AssetStats[];
}

export interface PortfolioPoint {
  weights: number[];
  expectedReturn: number; // annualized %
  volatility: number;     // annualized %
  sharpeRatio: number;
  label?: string;
  isOptimal?: boolean;
  type?: 'tangency' | 'min_variance' | 'equal_weight' | 'random' | 'frontier' | 'individual' | 'custom';
}

export interface OptimizationResults {
  maxSharpePortfolio: PortfolioPoint;
  minVariancePortfolio: PortfolioPoint;
  equalWeightPortfolio: PortfolioPoint;
  efficientFrontier: PortfolioPoint[];
  randomPortfolios: PortfolioPoint[];
  riskFreeRate: number; // in %
}

export type ActiveModuleTab = 'data_ingestion' | 'data_processing' | 'optimization' | 'full_dashboard';
