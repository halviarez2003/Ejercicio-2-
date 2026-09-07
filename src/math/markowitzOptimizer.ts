import { PortfolioPoint, OptimizationResults } from '../types';
import {
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
  calculatePortfolioSharpe,
} from './statisticsEngine';

/**
 * Exact Euclidean Projection onto the Probability Simplex:
 * \min_w \frac{1}{2} ||w - v||_2^2 subject to \sum w_i = 1, w_i >= 0
 * Algorithm by Duchi et al. (2008) / Wang et al. (2013)
 */
export function projectOntoSimplex(v: number[]): number[] {
  const n = v.length;
  if (n === 1) return [1.0];

  // Sort v in descending order
  const u = [...v].sort((a, b) => b - a);

  let cssv = 0;
  let rho = 0;

  for (let i = 0; i < n; i++) {
    cssv += u[i];
    const cond = u[i] - (cssv - 1.0) / (i + 1);
    if (cond > 0) {
      rho = i;
    }
  }

  let thetaSum = 0;
  for (let i = 0; i <= rho; i++) {
    thetaSum += u[i];
  }
  const theta = (thetaSum - 1.0) / (rho + 1);

  const w = new Array(n);
  let totalW = 0;
  for (let i = 0; i < n; i++) {
    const val = Math.max(0, v[i] - theta);
    w[i] = val;
    totalW += val;
  }

  // Normalize for slight floating point precision
  if (totalW > 0) {
    for (let i = 0; i < n; i++) {
      w[i] /= totalW;
    }
  } else {
    w.fill(1.0 / n);
  }

  return w;
}

/**
 * Computes gradient of portfolio variance: \nabla (w^T \Sigma w) = 2 \Sigma w
 */
function gradientVariance(w: number[], Sigma: number[][]): number[] {
  const n = w.length;
  const grad = new Array(n).fill(0);
  for (let i = 0; i < n; i++) {
    let sum = 0;
    for (let j = 0; j < n; j++) {
      sum += Sigma[i][j] * w[j];
    }
    grad[i] = 2 * sum;
  }
  return grad;
}

/**
 * Solves the Global Minimum Variance Portfolio (GMVP)
 * \min_w w^T \Sigma w subject to \sum w_i = 1, w_i >= 0
 */
export function solveMinVariancePortfolio(
  annualizedReturns: number[],
  Sigma: number[][],
  riskFreeRatePercent: number
): PortfolioPoint {
  const n = annualizedReturns.length;
  if (n === 0) throw new Error('No assets provided');
  if (n === 1) {
    const ret = annualizedReturns[0] * 100;
    const vol = Math.sqrt(Sigma[0][0]) * 100;
    return {
      weights: [1.0],
      expectedReturn: ret,
      volatility: vol,
      sharpeRatio: calculatePortfolioSharpe(ret, vol, riskFreeRatePercent),
      label: 'Mínima Varianza Global',
      type: 'min_variance',
      isOptimal: true,
    };
  }

  // Initialize with Equal Weight
  let w = new Array(n).fill(1.0 / n);
  let stepSize = 0.05;
  const maxIter = 500;
  const tol = 1e-7;

  let prevLoss = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    const grad = gradientVariance(w, Sigma);

    // Projected gradient step
    const v = new Array(n);
    for (let i = 0; i < n; i++) {
      v[i] = w[i] - stepSize * grad[i];
    }
    const nextW = projectOntoSimplex(v);

    // Compute variance loss
    let currentVariance = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        currentVariance += nextW[i] * nextW[j] * Sigma[i][j];
      }
    }

    if (Math.abs(prevLoss - currentVariance) < tol) {
      w = nextW;
      break;
    }

    // Adaptive step size adjustment
    if (currentVariance > prevLoss && iter > 5) {
      stepSize *= 0.5;
    }

    prevLoss = currentVariance;
    w = nextW;
  }

  const pRet = calculatePortfolioReturn(w, annualizedReturns) * 100;
  const pVol = calculatePortfolioVolatility(w, Sigma) * 100;
  const sharpe = calculatePortfolioSharpe(pRet, pVol, riskFreeRatePercent);

  return {
    weights: w,
    expectedReturn: pRet,
    volatility: pVol,
    sharpeRatio: sharpe,
    label: 'Mínima Varianza Global',
    type: 'min_variance',
    isOptimal: true,
  };
}

/**
 * Solves the Maximum Sharpe Ratio (Tangency) Portfolio:
 * \max_w \frac{w^T \mu - R_f}{\sqrt{w^T \Sigma w}} subject to \sum w_i = 1, w_i >= 0
 * Uses a Projected Gradient solver with backtracking linesearch on the negative Sharpe Ratio.
 */
export function solveMaxSharpePortfolio(
  annualizedReturns: number[],
  Sigma: number[][],
  riskFreeRatePercent: number
): PortfolioPoint {
  const n = annualizedReturns.length;
  const rfDecimal = riskFreeRatePercent / 100;

  if (n === 1) {
    const ret = annualizedReturns[0] * 100;
    const vol = Math.sqrt(Sigma[0][0]) * 100;
    return {
      weights: [1.0],
      expectedReturn: ret,
      volatility: vol,
      sharpeRatio: calculatePortfolioSharpe(ret, vol, riskFreeRatePercent),
      label: 'Máximo Ratio de Sharpe',
      type: 'tangency',
      isOptimal: true,
    };
  }

  // Objective evaluation
  const evaluateNegativeSharpe = (weights: number[]) => {
    let ret = 0;
    for (let i = 0; i < n; i++) ret += weights[i] * annualizedReturns[i];
    const excess = ret - rfDecimal;

    let varP = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        varP += weights[i] * weights[j] * Sigma[i][j];
      }
    }
    const vol = Math.sqrt(Math.max(1e-8, varP));
    return -excess / vol;
  };

  // Numerical gradient of negative Sharpe
  const computeGradNegSharpe = (weights: number[]) => {
    const grad = new Array(n);
    const eps = 1e-5;
    const baseVal = evaluateNegativeSharpe(weights);

    for (let i = 0; i < n; i++) {
      const perturbed = [...weights];
      perturbed[i] += eps;
      const normPerturbed = projectOntoSimplex(perturbed);
      const valPerturbed = evaluateNegativeSharpe(normPerturbed);
      grad[i] = (valPerturbed - baseVal) / eps;
    }
    return grad;
  };

  // Multiple initializations for multi-start robustness
  let bestWeights = new Array(n).fill(1.0 / n);
  let bestSharpe = -evaluateNegativeSharpe(bestWeights);

  const initialCandidates: number[][] = [
    new Array(n).fill(1.0 / n), // Equal Weight
  ];
  // Add individual asset weight vectors as candidates
  for (let i = 0; i < n; i++) {
    const wInd = new Array(n).fill(0);
    wInd[i] = 1.0;
    initialCandidates.push(wInd);
  }

  for (const initW of initialCandidates) {
    let w = [...initW];
    let stepSize = 0.1;
    const maxIter = 300;

    for (let iter = 0; iter < maxIter; iter++) {
      const grad = computeGradNegSharpe(w);

      const v = new Array(n);
      for (let i = 0; i < n; i++) {
        v[i] = w[i] - stepSize * grad[i];
      }
      const nextW = projectOntoSimplex(v);

      const nextLoss = evaluateNegativeSharpe(nextW);
      const currentLoss = evaluateNegativeSharpe(w);

      if (nextLoss < currentLoss) {
        w = nextW;
        if (Math.abs(currentLoss - nextLoss) < 1e-7) break;
      } else {
        stepSize *= 0.5;
        if (stepSize < 1e-6) break;
      }
    }

    const currentSR = -evaluateNegativeSharpe(w);
    if (currentSR > bestSharpe) {
      bestSharpe = currentSR;
      bestWeights = w;
    }
  }

  const pRet = calculatePortfolioReturn(bestWeights, annualizedReturns) * 100;
  const pVol = calculatePortfolioVolatility(bestWeights, Sigma) * 100;
  const sharpe = calculatePortfolioSharpe(pRet, pVol, riskFreeRatePercent);

  return {
    weights: bestWeights,
    expectedReturn: pRet,
    volatility: pVol,
    sharpeRatio: sharpe,
    label: 'Máximo Ratio de Sharpe (Tangente)',
    type: 'tangency',
    isOptimal: true,
  };
}

/**
 * Solves Quadratic Problem for a given risk-tolerance parameter lambda:
 * \min_w \frac{1}{2} w^T \Sigma w - \lambda w^T \mu subject to \sum w_i = 1, w_i >= 0
 */
export function solveParametricPortfolio(
  annualizedReturns: number[],
  Sigma: number[][],
  lambda: number,
  riskFreeRatePercent: number
): PortfolioPoint {
  const n = annualizedReturns.length;
  let w = new Array(n).fill(1.0 / n);
  let stepSize = 0.05;
  const maxIter = 300;
  const tol = 1e-7;

  let prevLoss = Infinity;

  for (let iter = 0; iter < maxIter; iter++) {
    // Gradient: \Sigma w - \lambda \mu
    const grad = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      let s = 0;
      for (let j = 0; j < n; j++) {
        s += Sigma[i][j] * w[j];
      }
      grad[i] = s - lambda * annualizedReturns[i];
    }

    const v = new Array(n);
    for (let i = 0; i < n; i++) {
      v[i] = w[i] - stepSize * grad[i];
    }
    const nextW = projectOntoSimplex(v);

    let loss = 0;
    for (let i = 0; i < n; i++) {
      for (let j = 0; j < n; j++) {
        loss += 0.5 * nextW[i] * nextW[j] * Sigma[i][j];
      }
      loss -= lambda * nextW[i] * annualizedReturns[i];
    }

    if (Math.abs(prevLoss - loss) < tol) {
      w = nextW;
      break;
    }

    if (loss > prevLoss && iter > 5) {
      stepSize *= 0.5;
    }
    prevLoss = loss;
    w = nextW;
  }

  const pRet = calculatePortfolioReturn(w, annualizedReturns) * 100;
  const pVol = calculatePortfolioVolatility(w, Sigma) * 100;
  const sharpe = calculatePortfolioSharpe(pRet, pVol, riskFreeRatePercent);

  return {
    weights: w,
    expectedReturn: pRet,
    volatility: pVol,
    sharpeRatio: sharpe,
    type: 'frontier',
  };
}

/**
 * Generates the Markowitz Efficient Frontier curve (50 points from GMVP upwards)
 */
export function generateEfficientFrontier(
  annualizedReturns: number[],
  Sigma: number[][],
  riskFreeRatePercent: number,
  pointsCount: number = 40
): PortfolioPoint[] {
  const points: PortfolioPoint[] = [];
  
  // Lambda parameter sweep: from 0 (Minimum Variance) to higher risk tolerance
  const lambdaMin = 0.0;
  const lambdaMax = 2.5;

  for (let i = 0; i < pointsCount; i++) {
    // Non-linear spacing to capture curvature near GMVP
    const t = i / (pointsCount - 1);
    const lambda = lambdaMin + Math.pow(t, 1.8) * (lambdaMax - lambdaMin);
    const pt = solveParametricPortfolio(annualizedReturns, Sigma, lambda, riskFreeRatePercent);
    points.push(pt);
  }

  // Sort by volatility ascending
  points.sort((a, b) => a.volatility - b.volatility);

  // Filter out any strictly dominated points (lower return for higher volatility)
  const filtered: PortfolioPoint[] = [];
  let maxRetSoFar = -Infinity;

  for (const pt of points) {
    if (pt.expectedReturn >= maxRetSoFar) {
      filtered.push(pt);
      maxRetSoFar = pt.expectedReturn;
    }
  }

  return filtered.length >= 5 ? filtered : points;
}

/**
 * Generates a uniform random Dirichlet cloud of portfolios on the simplex for Monte Carlo visualization
 */
export function generateRandomPortfolios(
  annualizedReturns: number[],
  Sigma: number[][],
  riskFreeRatePercent: number,
  count: number = 2500
): PortfolioPoint[] {
  const n = annualizedReturns.length;
  const portfolios: PortfolioPoint[] = [];

  for (let p = 0; p < count; p++) {
    // Generate exponential random variables for Dirichlet(1, 1, ..., 1)
    const raw = new Array(n);
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const u = Math.random();
      const val = -Math.log(Math.max(1e-10, u));
      raw[i] = val;
      sum += val;
    }

    const weights = new Array(n);
    for (let i = 0; i < n; i++) {
      weights[i] = raw[i] / sum;
    }

    const pRet = calculatePortfolioReturn(weights, annualizedReturns) * 100;
    const pVol = calculatePortfolioVolatility(weights, Sigma) * 100;
    const sharpe = calculatePortfolioSharpe(pRet, pVol, riskFreeRatePercent);

    portfolios.push({
      weights,
      expectedReturn: pRet,
      volatility: pVol,
      sharpeRatio: sharpe,
      type: 'random',
    });
  }

  return portfolios;
}

/**
 * Calculates Equal Weight (1/N) Benchmark Portfolio
 */
export function calculateEqualWeightPortfolio(
  annualizedReturns: number[],
  Sigma: number[][],
  riskFreeRatePercent: number
): PortfolioPoint {
  const n = annualizedReturns.length;
  const w = new Array(n).fill(1.0 / n);
  const pRet = calculatePortfolioReturn(w, annualizedReturns) * 100;
  const pVol = calculatePortfolioVolatility(w, Sigma) * 100;
  const sharpe = calculatePortfolioSharpe(pRet, pVol, riskFreeRatePercent);

  return {
    weights: w,
    expectedReturn: pRet,
    volatility: pVol,
    sharpeRatio: sharpe,
    label: 'Portafolio Equitativo (1/N)',
    type: 'equal_weight',
  };
}

/**
 * Orchestrates complete Markowitz Optimization
 */
export function runMarkowitzOptimization(
  annualizedReturns: number[],
  Sigma: number[][],
  riskFreeRatePercent: number
): OptimizationResults {
  const minVariancePortfolio = solveMinVariancePortfolio(annualizedReturns, Sigma, riskFreeRatePercent);
  const maxSharpePortfolio = solveMaxSharpePortfolio(annualizedReturns, Sigma, riskFreeRatePercent);
  const equalWeightPortfolio = calculateEqualWeightPortfolio(annualizedReturns, Sigma, riskFreeRatePercent);
  const efficientFrontier = generateEfficientFrontier(annualizedReturns, Sigma, riskFreeRatePercent, 45);
  const randomPortfolios = generateRandomPortfolios(annualizedReturns, Sigma, riskFreeRatePercent, 2200);

  return {
    minVariancePortfolio,
    maxSharpePortfolio,
    equalWeightPortfolio,
    efficientFrontier,
    randomPortfolios,
    riskFreeRate: riskFreeRatePercent,
  };
}
