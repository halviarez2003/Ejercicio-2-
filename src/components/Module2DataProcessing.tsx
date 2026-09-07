import React, { useState, useRef } from 'react';
import { 
  BarChart3, 
  TrendingUp, 
  Grid, 
  Download, 
  HelpCircle, 
  Activity, 
  CheckCircle2, 
  Maximize2 
} from 'lucide-react';
import { ProcessedMarketData } from '../types';
import { exportSvgAsPng } from '../utils/exportUtils';

interface Module2DataProcessingProps {
  data: ProcessedMarketData;
  riskFreeRate: number;
}

export const Module2DataProcessing: React.FC<Module2DataProcessingProps> = ({
  data,
  riskFreeRate,
}) => {
  const { tickers, dates, cumulativeReturns, assetStats, correlationMatrix, annualizedCovarianceMatrix } = data;
  
  // Toggles for cumulative return lines
  const [activeLines, setActiveLines] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    tickers.forEach((t) => { initial[t] = true; });
    return initial;
  });

  const [activeMatrixTab, setActiveMatrixTab] = useState<'correlation' | 'covariance'>('correlation');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const chartSvgRef = useRef<SVGSVGElement>(null);

  const toggleLine = (ticker: string) => {
    setActiveLines((prev) => ({ ...prev, [ticker]: !prev[ticker] }));
  };

  // SVG Chart Dimensions
  const width = 840;
  const height = 340;
  const margin = { top: 25, right: 35, bottom: 40, left: 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Compute min/max of visible cumulative returns
  let minCum = 0;
  let maxCum = 0.1;

  tickers.forEach((t) => {
    if (activeLines[t] && cumulativeReturns[t]) {
      const arr = cumulativeReturns[t];
      for (let i = 0; i < arr.length; i++) {
        if (arr[i] < minCum) minCum = arr[i];
        if (arr[i] > maxCum) maxCum = arr[i];
      }
    }
  });

  // Add 10% padding to y-axis
  const pad = (maxCum - minCum) * 0.1 || 0.05;
  const yMin = minCum - pad;
  const yMax = maxCum + pad;

  const totalPoints = dates.length;
  const getX = (idx: number) => margin.left + (idx / Math.max(1, totalPoints - 1)) * plotW;
  const getY = (val: number) => margin.top + plotH - ((val - yMin) / (yMax - yMin)) * plotH;

  const handleExportChartPng = () => {
    if (chartSvgRef.current) {
      exportSvgAsPng(chartSvgRef.current, 'Retornos_Acumulados_Historicos', 2);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* 1. Descriptive Statistics & Annualization Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Activity className="w-4 h-4 text-emerald-400" />
              <span>Estadísticas Descriptivas y Parámetros Anualizados (252 Días)</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Cálculo a partir de rendimientos simples: <span className="font-mono text-slate-300">R_t = (P_t / P_t-1) - 1</span> sobre precios de Cierre Ajustado
            </p>
          </div>
          <span className="text-xs px-2.5 py-1 rounded-lg bg-slate-950 text-slate-300 border border-slate-800 font-mono">
            Tasa Libre de Riesgo: <strong className="text-amber-400">{riskFreeRate.toFixed(2)}%</strong>
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono text-[11px]">
                <th className="py-2.5 px-3">Activo</th>
                <th className="py-2.5 px-3">Precio Inicial ($)</th>
                <th className="py-2.5 px-3">Precio Final ($)</th>
                <th className="py-2.5 px-3">Retorno Acumulado</th>
                <th className="py-2.5 px-3">Retorno Diario Promedio (R_d)</th>
                <th className="py-2.5 px-3">Retorno Anualizado (252 × R_d)</th>
                <th className="py-2.5 px-3">Volatilidad Diaria (σ_d)</th>
                <th className="py-2.5 px-3">Volatilidad Anual (σ_d × √252)</th>
                <th className="py-2.5 px-3">Ratio de Sharpe</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
              {assetStats.map((asset) => (
                <tr key={asset.ticker} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-2.5 px-3 text-white font-bold flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0"
                      style={{ backgroundColor: asset.color }}
                    />
                    <span>{asset.ticker}</span>
                    <span className="text-[10px] text-slate-400 font-normal truncate max-w-[120px]">
                      {asset.name}
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-300">${asset.initialPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3 text-slate-200 font-semibold">${asset.latestPrice.toFixed(2)}</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-semibold ${asset.cumulativeReturn >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {asset.cumulativeReturn >= 0 ? '+' : ''}{asset.cumulativeReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{(asset.meanDailyReturn * 100).toFixed(4)}%</td>
                  <td className="py-2.5 px-3">
                    <span className={`font-bold ${asset.annualizedReturn >= 0 ? 'text-indigo-300' : 'text-rose-400'}`}>
                      {asset.annualizedReturn.toFixed(2)}%
                    </span>
                  </td>
                  <td className="py-2.5 px-3 text-slate-400">{(asset.dailyVolatility * 100).toFixed(3)}%</td>
                  <td className="py-2.5 px-3 text-amber-300 font-semibold">{asset.annualizedVolatility.toFixed(2)}%</td>
                  <td className="py-2.5 px-3">
                    <span className={`px-2 py-0.5 rounded font-bold ${
                      asset.sharpeRatio >= 1.0 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' :
                      asset.sharpeRatio > 0 ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30' :
                      'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                    }`}>
                      {asset.sharpeRatio.toFixed(3)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* 2. Interactive Cumulative Returns Chart (Geometric Compounding) */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-sky-400" />
              <span>Evolución Histórica de Retornos Acumulados Geométricos</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Comparativa temporal del desempeño relativo de los activos analizados
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              id="export-cumreturns-png"
              onClick={handleExportChartPng}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
              title="Descargar este gráfico en formato PNG de alta resolución"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>Descargar Gráfica (.png)</span>
            </button>
          </div>
        </div>

        {/* Legend / Toggles */}
        <div className="flex flex-wrap gap-2">
          {tickers.map((ticker) => {
            const asset = assetStats.find((a) => a.ticker === ticker);
            const isVisible = activeLines[ticker];
            return (
              <button
                key={ticker}
                onClick={() => toggleLine(ticker)}
                className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-mono transition-all cursor-pointer ${
                  isVisible
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'bg-slate-950 text-slate-500 border border-slate-900 opacity-60'
                }`}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: isVisible ? asset?.color : '#475569' }}
                />
                <span className="font-bold">{ticker}</span>
              </button>
            );
          })}
        </div>

        {/* SVG Cumulative Returns Line Chart */}
        <div className="relative w-full overflow-hidden select-none">
          <svg
            ref={chartSvgRef}
            viewBox={`0 0 ${width} ${height}`}
            className="w-full h-auto cursor-crosshair"
            onMouseMove={(e) => {
              const rect = e.currentTarget.getBoundingClientRect();
              const scaleX = width / rect.width;
              const mouseX = (e.clientX - rect.left) * scaleX;
              if (mouseX >= margin.left && mouseX <= width - margin.right) {
                const pct = (mouseX - margin.left) / plotW;
                const idx = Math.min(dates.length - 1, Math.max(0, Math.round(pct * (dates.length - 1))));
                setHoverIndex(idx);
              } else {
                setHoverIndex(null);
              }
            }}
            onMouseLeave={() => setHoverIndex(null)}
          >
            {/* Background */}
            <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#020617" rx="6" />

            {/* Horizontal Grid & Labels */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const val = yMin + p * (yMax - yMin);
              const yPos = getY(val);
              return (
                <g key={`ygrid-${idx}`}>
                  <line
                    x1={margin.left}
                    y1={yPos}
                    x2={width - margin.right}
                    y2={yPos}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={margin.left - 8}
                    y={yPos + 4}
                    textAnchor="end"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {(val * 100).toFixed(0)}%
                  </text>
                </g>
              );
            })}

            {/* Zero return reference line */}
            {yMin <= 0 && yMax >= 0 && (
              <line
                x1={margin.left}
                y1={getY(0)}
                x2={width - margin.right}
                y2={getY(0)}
                stroke="#475569"
                strokeWidth={1.5}
                strokeDasharray="4 4"
              />
            )}

            {/* Vertical Time Grid */}
            {[0, 0.25, 0.5, 0.75, 1].map((p, idx) => {
              const idxPos = Math.floor(p * (dates.length - 1));
              const xPos = getX(idxPos);
              return (
                <g key={`xgrid-${idx}`}>
                  <line
                    x1={xPos}
                    y1={margin.top}
                    x2={xPos}
                    y2={height - margin.bottom}
                    stroke="#1e293b"
                    strokeDasharray="3 3"
                  />
                  <text
                    x={xPos}
                    y={height - margin.bottom + 16}
                    textAnchor="middle"
                    className="text-[10px] font-mono fill-slate-500"
                  >
                    {dates[idxPos]}
                  </text>
                </g>
              );
            })}

            {/* Asset Cumulative Return Paths */}
            {tickers.map((ticker) => {
              if (!activeLines[ticker]) return null;
              const asset = assetStats.find((a) => a.ticker === ticker);
              const arr = cumulativeReturns[ticker] || [];

              const pathD = arr.reduce((acc, val, i) => {
                const x = getX(i);
                const y = getY(val);
                return `${acc} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
              }, '');

              return (
                <path
                  key={ticker}
                  d={pathD}
                  fill="none"
                  stroke={asset?.color || '#38bdf8'}
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              );
            })}

            {/* Hover vertical crosshair */}
            {hoverIndex !== null && (
              <g>
                <line
                  x1={getX(hoverIndex)}
                  y1={margin.top}
                  x2={getX(hoverIndex)}
                  y2={height - margin.bottom}
                  stroke="#94a3b8"
                  strokeDasharray="2 2"
                />
              </g>
            )}

            {/* Axes Labels */}
            <text
              x={width / 2}
              y={height - 8}
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-400"
            >
              Línea Temporal (Alineación de Fechas)
            </text>
            <text
              x={-height / 2 + margin.top}
              y={16}
              transform="rotate(-90)"
              textAnchor="middle"
              className="text-[11px] font-medium fill-slate-400"
            >
              Retorno Acumulado Compuesto (%)
            </text>
          </svg>

          {/* Hover Tooltip */}
          {hoverIndex !== null && (
            <div className="absolute top-4 right-4 bg-slate-950/95 border border-slate-700 p-3 rounded-xl shadow-2xl text-xs font-mono space-y-1 z-20 pointer-events-none">
              <div className="font-bold text-white border-b border-slate-800 pb-1">
                Fecha: {dates[hoverIndex]}
              </div>
              {tickers.map((t) => {
                if (!activeLines[t]) return null;
                const asset = assetStats.find((a) => a.ticker === t);
                const val = cumulativeReturns[t]?.[hoverIndex] ?? 0;
                return (
                  <div key={t} className="flex justify-between gap-3 text-[11px]">
                    <span style={{ color: asset?.color }}>{t}:</span>
                    <span className="font-semibold text-white">
                      {val >= 0 ? '+' : ''}{(val * 100).toFixed(2)}%
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

      </div>

      {/* 3. Matrices Section: Correlation Heatmap and Annualized Covariance Matrix */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Grid className="w-4 h-4 text-indigo-400" />
              <span>Matriz de Varianzas-Covarianzas y Matriz de Correlación</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Estructura de dependencia lineal anualizada (Matriz Anual = Matriz Diaria × 252)
            </p>
          </div>

          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveMatrixTab('correlation')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeMatrixTab === 'correlation'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Matriz de Correlación ($\rho$)
            </button>
            <button
              onClick={() => setActiveMatrixTab('covariance')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                activeMatrixTab === 'covariance'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Covarianza Anualizada ($\Sigma$)
            </button>
          </div>
        </div>

        {/* Correlation Heatmap Tab */}
        {activeMatrixTab === 'correlation' && (
          <div className="space-y-3">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-center border-collapse">
                <thead>
                  <tr>
                    <th className="p-2 text-slate-500 font-mono text-left">Activo</th>
                    {tickers.map((t) => (
                      <th key={t} className="p-2 text-white font-mono font-bold">
                        {t}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {tickers.map((rowTicker, i) => (
                    <tr key={rowTicker} className="border-t border-slate-800/60">
                      <td className="p-2 text-white font-mono font-bold text-left">{rowTicker}</td>
                      {tickers.map((colTicker, j) => {
                        const val = correlationMatrix[i][j];
                        // Color intensity based on correlation
                        let bgStyle = 'rgba(30, 41, 59, 0.4)';
                        let textColor = '#e2e8f0';

                        if (i === j) {
                          bgStyle = 'rgba(79, 70, 229, 0.35)'; // 1.0 diagonal
                          textColor = '#818cf8';
                        } else if (val > 0.6) {
                          bgStyle = `rgba(59, 130, 246, ${Math.min(0.8, val)})`;
                          textColor = '#ffffff';
                        } else if (val > 0.2) {
                          bgStyle = `rgba(14, 165, 233, ${val * 0.6})`;
                          textColor = '#bae6fd';
                        } else if (val < -0.1) {
                          bgStyle = `rgba(239, 68, 68, ${Math.min(0.8, Math.abs(val))})`;
                          textColor = '#fecaca';
                        }

                        return (
                          <td
                            key={colTicker}
                            style={{ backgroundColor: bgStyle, color: textColor }}
                            className="p-2.5 font-mono text-[11px] font-semibold transition-colors"
                          >
                            {val.toFixed(2)}
                          </td>
                        );
                      })}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Heatmap Legend */}
            <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-3">
                <span>Escala:</span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-rose-500/60"></span> Negativa (Diversificación extrema)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-slate-800"></span> Neutra / Baja (~0.0)
                </span>
                <span className="flex items-center gap-1">
                  <span className="w-3 h-3 rounded bg-blue-600/70"></span> Alta Correlación (&gt; 0.6)
                </span>
              </div>
              <span className="font-mono">Rango: [-1.00 a +1.00]</span>
            </div>
          </div>
        )}

        {/* Covariance Matrix Tab */}
        {activeMatrixTab === 'covariance' && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-center border-collapse">
              <thead>
                <tr>
                  <th className="p-2 text-slate-500 font-mono text-left">Activo</th>
                  {tickers.map((t) => (
                    <th key={t} className="p-2 text-white font-mono font-bold">
                      {t}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {tickers.map((rowTicker, i) => (
                  <tr key={rowTicker} className="hover:bg-slate-800/30">
                    <td className="p-2.5 text-white font-bold text-left">{rowTicker}</td>
                    {tickers.map((colTicker, j) => {
                      const val = annualizedCovarianceMatrix[i][j];
                      return (
                        <td key={colTicker} className="p-2.5 text-slate-300">
                          {(val * 100).toFixed(4)}%
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

      </div>

    </div>
  );
};
