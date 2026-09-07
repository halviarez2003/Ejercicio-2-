import React, { useState, useRef } from 'react';
import { PieChart as PieIcon, Download, Layers, CheckCircle2 } from 'lucide-react';
import { OptimizationResults, ProcessedMarketData, PortfolioPoint } from '../types';
import { exportSvgAsPng } from '../utils/exportUtils';

interface PortfolioDistributionChartProps {
  optimizationResults: OptimizationResults;
  processedData: ProcessedMarketData;
  customPortfolio?: PortfolioPoint | null;
}

export const PortfolioDistributionChart: React.FC<PortfolioDistributionChartProps> = ({
  optimizationResults,
  processedData,
  customPortfolio,
}) => {
  const { maxSharpePortfolio, minVariancePortfolio, equalWeightPortfolio } = optimizationResults;
  const { tickers, assetStats } = processedData;

  const [selectedTarget, setSelectedTarget] = useState<'max_sharpe' | 'min_variance' | 'equal_weight' | 'custom'>('max_sharpe');
  const [hoveredSlice, setHoveredSlice] = useState<number | null>(null);
  const svgDonutRef = useRef<SVGSVGElement>(null);

  const activePortfolio: PortfolioPoint =
    selectedTarget === 'max_sharpe'
      ? maxSharpePortfolio
      : selectedTarget === 'min_variance'
      ? minVariancePortfolio
      : selectedTarget === 'custom' && customPortfolio
      ? customPortfolio
      : equalWeightPortfolio;

  const weights = activePortfolio.weights;

  // Donut chart math
  const size = 300;
  const center = size / 2;
  const outerRadius = 115;
  const innerRadius = 65;

  let currentAngle = -Math.PI / 2;
  const slices = tickers.map((ticker, idx) => {
    const w = weights[idx] || 0;
    const asset = assetStats.find((a) => a.ticker === ticker);
    const angle = w * 2 * Math.PI;

    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const x1 = center + outerRadius * Math.cos(startAngle);
    const y1 = center + outerRadius * Math.sin(startAngle);
    const x2 = center + outerRadius * Math.cos(endAngle);
    const y2 = center + outerRadius * Math.sin(endAngle);

    const ix1 = center + innerRadius * Math.cos(endAngle);
    const iy1 = center + innerRadius * Math.sin(endAngle);
    const ix2 = center + innerRadius * Math.cos(startAngle);
    const iy2 = center + innerRadius * Math.sin(startAngle);

    const largeArcFlag = angle > Math.PI ? 1 : 0;

    const pathData =
      w > 0.999
        ? `M ${center} ${center - outerRadius} A ${outerRadius} ${outerRadius} 0 1 0 ${center} ${center + outerRadius} A ${outerRadius} ${outerRadius} 0 1 0 ${center} ${center - outerRadius} M ${center} ${center - innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${center} ${center + innerRadius} A ${innerRadius} ${innerRadius} 0 1 1 ${center} ${center - innerRadius} Z`
        : `M ${x1} ${y1} A ${outerRadius} ${outerRadius} 0 ${largeArcFlag} 1 ${x2} ${y2} L ${ix1} ${iy1} A ${innerRadius} ${innerRadius} 0 ${largeArcFlag} 0 ${ix2} ${iy2} Z`;

    return {
      ticker,
      weight: w,
      color: asset?.color || '#38bdf8',
      pathData,
      name: asset?.name || ticker,
    };
  });

  const handleExportPng = () => {
    if (svgDonutRef.current) {
      exportSvgAsPng(svgDonutRef.current, `Distribucion_Pesos_${selectedTarget}`, 2);
    }
  };

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      {/* Header and Portfolio Selector */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <PieIcon className="w-4 h-4 text-emerald-400" />
            <span>Distribución y Asignación de Capital ($w_i$)</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ponderaciones óptimas bajo la restricción Long-Only ($\sum w_i = 100\%, w_i \ge 0$)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Target Portfolio Selector */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setSelectedTarget('max_sharpe')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTarget === 'max_sharpe'
                  ? 'bg-indigo-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Máximo Sharpe
            </button>
            <button
              onClick={() => setSelectedTarget('min_variance')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTarget === 'min_variance'
                  ? 'bg-emerald-600 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Mínima Varianza
            </button>
            <button
              onClick={() => setSelectedTarget('equal_weight')}
              className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                selectedTarget === 'equal_weight'
                  ? 'bg-slate-700 text-white'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              1/N Equitativo
            </button>
            {customPortfolio && (
              <button
                onClick={() => setSelectedTarget('custom')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors cursor-pointer ${
                  selectedTarget === 'custom'
                    ? 'bg-pink-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Personalizado
              </button>
            )}
          </div>

          <button
            onClick={handleExportPng}
            className="flex items-center gap-1.5 px-3 py-1 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer"
            title="Descargar este gráfico en formato PNG"
          >
            <Download className="w-3.5 h-3.5 text-emerald-400" />
            <span>PNG</span>
          </button>
        </div>
      </div>

      {/* Donut Chart & Horizontal Allocation Bars Grid */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-center">
        
        {/* Left: SVG Donut Chart */}
        <div className="md:col-span-5 flex flex-col items-center justify-center relative">
          <svg
            ref={svgDonutRef}
            viewBox={`0 0 ${size} ${size}`}
            className="w-56 h-56 sm:w-64 sm:h-64 select-none"
          >
            <rect width={size} height={size} fill="transparent" />
            {slices.map((slice, idx) => {
              if (slice.weight <= 0.0001) return null;
              const isHovered = hoveredSlice === idx;
              return (
                <path
                  key={slice.ticker}
                  d={slice.pathData}
                  fill={slice.color}
                  stroke="#020617"
                  strokeWidth={2}
                  className="transition-all cursor-pointer hover:opacity-90"
                  onMouseEnter={() => setHoveredSlice(idx)}
                  onMouseLeave={() => setHoveredSlice(null)}
                />
              );
            })}

            {/* Inner Center Label */}
            <circle cx={center} cy={center} r={innerRadius - 4} fill="#020617" />
            <text
              x={center}
              y={center - 8}
              textAnchor="middle"
              className="text-[11px] font-bold fill-slate-400"
            >
              {hoveredSlice !== null ? slices[hoveredSlice].ticker : 'Sharpe'}
            </text>
            <text
              x={center}
              y={center + 14}
              textAnchor="middle"
              className="text-base font-extrabold font-mono fill-white"
            >
              {hoveredSlice !== null
                ? `${(slices[hoveredSlice].weight * 100).toFixed(1)}%`
                : activePortfolio.sharpeRatio.toFixed(3)}
            </text>
          </svg>

          <div className="text-[11px] text-slate-400 font-mono text-center mt-1">
            Total Ponderación: <strong className="text-emerald-400">100.0%</strong>
          </div>
        </div>

        {/* Right: Allocation Bars Breakdown Table */}
        <div className="md:col-span-7 space-y-2.5">
          <div className="text-xs font-semibold text-slate-400 mb-1 flex items-center justify-between">
            <span>Desglose por Activo y Ponderación ($w_i$):</span>
            <span className="font-mono text-slate-500">
              Retorno: <strong className="text-emerald-400">{activePortfolio.expectedReturn.toFixed(2)}%</strong> | Riesgo: <strong className="text-amber-400">{activePortfolio.volatility.toFixed(2)}%</strong>
            </span>
          </div>

          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {slices
              .sort((a, b) => b.weight - a.weight)
              .map((item, idx) => {
                const pct = item.weight * 100;
                return (
                  <div
                    key={item.ticker}
                    onMouseEnter={() => setHoveredSlice(idx)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className="p-2 rounded-xl bg-slate-950/80 border border-slate-800/80 hover:border-slate-700 transition-colors"
                  >
                    <div className="flex items-center justify-between text-xs mb-1">
                      <div className="flex items-center gap-2">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-mono font-bold text-white">{item.ticker}</span>
                        <span className="text-[10px] text-slate-400 truncate max-w-[150px]">
                          {item.name}
                        </span>
                      </div>
                      <span className="font-mono font-extrabold text-white">{pct.toFixed(2)}%</span>
                    </div>
                    {/* Progress bar */}
                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-300"
                        style={{
                          width: `${pct}%`,
                          backgroundColor: item.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
          </div>
        </div>

      </div>

    </div>
  );
};
