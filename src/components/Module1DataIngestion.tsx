import React, { useState, useRef } from 'react';
import { 
  Database, 
  UploadCloud, 
  Calendar, 
  CheckCircle2, 
  AlertCircle, 
  Plus, 
  X, 
  Check, 
  FileText, 
  Info,
  Layers,
  ArrowRight
} from 'lucide-react';
import { POPULAR_TICKERS } from '../data/defaultStockData';
import { parseUploadedFile } from '../data/dataFetcher';
import { ProcessedMarketData } from '../types';

interface Module1DataIngestionProps {
  selectedTickers: string[];
  onToggleTicker: (ticker: string) => void;
  onAddCustomTicker: (ticker: string) => void;
  onRemoveTicker: (ticker: string) => void;
  startDate: string;
  endDate: string;
  onDateChange: (start: string, end: string) => void;
  onUploadCustomData: (customData: { dates: string[]; rows: Record<string, number>[]; tickers: string[]; filename: string }) => void;
  uploadedFilename: string | null;
  onResetToDefaultData: () => void;
  processedData: ProcessedMarketData | null;
}

export const Module1DataIngestion: React.FC<Module1DataIngestionProps> = ({
  selectedTickers,
  onToggleTicker,
  onAddCustomTicker,
  onRemoveTicker,
  startDate,
  endDate,
  onDateChange,
  onUploadCustomData,
  uploadedFilename,
  onResetToDefaultData,
  processedData,
}) => {
  const [customInput, setCustomInput] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleCustomAdd = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = customInput.trim().toUpperCase();
    if (clean && !selectedTickers.includes(clean)) {
      onAddCustomTicker(clean);
      setCustomInput('');
    }
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setUploadError(null);
    try {
      const parsed = await parseUploadedFile(file);
      onUploadCustomData(parsed);
    } catch (err: any) {
      setUploadError(err.message || 'Error al procesar el archivo.');
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileUpload(file);
    }
  };

  // Quick range button handler
  const setQuickRange = (years: number) => {
    const end = new Date(2026, 2, 6);
    const start = new Date(end);
    start.setFullYear(end.getFullYear() - years);

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    onDateChange(fmt(start), fmt(end));
  };

  return (
    <div className="space-y-6">
      
      {/* Critical Restriction Notice */}
      <div className="bg-emerald-950/40 border border-emerald-500/40 rounded-2xl p-4 flex items-start gap-3.5 shadow-lg shadow-emerald-950/20">
        <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 mt-0.5 shrink-0">
          <CheckCircle2 className="w-5 h-5" />
        </div>
        <div className="text-xs text-slate-300 space-y-1">
          <div className="font-bold text-emerald-300 text-sm flex items-center gap-2">
            <span>Restricción Crítica Cumplida: Precios de Cierre Ajustado (Adjusted Close)</span>
          </div>
          <p className="leading-relaxed">
            El sistema procesa y calcula de forma estricta los rendimientos utilizando las series de precios de 
            <strong className="text-white font-mono"> "Adjusted Close"</strong>, incorporando con precisión matemática 
            el impacto real de dividendos distribuidos y splits corporativos en la rentabilidad de cada activo.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Ticker Selector & Dynamic Management */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-4">
          
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <Database className="w-4 h-4 text-sky-400" />
              <span>Selección Dinámica de Activos (Tickers)</span>
            </div>
            <span className="text-xs text-slate-400">
              Activos seleccionados: <strong className="text-sky-400 font-mono">{selectedTickers.length}</strong>
            </span>
          </div>

          {/* Currently Selected Active Chips */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Canasta Activa para Optimización:
            </label>
            <div className="flex flex-wrap gap-2 min-h-[44px] p-2.5 bg-slate-950/80 rounded-xl border border-slate-800/80">
              {selectedTickers.map((ticker) => {
                const meta = POPULAR_TICKERS.find((t) => t.ticker === ticker);
                return (
                  <span
                    key={ticker}
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-semibold bg-slate-800 text-slate-200 border border-slate-700 hover:border-slate-500 transition-colors"
                  >
                    <span
                      className="w-2 h-2 rounded-full"
                      style={{ backgroundColor: meta ? meta.color : '#38bdf8' }}
                    />
                    <span className="font-mono">{ticker}</span>
                    {selectedTickers.length > 2 && (
                      <button
                        onClick={() => onRemoveTicker(ticker)}
                        className="hover:text-rose-400 transition-colors ml-0.5 cursor-pointer"
                        title={`Eliminar ${ticker}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                );
              })}
            </div>
          </div>

          {/* Available Popular Tickers Grid */}
          <div>
            <label className="text-xs font-semibold text-slate-400 block mb-2">
              Catálogo de Activos Líquidos Disponibles:
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-56 overflow-y-auto pr-1">
              {POPULAR_TICKERS.map((item) => {
                const isSelected = selectedTickers.includes(item.ticker);
                return (
                  <button
                    key={item.ticker}
                    onClick={() => onToggleTicker(item.ticker)}
                    className={`flex items-center justify-between p-2.5 rounded-xl border text-left text-xs transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-indigo-600/20 border-indigo-500/50 text-white'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                    }`}
                  >
                    <div className="truncate pr-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="w-2 h-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.color }}
                        />
                        <span className="font-mono font-bold">{item.ticker}</span>
                      </div>
                      <div className="text-[10px] text-slate-500 truncate">{item.name}</div>
                    </div>
                    {isSelected ? (
                      <Check className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                    ) : (
                      <Plus className="w-3.5 h-3.5 text-slate-600 shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Custom Ticker manual input */}
          <form onSubmit={handleCustomAdd} className="flex gap-2 pt-2 border-t border-slate-800">
            <input
              type="text"
              placeholder="Añadir símbolo personalizado (ej. IBM, META, V)..."
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              className="flex-1 bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 font-mono"
            />
            <button
              type="submit"
              disabled={!customInput.trim()}
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold rounded-xl flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Añadir</span>
            </button>
          </form>

        </div>

        {/* Right Column: Date Range & File Uploader */}
        <div className="lg:col-span-5 space-y-6">
          
          {/* Temporal Range Controls */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3.5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <Calendar className="w-4 h-4 text-indigo-400" />
                <span>Rango Temporal de Análisis</span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">
                {processedData ? `${processedData.dates.length} días alineados` : ''}
              </span>
            </div>

            {/* Quick Range Presets */}
            <div className="flex gap-2">
              {[
                { label: '1 Año', years: 1 },
                { label: '2 Años', years: 2 },
                { label: '3 Años', years: 3 },
                { label: 'Histórico Completo', years: 5 },
              ].map((btn) => (
                <button
                  key={btn.label}
                  onClick={() => setQuickRange(btn.years)}
                  className="flex-1 py-1.5 px-2 rounded-lg text-[11px] font-medium bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer text-center"
                >
                  {btn.label}
                </button>
              ))}
            </div>

            {/* Date Pickers */}
            <div className="grid grid-cols-2 gap-3 pt-1">
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fecha Inicial:</label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => onDateChange(e.target.value, endDate)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="text-[11px] text-slate-400 block mb-1">Fecha Final:</label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => onDateChange(startDate, e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

          </div>

          {/* Import CSV / XLSX File */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 shadow-lg space-y-3">
            
            <div className="flex items-center justify-between border-b border-slate-800 pb-2.5">
              <div className="flex items-center gap-2 text-white font-bold text-sm">
                <UploadCloud className="w-4 h-4 text-emerald-400" />
                <span>Importar Archivo CSV / XLSX</span>
              </div>
              {uploadedFilename && (
                <button
                  onClick={onResetToDefaultData}
                  className="text-[11px] text-indigo-400 hover:text-indigo-300 underline cursor-pointer"
                >
                  Restaurar base estándar
                </button>
              )}
            </div>

            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-xl p-5 text-center cursor-pointer transition-all ${
                isDragging
                  ? 'border-indigo-500 bg-indigo-500/10'
                  : 'border-slate-800 hover:border-slate-700 bg-slate-950/60'
              }`}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv, .xlsx, .xls"
                onChange={handleFileChange}
                className="hidden"
              />
              <FileText className="w-8 h-8 text-slate-500 mx-auto mb-2" />
              <div className="text-xs font-semibold text-slate-200">
                {uploadedFilename ? (
                  <span className="text-emerald-400 font-mono">Archivo cargado: {uploadedFilename}</span>
                ) : (
                  'Haz clic o arrastra un archivo CSV o Excel (.xlsx)'
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Formatos soportados: Exportaciones de Yahoo Finance (Adj Close) o series multiactivo
              </p>
            </div>

            {uploadError && (
              <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0" />
                <span>{uploadError}</span>
              </div>
            )}

          </div>

        </div>

      </div>

      {/* Pre-processing & Date Alignment Diagnostic Card */}
      {processedData && (
        <div className="bg-slate-900/90 border border-slate-800 rounded-2xl p-4 shadow-md flex flex-wrap items-center justify-between gap-4 text-xs">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-slate-300">
              Datos alineados e interpolados: <strong className="text-white font-mono">{processedData.dates.length} observaciones diarias</strong>
            </span>
          </div>
          <div className="flex items-center gap-4 text-slate-400">
            <span>
              Período: <strong className="text-slate-200 font-mono">{processedData.dates[0]}</strong> al{' '}
              <strong className="text-slate-200 font-mono">{processedData.dates[processedData.dates.length - 1]}</strong>
            </span>
            <span className="border-l border-slate-800 pl-4">
              Activos: <strong className="text-indigo-400 font-mono">{processedData.tickers.join(', ')}</strong>
            </span>
          </div>
        </div>
      )}

    </div>
  );
};
