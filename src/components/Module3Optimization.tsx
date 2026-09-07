import React from 'react';
import { 
  Sparkles, 
  ShieldCheck, 
  Target, 
  Percent, 
  TrendingUp, 
  Zap, 
  Layers, 
  Sliders, 
  Scale 
} from 'lucide-react';
import { OptimizationResults, ProcessedMarketData } from '../types';

interface Module3OptimizationProps {
  optimizationResults: OptimizationResults;
  processedData: ProcessedMarketData;
  riskFreeRate: number;
  onRiskFreeRateChange: (val: number) => void;
}

export const Module3Optimization: React.FC<Module3OptimizationProps> = ({
  optimizationResults,
  processedData,
  riskFreeRate,
  onRiskFreeRateChange,
}) => {
  const { maxSharpePortfolio, minVariancePortfolio, equalWeightPortfolio, efficientFrontier } = optimizationResults;
  const { tickers } = processedData;

  // Helper to get top 3 weighted assets in a portfolio
  const getTopAssets = (weights: number[]) => {
    return tickers
      .map((t, i) => ({ ticker: t, weight: weights[i] }))
      .sort((a, b) => b.weight - a.weight)
      .filter((w) => w.weight >= 0.01)
      .slice(0, 3);
  };

  const topSharpe = getTopAssets(maxSharpePortfolio.weights);
  const topMinVar = getTopAssets(minVariancePortfolio.weights);

  return (
    <div className="space-y-6">
      
      {/* Optimization Parameters & Controls Banner */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-3">
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Scale className="w-4 h-4 text-indigo-400" />
              <span>Parámetros de Optimización y Restricciones de Markowitz</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Formulación cuadrática sin ventas en corto: <span className="font-mono text-slate-300">w_i ≥ 0, ∑ w_i = 100%</span>
            </p>
          </div>

          {/* Risk-Free Rate Slider Control */}
          <div className="flex items-center gap-3 bg-slate-950 p-2.5 rounded-xl border border-slate-800">
            <div className="text-xs">
              <label className="text-slate-400 block text-[10px] uppercase font-bold">
                Tasa Libre de Riesgo ($R_f$):
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="range"
                  min="0.0"
                  max="10.0"
                  step="0.25"
                  value={riskFreeRate}
                  onChange={(e) => onRiskFreeRateChange(parseFloat(e.target.value))}
                  className="w-28 accent-indigo-500 cursor-pointer"
                />
                <span className="font-mono font-bold text-amber-400 text-xs">
                  {riskFreeRate.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Solver Specs */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Algoritmo Numérico:</span>
            <span className="font-mono text-indigo-300 font-bold">Projected Gradient Descent (Simplex)</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Restricción de Ponderación:</span>
            <span className="font-mono text-emerald-400 font-bold">Posiciones Solo Largas (Long-Only)</span>
          </div>
          <div className="bg-slate-950 p-3 rounded-xl border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">Curva de Frontera:</span>
            <span className="font-mono text-sky-400 font-bold">{efficientFrontier.length} puntos resueltos</span>
          </div>
        </div>
      </div>

      {/* KPI Cards: The Key Portfolios */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        
        {/* Card 1: Tangency / Maximum Sharpe */}
        <div className="bg-slate-900 border-2 border-indigo-500/50 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-3 py-1 bg-indigo-600 text-white font-bold text-[10px] rounded-bl-xl uppercase tracking-wider">
            Óptimo Tangente
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="w-5 h-5 text-indigo-400" />
              <h4 className="font-bold text-white text-base">Máximo Ratio de Sharpe</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Maximiza el exceso de retorno por unidad de volatilidad sobre la tasa $R_f$.
            </p>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Ratio de Sharpe:</span>
                <span className="text-xl font-extrabold text-indigo-400">
                  {maxSharpePortfolio.sharpeRatio.toFixed(3)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Retorno Anualizado $E(R_p)$:</span>
                <span className="text-emerald-400 font-bold">
                  {maxSharpePortfolio.expectedReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Volatilidad Anual ($\sigma_p$):</span>
                <span className="text-amber-400 font-bold">
                  {maxSharpePortfolio.volatility.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Mayor Asignación:
            </span>
            <div className="flex flex-wrap gap-1.5 font-mono">
              {topSharpe.map((item) => (
                <span key={item.ticker} className="px-2 py-0.5 rounded bg-indigo-950/60 text-indigo-300 border border-indigo-500/30 text-[11px]">
                  {item.ticker}: {(item.weight * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 2: Global Minimum Variance Portfolio */}
        <div className="bg-slate-900 border border-emerald-500/40 rounded-2xl p-5 shadow-xl relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 px-3 py-1 bg-emerald-600 text-white font-bold text-[10px] rounded-bl-xl uppercase tracking-wider">
            Menor Riesgo
          </div>

          <div>
            <div className="flex items-center gap-2 mb-2">
              <ShieldCheck className="w-5 h-5 text-emerald-400" />
              <h4 className="font-bold text-white text-base">Mínima Varianza Global</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Punto de la frontera con la menor desviación estándar $\sigma_p$ posible.
            </p>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Volatilidad Anual ($\sigma_p$):</span>
                <span className="text-xl font-extrabold text-emerald-400">
                  {minVariancePortfolio.volatility.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Retorno Anualizado $E(R_p)$:</span>
                <span className="text-slate-200 font-bold">
                  {minVariancePortfolio.expectedReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Ratio de Sharpe:</span>
                <span className="text-indigo-400 font-bold">
                  {minVariancePortfolio.sharpeRatio.toFixed(3)}
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Mayor Asignación:
            </span>
            <div className="flex flex-wrap gap-1.5 font-mono">
              {topMinVar.map((item) => (
                <span key={item.ticker} className="px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-500/30 text-[11px]">
                  {item.ticker}: {(item.weight * 100).toFixed(1)}%
                </span>
              ))}
            </div>
          </div>
        </div>

        {/* Card 3: Equal Weight (1/N) Benchmark */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-xl flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Layers className="w-5 h-5 text-slate-400" />
              <h4 className="font-bold text-white text-base">Portafolio Equitativo (1/N)</h4>
            </div>
            <p className="text-xs text-slate-400 mb-4">
              Benchmark no optimizado con idéntico peso para todos los activos ($1/{tickers.length}$).
            </p>

            <div className="space-y-3 font-mono">
              <div className="flex items-center justify-between p-2 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-xs text-slate-400 font-sans">Ratio de Sharpe:</span>
                <span className="text-xl font-extrabold text-slate-300">
                  {equalWeightPortfolio.sharpeRatio.toFixed(3)}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Retorno Anualizado $E(R_p)$:</span>
                <span className="text-slate-200 font-bold">
                  {equalWeightPortfolio.expectedReturn.toFixed(2)}%
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-sans">Volatilidad Anual ($\sigma_p$):</span>
                <span className="text-slate-300 font-bold">
                  {equalWeightPortfolio.volatility.toFixed(2)}%
                </span>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-slate-800 text-xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold mb-1">
              Ponderación uniforme:
            </span>
            <div className="font-mono text-slate-400 text-[11px]">
              {(100 / tickers.length).toFixed(2)}% por activo ({tickers.length} activos)
            </div>
          </div>
        </div>

      </div>

      {/* Comparative Summary Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Comparativa Directa de Desempeño y Riesgo
        </h4>
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 font-mono">
                <th className="py-2.5 px-3">Portafolio</th>
                <th className="py-2.5 px-3">Retorno Esperado $E(R_p)$</th>
                <th className="py-2.5 px-3">Volatilidad Anual $\sigma_p$</th>
                <th className="py-2.5 px-3">Ratio de Sharpe</th>
                <th className="py-2.5 px-3">Exceso sobre $R_f$ ({riskFreeRate}%)</th>
                <th className="py-2.5 px-3">Enfoque de Inversión</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              <tr>
                <td className="py-2.5 px-3 text-indigo-400 font-bold font-sans flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Máximo Ratio de Sharpe (Tangente)
                </td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">{maxSharpePortfolio.expectedReturn.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-amber-400">{maxSharpePortfolio.volatility.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-indigo-300 font-bold">{maxSharpePortfolio.sharpeRatio.toFixed(3)}</td>
                <td className="py-2.5 px-3 text-emerald-300 font-semibold">
                  +{(maxSharpePortfolio.expectedReturn - riskFreeRate).toFixed(2)}%
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-sans">
                  Eficiencia óptima en términos de rendimiento por unidad de riesgo.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-emerald-400 font-bold font-sans flex items-center gap-1.5">
                  <ShieldCheck className="w-3.5 h-3.5" /> Mínima Varianza Global (GMVP)
                </td>
                <td className="py-2.5 px-3 text-slate-200">{minVariancePortfolio.expectedReturn.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-emerald-400 font-bold">{minVariancePortfolio.volatility.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-slate-300">{minVariancePortfolio.sharpeRatio.toFixed(3)}</td>
                <td className="py-2.5 px-3 text-slate-300">
                  +{(minVariancePortfolio.expectedReturn - riskFreeRate).toFixed(2)}%
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-sans">
                  Máxima protección contra la volatilidad del mercado.
                </td>
              </tr>
              <tr>
                <td className="py-2.5 px-3 text-slate-300 font-bold font-sans flex items-center gap-1.5">
                  <Layers className="w-3.5 h-3.5" /> Equitativo (1/N) Benchmark
                </td>
                <td className="py-2.5 px-3 text-slate-300">{equalWeightPortfolio.expectedReturn.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-slate-400">{equalWeightPortfolio.volatility.toFixed(2)}%</td>
                <td className="py-2.5 px-3 text-slate-400">{equalWeightPortfolio.sharpeRatio.toFixed(3)}</td>
                <td className="py-2.5 px-3 text-slate-400">
                  +{(equalWeightPortfolio.expectedReturn - riskFreeRate).toFixed(2)}%
                </td>
                <td className="py-2.5 px-3 text-slate-400 font-sans">
                  Estrategia pasiva ingenua sin estimación de covarianza.
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
};
