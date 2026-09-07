import React from 'react';
import { Sliders, RotateCcw, Sparkles, ShieldCheck, Scale } from 'lucide-react';
import { ProcessedMarketData, PortfolioPoint } from '../types';
import {
  calculatePortfolioReturn,
  calculatePortfolioVolatility,
  calculatePortfolioSharpe,
} from '../math/statisticsEngine';

interface InteractivePortfolioSimulatorProps {
  processedData: ProcessedMarketData;
  customWeights: number[];
  onWeightsChange: (newWeights: number[]) => void;
  riskFreeRate: number;
  onApplyPresetWeights: (weights: number[]) => void;
  maxSharpeWeights: number[];
  minVarianceWeights: number[];
}

export const InteractivePortfolioSimulator: React.FC<InteractivePortfolioSimulatorProps> = ({
  processedData,
  customWeights,
  onWeightsChange,
  riskFreeRate,
  onApplyPresetWeights,
  maxSharpeWeights,
  minVarianceWeights,
}) => {
  const { tickers, annualizedReturns, annualizedCovarianceMatrix, assetStats } = processedData;

  // Handle single asset weight change and re-normalize other weights
  const handleSingleWeightChange = (index: number, newValPercent: number) => {
    const newVal = Math.max(0, Math.min(100, newValPercent)) / 100;
    const oldVal = customWeights[index];
    const diff = newVal - oldVal;

    const remainingOldSum = 1.0 - oldVal;
    const newWeights = [...customWeights];
    newWeights[index] = newVal;

    if (remainingOldSum > 1e-6) {
      const scale = (1.0 - newVal) / remainingOldSum;
      for (let i = 0; i < customWeights.length; i++) {
        if (i !== index) {
          newWeights[i] = Math.max(0, customWeights[i] * scale);
        }
      }
    } else {
      // All other weights were zero, distribute equally among others
      const otherCount = customWeights.length - 1;
      const share = otherCount > 0 ? (1.0 - newVal) / otherCount : 0;
      for (let i = 0; i < customWeights.length; i++) {
        if (i !== index) {
          newWeights[i] = share;
        }
      }
    }

    // Final precision normalization to ensure sum is strictly 1.0
    const sum = newWeights.reduce((a, b) => a + b, 0);
    if (sum > 0) {
      for (let i = 0; i < newWeights.length; i++) {
        newWeights[i] /= sum;
      }
    }

    onWeightsChange(newWeights);
  };

  const handleEqualWeightReset = () => {
    const eq = new Array(tickers.length).fill(1.0 / tickers.length);
    onWeightsChange(eq);
  };

  // Metrics for current custom portfolio
  const customReturn = calculatePortfolioReturn(customWeights, annualizedReturns) * 100;
  const customVolatility = calculatePortfolioVolatility(customWeights, annualizedCovarianceMatrix) * 100;
  const customSharpe = calculatePortfolioSharpe(customReturn, customVolatility, riskFreeRate);

  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl space-y-4">
      
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div>
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Sliders className="w-4 h-4 text-pink-400" />
            <span>Simulador Interactivo de Portafolio Personalizado</span>
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Ajusta las ponderaciones manualmente y visualiza el impacto inmediato en riesgo y rendimiento
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onApplyPresetWeights(maxSharpeWeights)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-indigo-950/60 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-900/60 transition-colors cursor-pointer"
          >
            Copiar Máx Sharpe
          </button>
          <button
            onClick={() => onApplyPresetWeights(minVarianceWeights)}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-emerald-950/60 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/60 transition-colors cursor-pointer"
          >
            Copiar Mín Varianza
          </button>
          <button
            onClick={handleEqualWeightReset}
            className="px-2.5 py-1 rounded-lg text-xs font-medium bg-slate-950 border border-slate-800 text-slate-400 hover:text-white transition-colors cursor-pointer flex items-center gap-1"
          >
            <RotateCcw className="w-3 h-3" />
            <span>1/N</span>
          </button>
        </div>
      </div>

      {/* Real-time KPI summary of custom portfolio */}
      <div className="grid grid-cols-3 gap-3 p-3 bg-slate-950/80 rounded-xl border border-slate-800/80 text-center font-mono">
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-sans">Retorno Anualizado</span>
          <span className="text-base font-extrabold text-emerald-400">
            {customReturn >= 0 ? '+' : ''}{customReturn.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-sans">Volatilidad ($\sigma_p$)</span>
          <span className="text-base font-extrabold text-amber-400">
            {customVolatility.toFixed(2)}%
          </span>
        </div>
        <div>
          <span className="text-[10px] text-slate-400 uppercase block font-sans">Ratio de Sharpe</span>
          <span className="text-base font-extrabold text-pink-400">
            {customSharpe.toFixed(3)}
          </span>
        </div>
      </div>

      {/* Sliders Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-64 overflow-y-auto pr-1">
        {tickers.map((ticker, idx) => {
          const w = customWeights[idx] || 0;
          const asset = assetStats.find((a) => a.ticker === ticker);
          const pct = w * 100;

          return (
            <div
              key={ticker}
              className="p-3 rounded-xl bg-slate-950/50 border border-slate-800/80 space-y-1.5"
            >
              <div className="flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full"
                    style={{ backgroundColor: asset?.color }}
                  />
                  <span className="font-mono font-bold text-white">{ticker}</span>
                </div>
                <div className="flex items-center gap-1 font-mono">
                  <span className="font-extrabold text-white text-xs">{pct.toFixed(1)}%</span>
                </div>
              </div>

              <input
                type="range"
                min="0"
                max="100"
                step="0.5"
                value={pct}
                onChange={(e) => handleSingleWeightChange(idx, parseFloat(e.target.value))}
                className="w-full accent-pink-500 cursor-pointer h-1.5 bg-slate-800 rounded-lg appearance-none"
              />
            </div>
          );
        })}
      </div>

    </div>
  );
};
