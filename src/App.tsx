import React, { useState, useMemo, useEffect } from 'react';
import { 
  Database, 
  Activity, 
  Target, 
  Compass, 
  PieChart, 
  FileSpreadsheet, 
  HelpCircle,
  ShieldCheck,
  TrendingUp
} from 'lucide-react';
import { 
  ActiveModuleTab, 
  ProcessedMarketData, 
  OptimizationResults, 
  PortfolioPoint 
} from './types';
import { getAlignedMarketData } from './data/dataFetcher';
import { processMarketData } from './math/statisticsEngine';
import { runMarkowitzOptimization } from './math/markowitzOptimizer';
import { Header } from './components/Header';
import { Module1DataIngestion } from './components/Module1DataIngestion';
import { Module2DataProcessing } from './components/Module2DataProcessing';
import { Module3Optimization } from './components/Module3Optimization';
import { EfficientFrontierChart } from './components/EfficientFrontierChart';
import { PortfolioDistributionChart } from './components/PortfolioDistributionChart';
import { InteractivePortfolioSimulator } from './components/InteractivePortfolioSimulator';
import { exportToExcel } from './utils/exportUtils';

export default function App() {
  // Navigation tab state
  const [activeTab, setActiveTab] = useState<ActiveModuleTab>('full_dashboard');

  // Selected tickers state (Diverse initial basket)
  const [selectedTickers, setSelectedTickers] = useState<string[]>([
    'SPY',
    'AAPL',
    'MSFT',
    'NVDA',
    'JPM',
    'TLT',
  ]);

  // Date range state (default 2 years)
  const [startDate, setStartDate] = useState<string>('2023-01-03');
  const [endDate, setEndDate] = useState<string>('2026-03-06');

  // Custom uploaded file state
  const [customData, setCustomData] = useState<{
    dates: string[];
    rows: Record<string, number>[];
    tickers: string[];
    filename: string;
  } | null>(null);

  // Risk-free rate (Rf % per year)
  const [riskFreeRate, setRiskFreeRate] = useState<number>(4.5);

  // Custom portfolio weights for the interactive simulator
  const [customWeights, setCustomWeights] = useState<number[]>([]);

  // Active preset tracker
  const [activePreset, setActivePreset] = useState<string>('');

  // 1. MÓDULO 1: Align & Ingest Data (Enforcing strictly Adjusted Close)
  const alignedData = useMemo(() => {
    return getAlignedMarketData({
      selectedTickers,
      startDate,
      endDate,
      customData,
    });
  }, [selectedTickers, startDate, endDate, customData]);

  // 2. MÓDULO 2: Process Returns, Volatilities, Covariances, and Correlations
  const processedData: ProcessedMarketData | null = useMemo(() => {
    if (!alignedData || alignedData.tickers.length < 2 || alignedData.dates.length < 10) {
      return null;
    }
    return processMarketData(
      alignedData.tickers,
      alignedData.dates,
      alignedData.prices,
      riskFreeRate
    );
  }, [alignedData, riskFreeRate]);

  // 3. MÓDULO 3: Run Markowitz Optimization (GMVP, Tangency, Efficient Frontier)
  const optimizationResults: OptimizationResults | null = useMemo(() => {
    if (!processedData) return null;
    return runMarkowitzOptimization(
      processedData.annualizedReturns,
      processedData.annualizedCovarianceMatrix,
      riskFreeRate
    );
  }, [processedData, riskFreeRate]);

  // Synchronize custom weights whenever the ticker basket changes
  useEffect(() => {
    if (selectedTickers.length > 0) {
      // Default to Equal Weight 1/N
      setCustomWeights(new Array(selectedTickers.length).fill(1.0 / selectedTickers.length));
    }
  }, [selectedTickers]);

  // Handlers for Tickers
  const handleToggleTicker = (ticker: string) => {
    if (selectedTickers.includes(ticker)) {
      if (selectedTickers.length > 2) {
        setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
      }
    } else {
      setSelectedTickers([...selectedTickers, ticker]);
    }
    setActivePreset('');
  };

  const handleAddCustomTicker = (ticker: string) => {
    if (!selectedTickers.includes(ticker)) {
      setSelectedTickers([...selectedTickers, ticker]);
    }
    setActivePreset('');
  };

  const handleRemoveTicker = (ticker: string) => {
    if (selectedTickers.length > 2) {
      setSelectedTickers(selectedTickers.filter((t) => t !== ticker));
    }
    setActivePreset('');
  };

  const handleSelectPreset = (tickers: string[]) => {
    setSelectedTickers(tickers);
    setActivePreset(tickers.join('-'));
  };

  // Custom portfolio point for live chart plotting
  const customPortfolioPoint: PortfolioPoint | null = useMemo(() => {
    if (!processedData || customWeights.length !== processedData.tickers.length) return null;
    
    let ret = 0;
    for (let i = 0; i < customWeights.length; i++) {
      ret += customWeights[i] * processedData.annualizedReturns[i];
    }
    ret *= 100;

    let variance = 0;
    const N = customWeights.length;
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < N; j++) {
        variance += customWeights[i] * customWeights[j] * processedData.annualizedCovarianceMatrix[i][j];
      }
    }
    const vol = Math.sqrt(Math.max(0, variance)) * 100;
    const sharpe = vol > 1e-4 ? (ret - riskFreeRate) / vol : 0;

    return {
      weights: customWeights,
      expectedReturn: ret,
      volatility: vol,
      sharpeRatio: sharpe,
      label: 'Portafolio Personalizado',
      type: 'custom',
    };
  }, [processedData, customWeights, riskFreeRate]);

  // Tab definitions
  const tabs = [
    {
      id: 'full_dashboard' as ActiveModuleTab,
      label: 'Frontera Eficiente & Dashboard',
      sublabel: 'Visualización Integral',
      icon: Compass,
    },
    {
      id: 'data_ingestion' as ActiveModuleTab,
      label: 'Módulo 1: Ingesta de Datos',
      sublabel: 'Cierre Ajustado & Fechas',
      icon: Database,
    },
    {
      id: 'data_processing' as ActiveModuleTab,
      label: 'Módulo 2: Motor de Procesamiento',
      sublabel: 'Retornos, Covarianza & Correlación',
      icon: Activity,
    },
    {
      id: 'optimization' as ActiveModuleTab,
      label: 'Módulo 3: Motor de Optimización',
      sublabel: 'Markowitz, Sharpe & GMVP',
      icon: Target,
    },
  ];

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans">
      
      {/* 1. Header with Title, Presets & Excel Export */}
      <Header
        processedData={processedData}
        optimizationResults={optimizationResults}
        onSelectPreset={handleSelectPreset}
        activePreset={activePreset}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 space-y-6">
        
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-800 overflow-x-auto scrollbar-none gap-2">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;

            return (
              <button
                key={tab.id}
                id={`tab-nav-${tab.id}`}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-3 px-4 py-3 border-b-2 font-medium text-xs sm:text-sm whitespace-nowrap transition-all cursor-pointer ${
                  isActive
                    ? 'border-indigo-500 text-white bg-slate-900/70 rounded-t-xl shadow-sm'
                    : 'border-transparent text-slate-400 hover:text-slate-200 hover:border-slate-700'
                }`}
              >
                <div className={`p-1.5 rounded-lg ${
                  isActive ? 'bg-indigo-600/30 text-indigo-400' : 'bg-slate-800 text-slate-400'
                }`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="text-left">
                  <div className="font-bold leading-tight">{tab.label}</div>
                  <div className="text-[10px] text-slate-500 font-normal">{tab.sublabel}</div>
                </div>
              </button>
            );
          })}
        </div>

        {/* Tab 1: Full Dashboard (Integrated Efficient Frontier, Allocations & Simulator) */}
        {activeTab === 'full_dashboard' && optimizationResults && processedData && (
          <div className="space-y-6">
            
            {/* Efficient Frontier Interactive Chart */}
            <EfficientFrontierChart
              optimizationResults={optimizationResults}
              processedData={processedData}
              customPortfolio={customPortfolioPoint}
            />

            {/* Allocation Breakdown and Custom Simulator in 2 Columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              <div className="lg:col-span-6">
                <PortfolioDistributionChart
                  optimizationResults={optimizationResults}
                  processedData={processedData}
                  customPortfolio={customPortfolioPoint}
                />
              </div>

              <div className="lg:col-span-6">
                <InteractivePortfolioSimulator
                  processedData={processedData}
                  customWeights={customWeights}
                  onWeightsChange={setCustomWeights}
                  riskFreeRate={riskFreeRate}
                  onApplyPresetWeights={setCustomWeights}
                  maxSharpeWeights={optimizationResults.maxSharpePortfolio.weights}
                  minVarianceWeights={optimizationResults.minVariancePortfolio.weights}
                />
              </div>
            </div>

            {/* Concise summary of key portfolios */}
            <Module3Optimization
              optimizationResults={optimizationResults}
              processedData={processedData}
              riskFreeRate={riskFreeRate}
              onRiskFreeRateChange={setRiskFreeRate}
            />

          </div>
        )}

        {/* Tab 2: Module 1 Data Ingestion */}
        {activeTab === 'data_ingestion' && (
          <Module1DataIngestion
            selectedTickers={selectedTickers}
            onToggleTicker={handleToggleTicker}
            onAddCustomTicker={handleAddCustomTicker}
            onRemoveTicker={handleRemoveTicker}
            startDate={startDate}
            endDate={endDate}
            onDateChange={(start, end) => {
              setStartDate(start);
              setEndDate(end);
            }}
            onUploadCustomData={(data) => {
              setCustomData(data);
              setSelectedTickers(data.tickers.slice(0, 8));
            }}
            uploadedFilename={customData ? customData.filename : null}
            onResetToDefaultData={() => setCustomData(null)}
            processedData={processedData}
          />
        )}

        {/* Tab 3: Module 2 Data Processing */}
        {activeTab === 'data_processing' && processedData && (
          <Module2DataProcessing
            data={processedData}
            riskFreeRate={riskFreeRate}
          />
        )}

        {/* Tab 4: Module 3 Optimization */}
        {activeTab === 'optimization' && optimizationResults && processedData && (
          <div className="space-y-6">
            <Module3Optimization
              optimizationResults={optimizationResults}
              processedData={processedData}
              riskFreeRate={riskFreeRate}
              onRiskFreeRateChange={setRiskFreeRate}
            />

            <PortfolioDistributionChart
              optimizationResults={optimizationResults}
              processedData={processedData}
              customPortfolio={customPortfolioPoint}
            />
          </div>
        )}

      </main>

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-2">
          <span>
            Modelos y Simulaciones Financieras • Optimización de Portafolios (Markowitz MPT)
          </span>
          <span className="font-mono text-[11px] text-slate-400">
            252 días bursátiles • Precios de Cierre Ajustado (Adjusted Close) • Exportación .xlsx y .png
          </span>
        </div>
      </footer>

    </div>
  );
}
