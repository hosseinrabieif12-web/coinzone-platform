import { useCallback, useEffect, useState } from 'react';
import { TopBar, type AppTab } from './components/TopBar.tsx';
import { readApiJson } from './utils/formatters.ts';
import { MarketStrip } from './components/MarketStrip.tsx';
import { ChartUploadWorkspace } from './components/ChartUploadWorkspace.tsx';
import { AnalysisReportView } from './components/AnalysisReportView.tsx';
import { NewsDashboardView } from './components/NewsDashboardView.tsx';
import { AiChatView } from './components/AiChatView.tsx';
import { HistoryView } from './components/HistoryView.tsx';
import { GitHubDeployView } from './components/GitHubDeployView.tsx';
import type {
  AnalysisHistoryEntry,
  ChartAnalysisReport,
  ChatMessage,
  GlobalMarketData,
  NewsDashboardData,
  UploadedChartFrame,
} from './types.ts';

const HISTORY_STORAGE_KEY = 'crypto_scope_ai_history_v1';

function loadSavedHistory(): AnalysisHistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item) =>
        item &&
        typeof item.id === 'string' &&
        item.report &&
        item.report.identification &&
        item.report.decisionEngine &&
        item.report.decisionEngine.weightedBreakdown &&
        item.report.technicalAnalysis &&
        item.report.riskManagement
    );
  } catch {
    return [];
  }
}

function saveHistory(entries: AnalysisHistoryEntry[]) {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(entries.slice(0, 20)));
  } catch {
    // Ignore storage quota errors gracefully
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<AppTab>('analyze');

  // Global market strip state
  const [globalMarket, setGlobalMarket] = useState<GlobalMarketData | null>(null);
  const [marketLoading, setMarketLoading] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);

  // Chart upload & analysis state
  const [frames, setFrames] = useState<UploadedChartFrame[]>([]);
  const [symbolHint, setSymbolHint] = useState('');
  const [timeframeHint, setTimeframeHint] = useState('');
  const [priceHint, setPriceHint] = useState('');
  const [notesHint, setNotesHint] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [currentReport, setCurrentReport] = useState<ChartAnalysisReport | null>(null);

  // News Dashboard state
  const [newsAsset, setNewsAsset] = useState('BTC');
  const [newsData, setNewsData] = useState<NewsDashboardData | null>(null);
  const [newsLoading, setNewsLoading] = useState(false);
  const [newsError, setNewsError] = useState<string | null>(null);

  // Chat state
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  // Local History state
  const [history, setHistory] = useState<AnalysisHistoryEntry[]>(() => loadSavedHistory());

  const loadGlobalMarket = useCallback(async (force = false) => {
    setMarketLoading(true);
    setMarketError(null);
    try {
      const res = await fetch(`/api/market/global${force ? '?refresh=1' : ''}`);
      const data = await readApiJson<GlobalMarketData>(res, 'خطا در دریافت داده‌های بازار');
      if (!data || !data.btc || !data.eth || !data.global || !data.fearAndGreed) {
        throw new Error('پاسخ سرویس بازار ناقص است؛ در حال استفاده از حالت آفلاین.');
      }
      setGlobalMarket(data);
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : 'خطا در اتصال به سرور');
    } finally {
      setMarketLoading(false);
    }
  }, []);

  const loadNewsDashboard = useCallback(async (asset = 'BTC', force = false) => {
    setNewsLoading(true);
    setNewsError(null);
    try {
      const res = await fetch(
        `/api/news?asset=${encodeURIComponent(asset)}${force ? '&refresh=1' : ''}`
      );
      const data = await readApiJson<NewsDashboardData>(res, 'خطا در دریافت اخبار بازار');
      setNewsData(data);
    } catch (err) {
      setNewsError(err instanceof Error ? err.message : 'خطای دریافت اخبار');
    } finally {
      setNewsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadGlobalMarket(false);
  }, [loadGlobalMarket]);

  useEffect(() => {
    if (activeTab === 'news' && !newsData && !newsLoading && !newsError) {
      void loadNewsDashboard(newsAsset, false);
    }
  }, [activeTab, newsData, newsLoading, newsError, newsAsset, loadNewsDashboard]);

  const runAnalysis = async (overrideHints?: {
    symbol?: string;
    timeframe?: string;
    currentPrice?: string;
  }) => {
    if (frames.length === 0) {
      setAnalysisError('لطفاً ابتدا حداقل یک تصویر چارت بارگذاری کنید.');
      return;
    }
    setIsAnalyzing(true);
    setAnalysisError(null);

    const effSymbol = overrideHints?.symbol ?? symbolHint;
    const effTf = overrideHints?.timeframe ?? timeframeHint;
    const effPrice = overrideHints?.currentPrice ?? priceHint;

    if (overrideHints?.symbol) setSymbolHint(overrideHints.symbol);
    if (overrideHints?.timeframe) setTimeframeHint(overrideHints.timeframe);
    if (overrideHints?.currentPrice) setPriceHint(overrideHints.currentPrice);

    try {
      const res = await fetch('/api/analyze-chart', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          frames: frames.map((f) => ({
            timeframe: f.timeframe,
            mimeType: f.mimeType,
            base64Data: f.base64Data,
          })),
          userHints: {
            symbol: effSymbol.trim() || undefined,
            timeframe: effTf.trim() || undefined,
            currentPrice: effPrice.trim() || undefined,
            notes: notesHint.trim() || undefined,
          },
        }),
      });
      const report = await readApiJson<ChartAnalysisReport>(res, 'خطا در تحلیل چارت');
      setCurrentReport(report);

      // Update news asset if identified cleanly
      if (report.identification.symbol && report.identification.symbol !== 'UNKNOWN') {
        setNewsAsset(report.identification.symbol.replace(/USDT|USD|PERP/gi, '') || 'BTC');
      }

      // Create small thumbnail for local history
      let thumbUrl = '';
      try {
        const img = new Image();
        img.src = frames[0].previewUrl;
        await new Promise((r) => {
          img.onload = r;
          img.onerror = r;
        });
        const c = document.createElement('canvas');
        c.width = 300;
        c.height = 170;
        c.getContext('2d')?.drawImage(img, 0, 0, 300, 170);
        thumbUrl = c.toDataURL('image/jpeg', 0.6);
      } catch {
        thumbUrl = '';
      }

      const entry: AnalysisHistoryEntry = {
        id: report.id,
        createdAt: report.createdAt,
        symbol: report.identification.symbol || 'UNKNOWN',
        timeframe: report.identification.detectedTimeframe || 'نامشخص',
        finalDecision: report.decisionEngine.finalDecision,
        finalDecisionFa: report.decisionEngine.finalDecisionFa,
        confidenceScore: report.decisionEngine.confidenceScore,
        combinedScore: report.decisionEngine.weightedBreakdown.combinedScore,
        thumbnailDataUrl: thumbUrl,
        report,
      };

      const nextHistory = [entry, ...history.filter((h) => h.id !== entry.id)].slice(0, 20);
      setHistory(nextHistory);
      saveHistory(nextHistory);

      // Reset chat messages for fresh report context
      setChatMessages([]);
    } catch (err) {
      setAnalysisError(err instanceof Error ? err.message : 'خطا در تحلیل چارت');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleClearAnalysis = () => {
    setFrames([]);
    setSymbolHint('');
    setTimeframeHint('');
    setPriceHint('');
    setNotesHint('');
    setCurrentReport(null);
    setAnalysisError(null);
    setChatMessages([]);
  };

  const handleNewAnalysis = () => {
    handleClearAnalysis();
    setActiveTab('analyze');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleLoadHistoryEntry = (entry: AnalysisHistoryEntry) => {
    setCurrentReport(entry.report);
    setChatMessages([]);
    setActiveTab('analyze');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDeleteHistoryEntry = (id: string) => {
    const next = history.filter((h) => h.id !== id);
    setHistory(next);
    saveHistory(next);
  };

  const handleClearAllHistory = () => {
    setHistory([]);
    saveHistory([]);
  };

  return (
    <div className="min-h-screen flex flex-col bg-[#060913] text-slate-100">
      <TopBar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onNewAnalysis={handleNewAnalysis}
        historyCount={history.length}
      />

      <MarketStrip
        data={globalMarket}
        loading={marketLoading}
        error={marketError}
        onRefresh={() => void loadGlobalMarket(true)}
      />

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {activeTab === 'analyze' && (
          <>
            <div className="no-print">
              <ChartUploadWorkspace
                frames={frames}
                onFramesChange={setFrames}
                symbolHint={symbolHint}
                onSymbolHintChange={setSymbolHint}
                timeframeHint={timeframeHint}
                onTimeframeHintChange={setTimeframeHint}
                priceHint={priceHint}
                onPriceHintChange={setPriceHint}
                notesHint={notesHint}
                onNotesHintChange={setNotesHint}
                isAnalyzing={isAnalyzing}
                error={analysisError}
                onAnalyze={() => void runAnalysis()}
                onClearAll={handleClearAnalysis}
                onOpenGitHubDeploy={() => setActiveTab('github')}
              />
            </div>

            {currentReport && (
              <AnalysisReportView
                report={currentReport}
                onAskAiChat={() => setActiveTab('chat')}
                onResubmitWithClarification={(updates) => void runAnalysis(updates)}
                isReanalyzing={isAnalyzing}
              />
            )}
          </>
        )}

        {activeTab === 'news' && (
          <NewsDashboardView
            data={newsData}
            globalMarket={globalMarket}
            loading={newsLoading}
            error={newsError}
            selectedAsset={newsAsset}
            onSelectAsset={setNewsAsset}
            onRefresh={(asset, force) => void loadNewsDashboard(asset, force)}
          />
        )}

        {activeTab === 'chat' && (
          <AiChatView
            report={currentReport}
            globalMarket={globalMarket}
            messages={chatMessages}
            onMessagesChange={setChatMessages}
          />
        )}

        {activeTab === 'history' && (
          <HistoryView
            entries={history}
            onLoadEntry={handleLoadHistoryEntry}
            onDeleteEntry={handleDeleteHistoryEntry}
            onClearAll={handleClearAllHistory}
            onGoToAnalyze={() => setActiveTab('analyze')}
          />
        )}

        {activeTab === 'github' && <GitHubDeployView />}
      </main>

      <footer className="border-t border-slate-800/80 py-5 px-4 sm:px-6 text-xs text-slate-500 no-print">
        <div className="max-w-[1440px] mx-auto flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong dir="ltr" className="text-slate-300 font-semibold">
              CRYPTO SCOPE AI
            </strong>{' '}
            · دستیار تحلیلی چارت، اخبار و شرایط کلان بازار رمزارزها
          </span>
          <span>
            تمام تحلیل‌ها جنبه آموزشی و تحلیلی دارند و به هیچ عنوان تضمین سود یا سیگنال قطعی مالی نیستند.
          </span>
        </div>
      </footer>
    </div>
  );
}
