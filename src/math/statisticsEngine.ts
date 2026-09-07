import { ProcessedMarketData, AssetStats } from '../types';
import { POPULAR_TICKERS } from '../data/defaultStockData';

export const TRADING_DAYS_PER_YEAR = 252;

/**
 * Calculates simple arithmetic returns: R_t = (P_t / P_{t-1}) - 1
 */
export function calculateSimpleReturns(prices: number[]): number[] {
  const returns: number[] = [];
  for (let i = 1; i < prices.length; i++) {
    const prev = prices[i - 1];
    const curr = prices[i];
    if (prev <= 0) {
      returns.push(0);
    } else {
      returns.push(curr / prev - 1);
    }
  }
  return returns;
}

/**
 * Calculates cumulative returns using geometric compounding of simple returns:
 * CumReturn_t = \prod_{s=1}^t (1 + R_s) - 1
 */
export function calculateCumulativeReturns(simpleReturns: number[]): number[] {
  const cumulative: number[] = [0]; // at t=0, cumulative return is 0
  let compounded = 1.0;
  for (let i = 0; i < simpleReturns.length; i++) {
    compounded *= 1 + simpleReturns[i];
    cumulative.push(compounded - 1);
  }
  return cumulative;
}

/**
 * Sample mean of an array
 */
export function calculateMean(values: number[]): number {
  if (values.length === 0) return 0;
  let sum = 0;
  for (let i = 0; i < values.length; i++) sum += values[i];
  return sum / values.length;
}

/**
 * Sample standard deviation with Bessel's correction (N - 1)
 */
export function calculateSampleStdDev(values: number[], mean?: number): number {
  if (values.length <= 1) return 0;
  const m = mean !== undefined ? mean : calculateMean(values);
  let sumSq = 0;
  for (let i = 0; i < values.length; i++) {
    const diff = values[i] - m;
    sumSq += diff * diff;
  }
  return Math.sqrt(sumSq / (values.length - 1));
}

/**
 * Sample covariance between two series with Bessel's correction (N - 1)
 */
export function calculateSampleCovariance(
  seriesA: number[],
  seriesB: number[],
  meanA?: number,
  meanB?: number
): number {
  const len = Math.min(seriesA.length, seriesB.length);
  if (len <= 1) return 0;

  const mA = meanA !== undefined ? meanA : calculateMean(seriesA);
  const mB = meanB !== undefined ? meanB : calculateMean(seriesB);

  let sumProd = 0;
  for (let i = 0; i < len; i++) {
    sumProd += (seriesA[i] - mA) * (seriesB[i] - mB);
  }
  return sumProd / (len - 1);
}

/**
 * Comprehensive Processing of Market Data:
 * Computes simple returns, geometric cumulative returns, descriptive statistics,
 * annualization (252 days), sample covariance matrix and correlation matrix.
 */
export function processMarketData(
  tickers: string[],
  dates: string[],
  prices: Record<string, number[]>,
  riskFreeRatePercent: number = 4.0
): ProcessedMarketData {
  const returns: Record<string, number[]> = {};
  const cumulativeReturns: Record<string, number[]> = {};
  const meanDailyReturns: number[] = [];
  const annualizedReturns: number[] = [];
  const dailyVolatilities: number[] = [];
  const annualizedVolatilities: number[] = [];
  const assetStats: AssetStats[] = [];

  const rfDecimal = riskFreeRatePercent / 100;

  // 1. Calculate Simple Returns and Cumulative Returns for each asset
  for (let i = 0; i < tickers.length; i++) {
    const ticker = tickers[i];
    const pSeries = prices[ticker] || [];
    const rSeries = calculateSimpleReturns(pSeries);
    const cSeries = calculateCumulativeReturns(rSeries);

    returns[ticker] = rSeries;
    cumulativeReturns[ticker] = cSeries;

    const meanDaily = calculateMean(rSeries);
    const dailyStd = calculateSampleStdDev(rSeries, meanDaily);

    // Annualization: Mean * 252 and StdDev * sqrt(252)
    const annReturn = meanDaily * TRADING_DAYS_PER_YEAR;
    const annVolatility = dailyStd * Math.sqrt(TRADING_DAYS_PER_YEAR);

    meanDailyReturns.push(meanDaily);
    annualizedReturns.push(annReturn);
    dailyVolatilities.push(dailyStd);
    annualizedVolatilities.push(annVolatility);

    const meta = POPULAR_TICKERS.find((t) => t.ticker === ticker);
    const initialPrice = pSeries.length > 0 ? pSeries[0] : 0;
    const latestPrice = pSeries.length > 0 ? pSeries[pSeries.length - 1] : 0;
    const totalCumReturn = cSeries.length > 0 ? cSeries[cSeries.length - 1] * 100 : 0;
    const sharpe = annVolatility > 1e-6 ? (annReturn - rfDecimal) / annVolatility : 0;

    assetStats.push({
      ticker,
      name: meta ? meta.name : ticker,
      color: meta ? meta.color : '#94a3b8',
      count: rSeries.length,
      initialPrice,
      latestPrice,
      cumulativeReturn: totalCumReturn,
      meanDailyReturn: meanDaily,
      annualizedReturn: annReturn * 100, // as percentage
      dailyVolatility: dailyStd,
      annualizedVolatility: annVolatility * 100, // as percentage
      sharpeRatio: sharpe,
    });
  }

  // 2. Build Daily and Annualized Sample Covariance Matrix (N x N)
  const N = tickers.length;
  const dailyCovarianceMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const annualizedCovarianceMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));
  const correlationMatrix: number[][] = Array.from({ length: N }, () => new Array(N).fill(0));

  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      if (i === j) {
        const varDaily = dailyVolatilities[i] * dailyVolatilities[i];
        dailyCovarianceMatrix[i][j] = varDaily;
        annualizedCovarianceMatrix[i][j] = varDaily * TRADING_DAYS_PER_YEAR;
        correlationMatrix[i][j] = 1.0;
      } else if (i < j) {
        const covDaily = calculateSampleCovariance(
          returns[tickers[i]],
          returns[tickers[j]],
          meanDailyReturns[i],
          meanDailyReturns[j]
        );
        const covAnnual = covDaily * TRADING_DAYS_PER_YEAR;

        dailyCovarianceMatrix[i][j] = covDaily;
        dailyCovarianceMatrix[j][i] = covDaily;

        annualizedCovarianceMatrix[i][j] = covAnnual;
        annualizedCovarianceMatrix[j][i] = covAnnual;

        const denom = dailyVolatilities[i] * dailyVolatilities[j];
        const corr = denom > 1e-12 ? covDaily / denom : 0;
        const clampedCorr = Math.max(-1.0, Math.min(1.0, corr));

        correlationMatrix[i][j] = clampedCorr;
        correlationMatrix[j][i] = clampedCorr;
      }
    }
  }

  return {
    tickers,
    dates,
    prices,
    returns,
    cumulativeReturns,
    meanDailyReturns,
    annualizedReturns,
    dailyCovarianceMatrix,
    annualizedCovarianceMatrix,
    correlationMatrix,
    assetStats,
  };
}

/**
 * Calculates Portfolio Expected Return (annualized %)
 * R_p = w^T * \mu
 */
export function calculatePortfolioReturn(weights: number[], annualizedReturns: number[]): number {
  let ret = 0;
  for (let i = 0; i < weights.length; i++) {
    ret += weights[i] * annualizedReturns[i];
  }
  return ret;
}

/**
 * Calculates Portfolio Volatility (annualized %)
 * \sigma_p = \sqrt{w^T * \Sigma * w}
 */
export function calculatePortfolioVolatility(
  weights: number[],
  annualizedCovarianceMatrix: number[][]
): number {
  const N = weights.length;
  let variance = 0;
  for (let i = 0; i < N; i++) {
    for (let j = 0; j < N; j++) {
      variance += weights[i] * weights[j] * annualizedCovarianceMatrix[i][j];
    }
  }
  return Math.sqrt(Math.max(0, variance));
}

/**
 * Calculates Portfolio Sharpe Ratio: (R_p - R_f) / \sigma_p
 */
export function calculatePortfolioSharpe(
  pReturn: number,
  pVolatility: number,
  rfPercent: number
): number {
  if (pVolatility <= 1e-6) return 0;
  return (pReturn - rfPercent) / pVolatility;
}
