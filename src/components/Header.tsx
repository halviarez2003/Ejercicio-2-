import React from 'react';
import { 
  PieChart, 
  FileSpreadsheet, 
  Sparkles, 
  ShieldCheck, 
  TrendingUp, 
  SlidersHorizontal,
  RefreshCw,
  Layers
} from 'lucide-react';
import { ProcessedMarketData, OptimizationResults } from '../types';
import { exportToExcel } from '../utils/exportUtils';

interface HeaderProps {
  processedData: ProcessedMarketData | null;
  optimizationResults: OptimizationResults | null;
  onSelectPreset: (tickers: string[]) => void;
  activePreset: string;
}

export const Header: React.FC<HeaderProps> = ({
  processedData,
  optimizationResults,
  onSelectPreset,
  activePreset,
}) => {
  const handleExportExcel = () => {
    if (!processedData) return;
    exportToExcel(processedData, optimizationResults);
  };

  const presets = [
    { id: 'tech_growth', label: 'MegaCap Tech', tickers: ['AAPL', 'MSFT', 'NVDA', 'GOOGL', 'AMZN'] },
    { id: 'balanced', label: 'Clásico 60/40 & Oro', tickers: ['SPY', 'QQQ', 'TLT', 'GLD', 'JPM'] },
    { id: 'all_weather', label: 'All-Weather Diversificado', tickers: ['SPY', 'TLT', 'GLD', 'XOM', 'JNJ'] },
    { id: 'dividend_value', label: 'Defensivo & Valor', tickers: ['JNJ', 'JPM', 'XOM', 'WMT', 'SPY'] },
  ];

  return (
    <header className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        
        {/* Title & Brand */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 via-sky-600 to-emerald-500 p-0.5 shadow-lg shadow-indigo-500/20 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[10px] flex items-center justify-center">
              <PieChart className="w-5 h-5 text-sky-400" />
            </div>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-lg font-bold text-white tracking-tight">
                Optimizador de Portafolios
              </h1>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 flex items-center gap-1">
                <ShieldCheck className="w-3 h-3" />
                Markowitz MPT
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Frontera Eficiente • Cierre Ajustado • Máximo Sharpe & Mínima Varianza
            </p>
          </div>
        </div>

        {/* Portfolios Quick Presets & Export Actions */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          
          {/* Preset Buttons */}
          <div className="hidden lg:flex items-center gap-1 bg-slate-950/80 p-1 rounded-xl border border-slate-800 text-xs">
            <span className="text-[11px] text-slate-400 px-2 flex items-center gap-1">
              <Layers className="w-3.5 h-3.5 text-indigo-400" />
              Presets:
            </span>
            {presets.map((p) => (
              <button
                key={p.id}
                id={`preset-btn-${p.id}`}
                onClick={() => onSelectPreset(p.tickers)}
                className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer text-xs font-medium ${
                  activePreset === p.id
                    ? 'bg-indigo-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>

          {/* Export to Excel (.xlsx) button */}
          <button
            id="export-excel-btn"
            onClick={handleExportExcel}
            disabled={!processedData}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 active:scale-95 text-white transition-all shadow-md shadow-emerald-900/30 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            title="Exportar base de datos histórica, retornos, matrices y portafolios óptimos a Excel"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

        </div>

      </div>
    </header>
  );
};
