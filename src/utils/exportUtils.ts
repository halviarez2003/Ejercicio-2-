import * as XLSX from 'xlsx';
import { ProcessedMarketData, OptimizationResults } from '../types';

/**
 * Exports complete financial dataset and optimization results into a structured multi-sheet Excel file (.xlsx)
 */
export function exportToExcel(
  processedData: ProcessedMarketData,
  optimizationResults: OptimizationResults | null
) {
  const wb = XLSX.utils.book_new();
  const { tickers, dates, prices, returns, cumulativeReturns, annualizedCovarianceMatrix, correlationMatrix, assetStats } = processedData;

  // 1. Hoja: Precios Cierre Ajustado (Adjusted Close)
  const priceRows = dates.map((date, idx) => {
    const row: Record<string, any> = { Fecha: date };
    for (const t of tickers) {
      row[t] = prices[t][idx];
    }
    return row;
  });
  const wsPrices = XLSX.utils.json_to_sheet(priceRows);
  XLSX.utils.book_append_sheet(wb, wsPrices, 'Precios_Cierre_Ajustado');

  // 2. Hoja: Retornos Simples Diarios
  const returnDates = dates.slice(1);
  const returnRows = returnDates.map((date, idx) => {
    const row: Record<string, any> = { Fecha: date };
    for (const t of tickers) {
      row[t] = returns[t][idx];
    }
    return row;
  });
  const wsReturns = XLSX.utils.json_to_sheet(returnRows);
  XLSX.utils.book_append_sheet(wb, wsReturns, 'Retornos_Simples');

  // 3. Hoja: Retornos Acumulados
  const cumRows = dates.map((date, idx) => {
    const row: Record<string, any> = { Fecha: date };
    for (const t of tickers) {
      row[t] = cumulativeReturns[t][idx];
    }
    return row;
  });
  const wsCum = XLSX.utils.json_to_sheet(cumRows);
  XLSX.utils.book_append_sheet(wb, wsCum, 'Retornos_Acumulados');

  // 4. Hoja: Estadísticas de Activos
  const statsRows = assetStats.map((s) => ({
    Activo: s.ticker,
    Nombre: s.name,
    'Precio Inicial ($)': s.initialPrice,
    'Precio Final ($)': s.latestPrice,
    'Retorno Acumulado (%)': Number(s.cumulativeReturn.toFixed(2)),
    'Retorno Promedio Diario': Number(s.meanDailyReturn.toFixed(6)),
    'Retorno Anualizado (%)': Number(s.annualizedReturn.toFixed(2)),
    'Volatilidad Diaria': Number(s.dailyVolatility.toFixed(6)),
    'Volatilidad Anualizada (%)': Number(s.annualizedVolatility.toFixed(2)),
    'Ratio de Sharpe': Number(s.sharpeRatio.toFixed(3)),
  }));
  const wsStats = XLSX.utils.json_to_sheet(statsRows);
  XLSX.utils.book_append_sheet(wb, wsStats, 'Estadisticas_Descriptivas');

  // 5. Hoja: Matriz de Covarianzas Anualizada
  const covRows = tickers.map((tRow, i) => {
    const row: Record<string, any> = { Activo: tRow };
    tickers.forEach((tCol, j) => {
      row[tCol] = annualizedCovarianceMatrix[i][j];
    });
    return row;
  });
  const wsCov = XLSX.utils.json_to_sheet(covRows);
  XLSX.utils.book_append_sheet(wb, wsCov, 'Matriz_Covarianza_Anualizada');

  // 6. Hoja: Matriz de Correlación
  const corrRows = tickers.map((tRow, i) => {
    const row: Record<string, any> = { Activo: tRow };
    tickers.forEach((tCol, j) => {
      row[tCol] = correlationMatrix[i][j];
    });
    return row;
  });
  const wsCorr = XLSX.utils.json_to_sheet(corrRows);
  XLSX.utils.book_append_sheet(wb, wsCorr, 'Matriz_Correlacion');

  // 7. Hoja: Portafolios Óptimos (Markowitz)
  if (optimizationResults) {
    const { maxSharpePortfolio, minVariancePortfolio, equalWeightPortfolio, riskFreeRate } = optimizationResults;
    const optRows = [
      {
        Métrica: 'Tasa Libre de Riesgo (Rf %)',
        'Máx Sharpe': `${riskFreeRate.toFixed(2)}%`,
        'Mínima Varianza': `${riskFreeRate.toFixed(2)}%`,
        'Equitativo (1/N)': `${riskFreeRate.toFixed(2)}%`,
      },
      {
        Métrica: 'Retorno Esperado Anualizado (%)',
        'Máx Sharpe': `${maxSharpePortfolio.expectedReturn.toFixed(2)}%`,
        'Mínima Varianza': `${minVariancePortfolio.expectedReturn.toFixed(2)}%`,
        'Equitativo (1/N)': `${equalWeightPortfolio.expectedReturn.toFixed(2)}%`,
      },
      {
        Métrica: 'Volatilidad Anualizada (%)',
        'Máx Sharpe': `${maxSharpePortfolio.volatility.toFixed(2)}%`,
        'Mínima Varianza': `${minVariancePortfolio.volatility.toFixed(2)}%`,
        'Equitativo (1/N)': `${equalWeightPortfolio.volatility.toFixed(2)}%`,
      },
      {
        Métrica: 'Ratio de Sharpe',
        'Máx Sharpe': maxSharpePortfolio.sharpeRatio.toFixed(3),
        'Mínima Varianza': minVariancePortfolio.sharpeRatio.toFixed(3),
        'Equitativo (1/N)': equalWeightPortfolio.sharpeRatio.toFixed(3),
      },
    ];

    // Append asset allocation weights
    tickers.forEach((t, i) => {
      optRows.push({
        Métrica: `Ponderación ${t} (%)`,
        'Máx Sharpe': `${(maxSharpePortfolio.weights[i] * 100).toFixed(2)}%`,
        'Mínima Varianza': `${(minVariancePortfolio.weights[i] * 100).toFixed(2)}%`,
        'Equitativo (1/N)': `${(equalWeightPortfolio.weights[i] * 100).toFixed(2)}%`,
      });
    });

    const wsOpt = XLSX.utils.json_to_sheet(optRows);
    XLSX.utils.book_append_sheet(wb, wsOpt, 'Portafolios_Optimos');
  }

  // Trigger download
  const dateStr = new Date().toISOString().split('T')[0];
  XLSX.writeFile(wb, `Optimizacion_Portafolios_Markowitz_${dateStr}.xlsx`);
}

/**
 * Exports an SVG chart element to a high-resolution PNG file
 */
export function exportSvgAsPng(svgElement: SVGSVGElement, filename: string, scaleFactor: number = 2) {
  try {
    const svgString = new XMLSerializer().serializeToString(svgElement);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const urlHelper = window.URL || (window as any).webkitURL;
    const blobURL = urlHelper.createObjectURL(svgBlob);

    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      const width = (svgElement.viewBox.baseVal.width || svgElement.clientWidth || 800) * scaleFactor;
      const height = (svgElement.viewBox.baseVal.height || svgElement.clientHeight || 500) * scaleFactor;

      canvas.width = width;
      canvas.height = height;

      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Fill dark slate background
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, width, height);

      // Draw SVG image
      ctx.drawImage(image, 0, 0, width, height);

      // Convert canvas to PNG blob
      canvas.toBlob((blob) => {
        if (!blob) return;
        const pngUrl = urlHelper.createObjectURL(blob);
        const downloadLink = document.createElement('a');
        downloadLink.href = pngUrl;
        downloadLink.download = `${filename}.png`;
        document.body.appendChild(downloadLink);
        downloadLink.click();
        document.body.removeChild(downloadLink);
        urlHelper.revokeObjectURL(pngUrl);
        urlHelper.revokeObjectURL(blobURL);
      }, 'image/png');
    };

    image.src = blobURL;
  } catch (err) {
    console.error('Error exporting chart to PNG:', err);
  }
}
