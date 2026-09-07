import React, { useState, useRef } from 'react';
import { 
  Download, 
  Maximize2, 
  Layers, 
  Info, 
  Compass, 
  ShieldCheck, 
  Sparkles,
  TrendingUp
} from 'lucide-react';
import { OptimizationResults, ProcessedMarketData, PortfolioPoint } from '../types';
import { exportSvgAsPng } from '../utils/exportUtils';

interface EfficientFrontierChartProps {
  optimizationResults: OptimizationResults;
  processedData: ProcessedMarketData;
  customPortfolio?: PortfolioPoint | null;
}

export const EfficientFrontierChart: React.FC<EfficientFrontierChartProps> = ({
  optimizationResults,
  processedData,
  customPortfolio,
}) => {
  const { maxSharpePortfolio, minVariancePortfolio, equalWeightPortfolio, efficientFrontier, randomPortfolios, riskFreeRate } = optimizationResults;
  const { tickers, assetStats } = processedData;

  const [showMonteCarloCloud, setShowMonteCarloCloud] = useState<boolean>(true);
  const [showCalLine, setShowCalLine] = useState<boolean>(true);
  const [showIndividualAssets, setShowIndividualAssets] = useState<boolean>(true);
  const [hoveredPoint, setHoveredPoint] = useState<PortfolioPoint | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);

  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // SVG Chart ViewBox Dimensions
  const width = 860;
  const height = 480;
  const margin = { top: 35, right: 40, bottom: 50, left: 65 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;

  // Domain Calculation (Volatility X, Return Y)
  let minVol = 0;
  let maxVol = 35;
  let minRet = Math.min(riskFreeRate - 2, 0);
  let maxRet = 35;

  // Scan across assets and portfolios
  assetStats.forEach((a) => {
    if (a.annualizedVolatility > maxVol) maxVol = a.annualizedVolatility;
    if (a.annualizedReturn > maxRet) maxRet = a.annualizedReturn;
    if (a.annualizedReturn < minRet) minRet = a.annualizedReturn;
  });

  efficientFrontier.forEach((p) => {
    if (p.volatility > maxVol) maxVol = p.volatility;
    if (p.expectedReturn > maxRet) maxRet = p.expectedReturn;
  });

  // Add comfortable padding
  maxVol = Math.ceil(maxVol * 1.12);
  maxRet = Math.ceil(maxRet * 1.15);
  minRet = Math.floor(Math.min(minRet, riskFreeRate) * 0.9);

  const getX = (vol: number) => margin.left + (vol / maxVol) * plotW;
  const getY = (ret: number) => margin.top + plotH - ((ret - minRet) / (maxRet - minRet)) * plotH;

  // Generate path string for Efficient Frontier Curve
  const frontierPathD = efficientFrontier.reduce((acc, pt, i) => {
    const x = getX(pt.volatility);
    const y = getY(pt.expectedReturn);
    return `${acc} ${i === 0 ? 'M' : 'L'} ${x.toFixed(1)} ${y.toFixed(1)}`;
  }, '');

  // CAL (Capital Allocation Line) end coordinates
  const calExtendedVol = maxVol * 0.95;
  const calSlope = (maxSharpePortfolio.expectedReturn - riskFreeRate) / Math.max(1e-4, maxSharpePortfolio.volatility);
  const calExtendedRet = riskFreeRate + calSlope * calExtendedVol;

  const handleExportPng = () => {
    if (svgRef.current) {
      exportSvgAsPng(svgRef.current, 'Frontera_Eficiente_Markowitz', 2);
    }
  };

  // Color mapping for Monte Carlo Cloud points based on Sharpe Ratio
  const getSharpeColor = (sr: number) => {
    if (sr >= 1.2) return '#34d399'; // Emerald
    if (sr >= 0.8) return '#38bdf8'; // Sky blue
    if (sr >= 0.4) return '#818cf8'; // Indigo
    if (sr >= 0.0) return '#fbbf24'; // Amber
    return '#f87171'; // Red
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Chart Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Compass className="w-4 h-4 text-indigo-400" />
            <span>Frontera Eficiente de Markowitz y Espacio de Inversión</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Conjunto de oportunidades de inversión, Línea de Asignación de Capital (CAL) y portafolios óptimos
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Toggle Monte Carlo Cloud */}
          <button
            id="toggle-mc-cloud-btn"
            onClick={() => setShowMonteCarloCloud(!showMonteCarloCloud)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showMonteCarloCloud
                ? 'bg-indigo-600/30 text-indigo-300 border border-indigo-500/40'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            Nube Simulada ({randomPortfolios.length})
          </button>

          {/* Toggle CAL line */}
          <button
            id="toggle-cal-btn"
            onClick={() => setShowCalLine(!showCalLine)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showCalLine
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            Línea CAL (Rf={riskFreeRate}%)
          </button>

          {/* Toggle Individual Assets */}
          <button
            id="toggle-assets-btn"
            onClick={() => setShowIndividualAssets(!showIndividualAssets)}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer ${
              showIndividualAssets
                ? 'bg-sky-500/20 text-sky-300 border border-sky-500/40'
                : 'bg-slate-950 text-slate-500 border border-slate-800'
            }`}
          >
            Activos Individuales
          </button>

          {/* Download PNG */}
          <button
            id="export-frontier-png-btn"
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Descargar este gráfico en formato PNG de alta resolución"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>Descargar (.png)</span>
          </button>
        </div>
      </div>

      {/* SVG Interactive Scatter Plot */}
      <div ref={containerRef} className="relative w-full overflow-hidden select-none">
        <svg
          ref={svgRef}
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto cursor-crosshair"
          onMouseMove={(e) => {
            const rect = e.currentTarget.getBoundingClientRect();
            setMousePos({ x: e.clientX - rect.left, y: e.clientY - rect.top });
          }}
          onMouseLeave={() => {
            setHoveredPoint(null);
            setMousePos(null);
          }}
        >
          {/* Plot Background */}
          <rect x={margin.left} y={margin.top} width={plotW} height={plotH} fill="#020617" rx="8" />

          {/* Horizontal Grid (Returns) */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, idx) => {
            const ret = minRet + pct * (maxRet - minRet);
            const y = getY(ret);
            return (
              <g key={`ygrid-${idx}`}>
                <line
                  x1={margin.left}
                  y1={y}
                  x2={width - margin.right}
                  y2={y}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={margin.left - 8}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[10px] font-mono fill-slate-500"
                >
                  {ret.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {/* Vertical Grid (Volatilities) */}
          {[0, 0.2, 0.4, 0.6, 0.8, 1].map((pct, idx) => {
            const vol = pct * maxVol;
            const x = getX(vol);
            return (
              <g key={`xgrid-${idx}`}>
                <line
                  x1={x}
                  y1={margin.top}
                  x2={x}
                  y2={height - margin.bottom}
                  stroke="#1e293b"
                  strokeDasharray="3 3"
                />
                <text
                  x={x}
                  y={height - margin.bottom + 16}
                  textAnchor="middle"
                  className="text-[10px] font-mono fill-slate-500"
                >
                  {vol.toFixed(1)}%
                </text>
              </g>
            );
          })}

          {/* 1. Monte Carlo Random Portfolios Cloud */}
          {showMonteCarloCloud && (
            <g id="monte-carlo-cloud-layer">
              {randomPortfolios.map((p, i) => (
                <circle
                  key={`cloud-${i}`}
                  cx={getX(p.volatility)}
                  cy={getY(p.expectedReturn)}
                  r={2}
                  fill={getSharpeColor(p.sharpeRatio)}
                  opacity={0.35}
                />
              ))}
            </g>
          )}

          {/* 2. Capital Allocation Line (CAL) */}
          {showCalLine && (
            <g id="cal-layer">
              <line
                x1={getX(0)}
                y1={getY(riskFreeRate)}
                x2={getX(calExtendedVol)}
                y2={getY(calExtendedRet)}
                stroke="#f59e0b"
                strokeWidth={2}
                strokeDasharray="4 4"
              />
              {/* Risk-free rate origin point */}
              <circle
                cx={getX(0)}
                cy={getY(riskFreeRate)}
                r={4}
                fill="#f59e0b"
                stroke="#020617"
                strokeWidth={1.5}
              />
              <text
                x={getX(0) + 8}
                y={getY(riskFreeRate) - 6}
                className="text-[10px] font-bold fill-amber-400 font-mono"
              >
                Rf = {riskFreeRate}%
              </text>
            </g>
          )}

          {/* 3. Markowitz Efficient Frontier Curve */}
          <path
            d={frontierPathD}
            fill="none"
            stroke="#6366f1"
            strokeWidth={3.5}
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 4. Individual Assets Points */}
          {showIndividualAssets &&
            assetStats.map((asset) => {
              const cx = getX(asset.annualizedVolatility);
              const cy = getY(asset.annualizedReturn);
              return (
                <g
                  key={asset.ticker}
                  className="cursor-pointer"
                  onMouseEnter={() =>
                    setHoveredPoint({
                      weights: [],
                      expectedReturn: asset.annualizedReturn,
                      volatility: asset.annualizedVolatility,
                      sharpeRatio: asset.sharpeRatio,
                      label: `Activo: ${asset.ticker} (${asset.name})`,
                      type: 'individual',
                    })
                  }
                >
                  <circle cx={cx} cy={cy} r={6} fill={asset.color} stroke="#ffffff" strokeWidth={1.5} />
                  <text
                    x={cx}
                    y={cy - 9}
                    textAnchor="middle"
                    className="text-[10px] font-bold font-mono fill-white drop-shadow"
                  >
                    {asset.ticker}
                  </text>
                </g>
              );
            })}

          {/* 5. Key Portfolios: Equal Weight (1/N) */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(equalWeightPortfolio)}
          >
            <circle
              cx={getX(equalWeightPortfolio.volatility)}
              cy={getY(equalWeightPortfolio.expectedReturn)}
              r={6.5}
              fill="#94a3b8"
              stroke="#ffffff"
              strokeWidth={2}
            />
            <text
              x={getX(equalWeightPortfolio.volatility) + 10}
              y={getY(equalWeightPortfolio.expectedReturn) + 4}
              className="text-[10px] font-bold fill-slate-300 font-mono"
            >
              1/N
            </text>
          </g>

          {/* 6. Key Portfolios: Global Minimum Variance Portfolio (GMVP) */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(minVariancePortfolio)}
          >
            {/* Pulsing ring */}
            <circle
              cx={getX(minVariancePortfolio.volatility)}
              cy={getY(minVariancePortfolio.expectedReturn)}
              r={11}
              fill="none"
              stroke="#10b981"
              strokeWidth={1.5}
              opacity={0.6}
            />
            <circle
              cx={getX(minVariancePortfolio.volatility)}
              cy={getY(minVariancePortfolio.expectedReturn)}
              r={7}
              fill="#10b981"
              stroke="#ffffff"
              strokeWidth={2}
            />
            <text
              x={getX(minVariancePortfolio.volatility) - 10}
              y={getY(minVariancePortfolio.expectedReturn) - 12}
              textAnchor="middle"
              className="text-[10px] font-bold fill-emerald-400 font-mono"
            >
              Mínima Varianza
            </text>
          </g>

          {/* 7. Key Portfolios: Maximum Sharpe Ratio (Tangency) */}
          <g
            className="cursor-pointer"
            onMouseEnter={() => setHoveredPoint(maxSharpePortfolio)}
          >
            {/* Glow circle */}
            <circle
              cx={getX(maxSharpePortfolio.volatility)}
              cy={getY(maxSharpePortfolio.expectedReturn)}
              r={13}
              fill="#818cf8"
              opacity={0.25}
            />
            <circle
              cx={getX(maxSharpePortfolio.volatility)}
              cy={getY(maxSharpePortfolio.expectedReturn)}
              r={8}
              fill="#4f46e5"
              stroke="#ffffff"
              strokeWidth={2.5}
            />
            <text
              x={getX(maxSharpePortfolio.volatility) + 12}
              y={getY(maxSharpePortfolio.expectedReturn) - 10}
              className="text-[11px] font-extrabold fill-indigo-300 font-mono drop-shadow"
            >
              ★ Máximo Sharpe
            </text>
          </g>

          {/* 8. Custom User Portfolio (if provided) */}
          {customPortfolio && (
            <g
              className="cursor-pointer"
              onMouseEnter={() => setHoveredPoint(customPortfolio)}
            >
              <circle
                cx={getX(customPortfolio.volatility)}
                cy={getY(customPortfolio.expectedReturn)}
                r={7}
                fill="#ec4899"
                stroke="#ffffff"
                strokeWidth={2}
              />
              <text
                x={getX(customPortfolio.volatility) + 10}
                y={getY(customPortfolio.expectedReturn) + 4}
                className="text-[10px] font-bold fill-pink-400 font-mono"
              >
                Personalizado
              </text>
            </g>
          )}

          {/* Axis Titles */}
          <text
            x={width / 2}
            y={height - 10}
            textAnchor="middle"
            className="text-[11px] font-medium fill-slate-400"
          >
            Volatilidad Anualizada - Riesgo ($\sigma_p$ %)
          </text>
          <text
            x={-height / 2 + margin.top}
            y={18}
            transform="rotate(-90)"
            textAnchor="middle"
            className="text-[11px] font-medium fill-slate-400"
          >
            Retorno Esperado Anualizado ($E(R_p)$ %)
          </text>
        </svg>

        {/* Hover Tooltip Card */}
        {hoveredPoint && mousePos && (
          <div
            className="pointer-events-none absolute z-30 bg-slate-950/95 border border-slate-700 p-3.5 rounded-xl shadow-2xl text-xs font-mono space-y-1.5"
            style={{
              left: Math.min(mousePos.x + 16, (containerRef.current?.clientWidth || 700) - 250),
              top: Math.max(10, Math.min(mousePos.y - 40, height - 160)),
            }}
          >
            <div className="font-bold text-white border-b border-slate-800 pb-1 flex items-center justify-between gap-2">
              <span>{hoveredPoint.label || 'Portafolio'}</span>
              <span className="text-[10px] text-indigo-400">
                Sharpe: {hoveredPoint.sharpeRatio.toFixed(3)}
              </span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-slate-300">
              <div>
                Riesgo ($\sigma$):{' '}
                <strong className="text-amber-400">{hoveredPoint.volatility.toFixed(2)}%</strong>
              </div>
              <div>
                Retorno ($E(R)$):{' '}
                <strong className="text-emerald-400">{hoveredPoint.expectedReturn.toFixed(2)}%</strong>
              </div>
            </div>

            {/* Top Asset Allocations */}
            {hoveredPoint.weights && hoveredPoint.weights.length > 0 && (
              <div className="pt-1 border-t border-slate-800 text-[11px] space-y-0.5">
                <div className="text-slate-400 text-[10px] uppercase font-bold">Principales Ponderaciones:</div>
                {tickers
                  .map((t, idx) => ({ ticker: t, weight: hoveredPoint.weights[idx] }))
                  .sort((a, b) => b.weight - a.weight)
                  .filter((w) => w.weight >= 0.01)
                  .slice(0, 4)
                  .map((item) => (
                    <div key={item.ticker} className="flex justify-between text-slate-300">
                      <span>{item.ticker}:</span>
                      <span className="font-semibold text-white">{(item.weight * 100).toFixed(1)}%</span>
                    </div>
                  ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-800 gap-3">
        <div className="flex flex-wrap items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-1 bg-indigo-500 rounded"></span> Frontera Eficiente
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-indigo-600 border border-white"></span> Máximo Sharpe (Tangente)
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-emerald-500 border border-white"></span> Mínima Varianza Global
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded-full bg-slate-400"></span> 1/N Equitativo
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-amber-400 border-dashed"></span> Línea CAL
          </span>
        </div>
        <span className="text-[11px] text-slate-500 font-mono">
          Escala de Sharpe: Verde (alto) a Rojo (bajo)
        </span>
      </div>

    </div>
  );
};
