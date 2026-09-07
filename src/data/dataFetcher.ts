import * as XLSX from 'xlsx';
import { INITIAL_MARKET_DATABASE, POPULAR_TICKERS } from './defaultStockData';

export interface IngestionOptions {
  selectedTickers: string[];
  startDate?: string;
  endDate?: string;
  customData?: {
    dates: string[];
    rows: Record<string, number>[];
    tickers: string[];
  } | null;
}

export interface AlignedDataResult {
  tickers: string[];
  dates: string[];
  prices: Record<string, number[]>; // Ticker -> array of Adjusted Close prices
  warnings: string[];
}

/**
 * Filter, align and validate historical Adjusted Close prices for the selected tickers.
 * Resolves dates, ensures chronological ordering, drops nulls, and aligns observation dates.
 */
export function getAlignedMarketData(options: IngestionOptions): AlignedDataResult {
  const { selectedTickers, startDate, endDate, customData } = options;
  const warnings: string[] = [];

  const sourceDates = customData ? customData.dates : INITIAL_MARKET_DATABASE.dates;
  const sourceRows = customData ? customData.rows : INITIAL_MARKET_DATABASE.rows;

  if (!selectedTickers || selectedTickers.length === 0) {
    return { tickers: [], dates: [], prices: {}, warnings: ['No se seleccionó ningún activo.'] };
  }

  // Filter rows within the date range
  const alignedDates: string[] = [];
  const alignedPrices: Record<string, number[]> = {};

  for (const ticker of selectedTickers) {
    alignedPrices[ticker] = [];
  }

  for (let i = 0; i < sourceDates.length; i++) {
    const d = sourceDates[i];
    if (startDate && d < startDate) continue;
    if (endDate && d > endDate) continue;

    const row = sourceRows[i];
    // Verify all selected tickers have a valid numeric price > 0
    let hasAll = true;
    for (const ticker of selectedTickers) {
      const p = row ? row[ticker] : undefined;
      if (typeof p !== 'number' || isNaN(p) || p <= 0) {
        hasAll = false;
        break;
      }
    }

    if (hasAll) {
      alignedDates.push(d);
      for (const ticker of selectedTickers) {
        alignedPrices[ticker].push(row[ticker]);
      }
    }
  }

  if (alignedDates.length < 10) {
    warnings.push(
      `El rango seleccionado contiene pocas observaciones coincidentes (${alignedDates.length} días). Se recomienda ampliar el período.`
    );
  }

  return {
    tickers: selectedTickers,
    dates: alignedDates,
    prices: alignedPrices,
    warnings,
  };
}

/**
 * Parses user-uploaded CSV or XLSX files.
 * Supports:
 *  1. Multi-column format: Date, AAPL, MSFT, GOOGL, ...
 *  2. Standard Yahoo Finance single-ticker export: Date, Open, High, Low, Close, Adj Close, Volume
 *     (Strictly extracts 'Adj Close' / 'Cierre Ajustado')
 */
export async function parseUploadedFile(file: File): Promise<{
  dates: string[];
  rows: Record<string, number>[];
  tickers: string[];
  filename: string;
}> {
  const buffer = await file.arrayBuffer();
  const workbook = XLSX.read(buffer, { type: 'array', cellDates: true });
  
  if (workbook.SheetNames.length === 0) {
    throw new Error('El archivo no contiene hojas de cálculo.');
  }

  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  const rawRows = XLSX.utils.sheet_to_json<Record<string, any>>(firstSheet, { raw: false, dateNF: 'yyyy-mm-dd' });

  if (!rawRows || rawRows.length === 0) {
    throw new Error('La hoja está vacía.');
  }

  const firstRow = rawRows[0];
  const keys = Object.keys(firstRow);

  // Identify Date column
  const dateKey = keys.find(k => /^(date|fecha|timestamp|tiempo)/i.test(k.trim())) || keys[0];

  // Check if this is a single-ticker Yahoo Finance format with Adj Close
  const adjCloseKey = keys.find(k => /^(adj\s*close|cierre\s*ajustado|adjusted\s*close)/i.test(k.trim()));

  if (adjCloseKey) {
    // Single ticker format from Yahoo Finance
    const inferredTicker = file.name.replace(/\.[^/.]+$/, '').toUpperCase().replace(/[^A-Z0-9]/g, '') || 'ACTIVO_1';
    const dates: string[] = [];
    const rows: Record<string, number>[] = [];

    for (const r of rawRows) {
      const rawDate = r[dateKey];
      const rawPrice = r[adjCloseKey];
      if (rawDate && rawPrice !== undefined) {
        const parsedPrice = parseFloat(String(rawPrice).replace(/[^0-9.-]+/g, ''));
        if (!isNaN(parsedPrice) && parsedPrice > 0) {
          const dateStr = String(rawDate).substring(0, 10);
          dates.push(dateStr);
          rows.push({ [inferredTicker]: parsedPrice });
        }
      }
    }

    return { dates, rows, tickers: [inferredTicker], filename: file.name };
  } else {
    // Multi-ticker format where each column is an asset's Adjusted Close price
    const tickerKeys = keys.filter(k => k !== dateKey && !/^(open|high|low|close|volume|volumen|apertura|máximo|mínimo)/i.test(k.trim()));

    if (tickerKeys.length === 0) {
      throw new Error('No se detectaron columnas válidas de precios de Cierre Ajustado (Adj Close).');
    }

    const dates: string[] = [];
    const rows: Record<string, number>[] = [];

    for (const r of rawRows) {
      const rawDate = r[dateKey];
      if (!rawDate) continue;
      const dateStr = String(rawDate).substring(0, 10);

      const rowObj: Record<string, number> = {};
      let hasValidValue = false;

      for (const t of tickerKeys) {
        const val = r[t];
        if (val !== undefined && val !== null) {
          const num = parseFloat(String(val).replace(/[^0-9.-]+/g, ''));
          if (!isNaN(num) && num > 0) {
            rowObj[t] = num;
            hasValidValue = true;
          }
        }
      }

      if (hasValidValue) {
        dates.push(dateStr);
        rows.push(rowObj);
      }
    }

    return { dates, rows, tickers: tickerKeys, filename: file.name };
  }
}
