import { StockMetadata } from '../types';

export const POPULAR_TICKERS: StockMetadata[] = [
  { ticker: 'SPY', name: 'SPDR S&P 500 ETF Trust', sector: 'Índice General', color: '#38bdf8' },
  { ticker: 'QQQ', name: 'Invesco QQQ (Nasdaq-100)', sector: 'Tecnología / Índice', color: '#818cf8' },
  { ticker: 'AAPL', name: 'Apple Inc.', sector: 'Tecnología', color: '#a78bfa' },
  { ticker: 'MSFT', name: 'Microsoft Corporation', sector: 'Software y Nube', color: '#0ea5e9' },
  { ticker: 'NVDA', name: 'NVIDIA Corporation', sector: 'Semiconductores / IA', color: '#10b981' },
  { ticker: 'AMZN', name: 'Amazon.com, Inc.', sector: 'Consumo / Cloud', color: '#f59e0b' },
  { ticker: 'GOOGL', name: 'Alphabet Inc.', sector: 'Servicios de Comunicación', color: '#ec4899' },
  { ticker: 'TSLA', name: 'Tesla, Inc.', sector: 'Automotriz / Energía', color: '#ef4444' },
  { ticker: 'JPM', name: 'JPMorgan Chase & Co.', sector: 'Finanzas / Banca', color: '#06b6d4' },
  { ticker: 'JNJ', name: 'Johnson & Johnson', sector: 'Salud / Farmacia', color: '#f43f5e' },
  { ticker: 'XOM', name: 'Exxon Mobil Corporation', sector: 'Energía / Petróleo', color: '#d97706' },
  { ticker: 'GLD', name: 'SPDR Gold Shares', sector: 'Commodities / Oro', color: '#eab308' },
  { ticker: 'TLT', name: 'iShares 20+ Year Treasury', sector: 'Bonos del Tesoro', color: '#6366f1' },
];

/**
 * Generates an extensive, highly realistic daily historical series of Adjusted Close prices
 * from 2022-01-03 to 2026-03-06 (approx 1,050 trading days) using empirical volatility,
 * drifts, correlations, and authentic market turning points (2022 bear market, 2023-2025 rally).
 */
function generateHistoricalDataset() {
  const dates: string[] = [];
  const tickers = POPULAR_TICKERS.map(t => t.ticker);
  
  // Starting Adjusted Close prices as of early 2022
  const currentPrices: Record<string, number> = {
    SPY: 477.50,
    QQQ: 398.20,
    AAPL: 182.01,
    MSFT: 334.75,
    NVDA: 301.21,
    AMZN: 170.40,
    GOOGL: 145.00,
    TSLA: 399.93,
    JPM: 161.70,
    JNJ: 171.07,
    XOM: 63.50,
    GLD: 169.50,
    TLT: 143.20,
  };

  // Empirical annualized parameters: [drift, volatility, marketBeta]
  const assetProfile: Record<string, { mu: number; sigma: number; beta: number }> = {
    SPY: { mu: 0.12, sigma: 0.16, beta: 1.0 },
    QQQ: { mu: 0.16, sigma: 0.22, beta: 1.25 },
    AAPL: { mu: 0.18, sigma: 0.24, beta: 1.15 },
    MSFT: { mu: 0.17, sigma: 0.23, beta: 1.10 },
    NVDA: { mu: 0.42, sigma: 0.45, beta: 1.90 },
    AMZN: { mu: 0.14, sigma: 0.30, beta: 1.30 },
    GOOGL: { mu: 0.13, sigma: 0.27, beta: 1.20 },
    TSLA: { mu: 0.15, sigma: 0.52, beta: 1.80 },
    JPM: { mu: 0.15, sigma: 0.21, beta: 0.95 },
    JNJ: { mu: 0.05, sigma: 0.14, beta: 0.50 },
    XOM: { mu: 0.20, sigma: 0.25, beta: 0.70 },
    GLD: { mu: 0.10, sigma: 0.14, beta: 0.10 },
    TLT: { mu: -0.04, sigma: 0.16, beta: -0.25 },
  };

  // Build calendar of business days (Monday to Friday)
  const startDate = new Date(2022, 0, 3);
  const endDate = new Date(2026, 2, 6);
  const dt = 1 / 252;
  const sqrtDt = Math.sqrt(dt);

  // Pre-seed pseudo-random generator with fixed seed for determinism & reproducibility
  let seed = 42891;
  function pseudoRandom() {
    seed = (seed * 9301 + 49297) % 233280;
    return seed / 233280;
  }

  function standardNormal() {
    let u = 0, v = 0;
    while (u === 0) u = pseudoRandom();
    while (v === 0) v = pseudoRandom();
    return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
  }

  const rawRows: Record<string, number>[] = [];
  const dateStrings: string[] = [];

  const curDate = new Date(startDate);
  while (curDate <= endDate) {
    const dayOfWeek = curDate.getDay();
    if (dayOfWeek !== 0 && dayOfWeek !== 6) {
      // It's a weekday
      const yyyy = curDate.getFullYear();
      const mm = String(curDate.getMonth() + 1).padStart(2, '0');
      const dd = String(curDate.getDate()).padStart(2, '0');
      const dateStr = `${yyyy}-${mm}-${dd}`;
      dateStrings.push(dateStr);

      // Common market factor shock (systematic risk)
      const zMarket = standardNormal();

      // Market regime adjustment (2022 downturn, 2023-2024 expansion, 2025-2026 consolidation)
      let regimeDrift = 0;
      if (yyyy === 2022) regimeDrift = -0.18; // 2022 Bear Market
      else if (yyyy === 2023) regimeDrift = 0.20; // 2023 Recovery
      else if (yyyy === 2024) regimeDrift = 0.22; // 2024 AI Boom
      else regimeDrift = 0.12;

      const row: Record<string, number> = {};

      for (const ticker of tickers) {
        const prof = assetProfile[ticker];
        // Asset specific shock (idiosyncratic risk)
        const zIdio = standardNormal();
        const rho = Math.min(0.9, Math.max(-0.6, prof.beta * 0.7));
        const combinedZ = rho * zMarket + Math.sqrt(Math.max(0, 1 - rho * rho)) * zIdio;

        const effectiveMu = prof.mu + regimeDrift * (prof.beta > 0 ? 0.8 : -0.3);
        const dailyReturn = (effectiveMu - 0.5 * prof.sigma * prof.sigma) * dt + prof.sigma * sqrtDt * combinedZ;

        currentPrices[ticker] = Math.max(0.5, currentPrices[ticker] * Math.exp(dailyReturn));
        row[ticker] = Number(currentPrices[ticker].toFixed(2));
      }

      rawRows.push(row);
    }
    curDate.setDate(curDate.getDate() + 1);
  }

  return {
    dates: dateStrings,
    rows: rawRows,
  };
}

export const INITIAL_MARKET_DATABASE = generateHistoricalDataset();
