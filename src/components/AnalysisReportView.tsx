import React, { useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Download,
  ExternalLink,
  FileText,
  HelpCircle,
  MessageSquare,
  Printer,
  ShieldAlert,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { ChartAnalysisReport } from '../types.ts';
import {
  buildMarkdownReport,
  formatDateTimeFa,
  formatUsd,
  getDecisionStyle,
} from '../utils/formatters.ts';
import { RiskLadderSvg } from './RiskLadderSvg.tsx';

interface AnalysisReportViewProps {
  report: ChartAnalysisReport;
  onAskAiChat: () => void;
  onResubmitWithClarification: (updates: {
    symbol?: string;
    timeframe?: string;
    currentPrice?: string;
  }) => void;
  isReanalyzing: boolean;
}

type ReportSectionTab = 'overview' | 'technical' | 'news' | 'macro';

export const AnalysisReportView: React.FC<AnalysisReportViewProps> = ({
  report,
  onAskAiChat,
  onResubmitWithClarification,
  isReanalyzing,
}) => {
  const [activeSection, setActiveSection] = useState<ReportSectionTab>('overview');
  const [clarifySymbol, setClarifySymbol] = useState('');
  const [clarifyTf, setClarifyTf] = useState('');
  const [clarifyPrice, setClarifyPrice] = useState('');

  if (!report || !report.identification || !report.decisionEngine) {
    return (
      <div className="bg-rose-500/10 border border-rose-500/35 rounded-xl p-5 text-xs text-rose-300">
        ساختار گزارش تحلیلی کامل نیست. لطفاً تحلیل را مجدداً اجرا کنید.
      </div>
    );
  }

  const id = report.identification;
  const dec = report.decisionEngine;
  const breakdown = dec.weightedBreakdown || {
    technicalWeight: 45,
    technicalScore: 0,
    newsWeight: 30,
    newsScore: 0,
    marketWeight: 25,
    marketScore: 0,
    combinedScore: 0,
  };
  const risk = report.riskManagement || ({} as ChartAnalysisReport['riskManagement']);
  const tech = report.technicalAnalysis || ({} as ChartAnalysisReport['technicalAnalysis']);
  const multiTimeframe = report.multiTimeframe || [];
  const news = report.newsAndFundamental || ({ impactScore: 0, items: [] } as unknown as ChartAnalysisReport['newsAndFundamental']);
  const mkt = report.marketConditions || ({} as ChartAnalysisReport['marketConditions']);

  const decisionStyle = getDecisionStyle(dec?.finalDecision || 'NO TRADE');

  const handleDownloadMarkdown = () => {
    const md = buildMarkdownReport(report);
    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-scope-${id.symbol || 'report'}-${Date.now()}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadJson = () => {
    const blob = new Blob([JSON.stringify(report, null, 2)], {
      type: 'application/json;charset=utf-8',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `crypto-scope-${id.symbol || 'report'}-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handlePrintPdf = () => {
    window.print();
  };

  const scoreToBarWidth = (score: number) => `${Math.min(100, Math.abs(score))}%`;

  return (
    <div className="space-y-6">
      {/* Clarification Prompt if Screenshot Lacks Symbol/Timeframe/Price */}
      {id?.needsUserInput && (id.missingInfoQuestions || []).length > 0 && (
        <div className="bg-amber-500/10 border border-amber-500/35 rounded-xl p-5 space-y-4">
          <div className="flex items-start gap-3">
            <HelpCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold text-amber-300">
                برخی اطلاعات کلیدی در تصویر چارت واضح نبود — لطفاً مشخص کنید
              </h3>
              <ul className="list-disc list-inside text-xs text-amber-200/90 space-y-1">
                {(id.missingInfoQuestions || []).map((q, i) => (
                  <li key={i}>{q}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-1">
            <input
              type="text"
              dir="ltr"
              value={clarifySymbol}
              onChange={(e) => setClarifySymbol(e.target.value)}
              placeholder="نماد (مثلاً BTCUSDT)"
              className="px-3 py-2 rounded-lg bg-[#060913] border border-amber-500/30 text-xs text-slate-100 font-mono-num text-left focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              dir="ltr"
              value={clarifyTf}
              onChange={(e) => setClarifyTf(e.target.value)}
              placeholder="تایم‌فریم (مثلاً 4h)"
              className="px-3 py-2 rounded-lg bg-[#060913] border border-amber-500/30 text-xs text-slate-100 font-mono-num text-left focus:outline-none focus:border-amber-400"
            />
            <input
              type="text"
              dir="ltr"
              value={clarifyPrice}
              onChange={(e) => setClarifyPrice(e.target.value)}
              placeholder="قیمت فعلی (اختیاری)"
              className="px-3 py-2 rounded-lg bg-[#060913] border border-amber-500/30 text-xs text-slate-100 font-mono-num text-left focus:outline-none focus:border-amber-400"
            />
            <button
              type="button"
              disabled={isReanalyzing}
              onClick={() =>
                onResubmitWithClarification({
                  symbol: clarifySymbol || undefined,
                  timeframe: clarifyTf || undefined,
                  currentPrice: clarifyPrice || undefined,
                })
              }
              className="px-4 py-2 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs transition-colors cursor-pointer disabled:opacity-50"
            >
              {isReanalyzing ? 'در حال تحلیل مجدد...' : 'تحلیل مجدد با این داده‌ها'}
            </button>
          </div>
        </div>
      )}

      {/* Top Report Header & Decision Engine Hero */}
      <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-6">
        <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
          <div className="space-y-1.5">
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span>{id.exchange}</span>
              <span aria-hidden="true">·</span>
              <span>تایم‌فریم: {id.detectedTimeframe}</span>
              <span aria-hidden="true">·</span>
              <span className="tabular-nums">{formatDateTimeFa(report.createdAt)}</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-extrabold text-slate-100 flex flex-wrap items-center gap-3">
              <span dir="ltr" className="font-mono-num">
                {id.symbol}
              </span>
              <span className="text-slate-400 font-medium text-base">({id.coinNameFa})</span>
            </h2>
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-300 pt-1">
              <span>
                قیمت روی چارت:{' '}
                <strong className="font-mono-num text-slate-100">{id.currentPriceText}</strong>
              </span>
              {id.verifiedLivePriceUsd !== undefined && id.verifiedLivePriceUsd !== null && (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span>
                    قیمت لحظه‌ای تاییدشده:{' '}
                    <strong className="font-mono-num text-blue-400">
                      {formatUsd(id.verifiedLivePriceUsd)}
                    </strong>
                  </span>
                </>
              )}
              {(id.visibleIndicators || []).length > 0 && (
                <>
                  <span className="text-slate-600" aria-hidden="true">
                    ·
                  </span>
                  <span className="text-slate-400">
                    اندیکاتورهای مشاهده‌شده: {(id.visibleIndicators || []).join('، ')}
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Export & Chat Actions */}
          <div className="flex flex-wrap items-center gap-2 no-print">
            <button
              type="button"
              onClick={onAskAiChat}
              className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-purple-600/20 border border-purple-500/40 text-purple-300 hover:bg-purple-600/30 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <MessageSquare className="w-3.5 h-3.5" />
              <span>پرسش از هوش مصنوعی</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadMarkdown}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <FileText className="w-3.5 h-3.5" />
              <span>خروجی Markdown</span>
            </button>
            <button
              type="button"
              onClick={handleDownloadJson}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Download className="w-3.5 h-3.5" />
              <span>JSON</span>
            </button>
            <button
              type="button"
              onClick={handlePrintPdf}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>چاپ / PDF</span>
            </button>
          </div>
        </div>

        {/* Decision Engine Metrics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Primary Signal Card */}
          <div
            className={`lg:col-span-5 rounded-xl border p-5 flex flex-col justify-between gap-4 ${decisionStyle.bg} ${decisionStyle.border}`}
          >
            <div>
              <div className="text-xs font-medium text-slate-400">
                تصمیم نهایی موتور ترکیبی (تکنیکال + اخبار + کلان)
              </div>
              <div className={`text-2xl sm:text-3xl font-extrabold mt-1.5 ${decisionStyle.text}`}>
                {decisionStyle.labelFa}
              </div>
              <div className="text-xs text-slate-300 mt-2">
                سیگنال خالص چارت: <strong className="text-slate-100">{dec.chartSignalFa}</strong> (
                <span className="font-mono-num">{dec.chartSignal}</span>)
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3 pt-4 border-t border-slate-700/40 text-center">
              <div>
                <div className="text-[11px] text-slate-400">امتیاز اطمینان</div>
                <div className="text-lg font-bold font-mono-num text-slate-100 mt-0.5">
                  {dec.confidenceScore}/100
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">احتمال صعودی</div>
                <div className="text-lg font-bold font-mono-num text-emerald-400 mt-0.5">
                  {dec.bullishProbability}%
                </div>
              </div>
              <div>
                <div className="text-[11px] text-slate-400">احتمال نزولی</div>
                <div className="text-lg font-bold font-mono-num text-rose-400 mt-0.5">
                  {dec.bearishProbability}%
                </div>
              </div>
            </div>
          </div>

          {/* 45% / 30% / 25% Weighted Breakdown */}
          <div className="lg:col-span-7 bg-[#070b17] border border-slate-800/80 rounded-xl p-5 flex flex-col justify-between gap-4">
            <div className="flex items-center justify-between gap-2">
              <h3 className="text-sm font-bold text-slate-100">
                وزن‌دهی سه ماژول مستقل تحلیل
              </h3>
              <span className="text-xs font-mono-num text-blue-400 font-semibold">
                امتیاز ترکیبی: {breakdown.combinedScore > 0 ? '+' : ''}
                {breakdown.combinedScore}
              </span>
            </div>

            <div className="space-y-3.5 text-xs">
              {/* Technical 45% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">
                    A. تحلیل تکنیکال (وزن ۴۵٪)
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      breakdown.technicalScore >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {breakdown.technicalScore > 0 ? '+' : ''}
                    {breakdown.technicalScore}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      breakdown.technicalScore >= 0
                        ? 'bg-emerald-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: scoreToBarWidth(breakdown.technicalScore) }}
                  />
                </div>
              </div>

              {/* News 30% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">
                    B. تحلیل اخبار و فاندامنتال (وزن ۳۰٪)
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      breakdown.newsScore >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {breakdown.newsScore > 0 ? '+' : ''}
                    {breakdown.newsScore}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      breakdown.newsScore >= 0
                        ? 'bg-blue-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: scoreToBarWidth(breakdown.newsScore) }}
                  />
                </div>
              </div>

              {/* Market 25% */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <span className="text-slate-300 font-medium">
                    C. شرایط کلان و کلی بازار (وزن ۲۵٪)
                  </span>
                  <span
                    className={`font-mono-num font-semibold ${
                      breakdown.marketScore >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {breakdown.marketScore > 0 ? '+' : ''}
                    {breakdown.marketScore}
                  </span>
                </div>
                <div className="h-2 rounded-full bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full ${
                      breakdown.marketScore >= 0
                        ? 'bg-purple-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: scoreToBarWidth(breakdown.marketScore) }}
                  />
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800/80 text-xs text-slate-300 leading-relaxed">
              <strong className="text-slate-200">تضاد و هم‌راستایی ماژول‌ها: </strong>
              {dec.moduleDisagreements}
            </div>
          </div>
        </div>

        {/* Risk Disclaimer */}
        <div className="px-4 py-3 rounded-lg bg-[#070b17] border border-slate-800 text-xs text-slate-400 flex items-start gap-2.5 leading-relaxed">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <span>{dec.riskDisclaimer}</span>
        </div>
      </div>

      {/* Section Navigation Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 p-1.5 bg-[#0B1120] border border-slate-800 rounded-xl no-print">
        {(
          [
            { id: 'overview', label: 'مدیریت ریسک، دلایل و تایم‌فریم‌ها' },
            { id: 'technical', label: 'تحلیل تکنیکال کامل (۴۵٪)' },
            { id: 'news', label: `اخبار و فاندامنتال (۳۰٪ · امتیاز ${news.impactScore})` },
            { id: 'macro', label: 'شرایط کلان و وضعیت بازار (۲۵٪)' },
          ] as { id: ReportSectionTab; label: string }[]
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveSection(tab.id)}
            className={`px-4 py-2 rounded-lg text-xs sm:text-sm font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeSection === tab.id
                ? 'bg-blue-600 text-white'
                : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/60'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* TAB 1: Overview, Entry & Risk Management, Multi-Timeframe */}
      {activeSection === 'overview' && (
        <div className="space-y-6">
          {/* Risk Management + Visual SVG Ladder */}
          <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-slate-100">
                نقاط ورود و مدیریت ریسک
              </h3>
              <span className="text-xs text-slate-400">
                {risk.isEstimated
                  ? 'وضعیت داده‌ها: برآورد تحلیلی (عدم دسترسی به دیتای دقیق لحظه‌ای در چارت)'
                  : 'وضعیت داده‌ها: مبتنی بر سطوح خوانده‌شده / قیمت تاییدشده'}
              </span>
            </div>

            {risk.estimationNote && (
              <p className="text-xs text-amber-300/90 leading-relaxed">
                {risk.estimationNote}
              </p>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
              <div className="lg:col-span-7 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">ناحیه ورود پیشنهادی</div>
                  <div className="font-mono-num font-bold text-purple-300 mt-1">
                    {risk.entryZone}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">حد ضرر (Stop Loss)</div>
                  <div className="font-mono-num font-bold text-rose-400 mt-1">
                    {risk.stopLoss}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">حد سود ۱ (TP1)</div>
                  <div className="font-mono-num font-bold text-emerald-400 mt-1">
                    {risk.takeProfit1}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">حد سود ۲ (TP2)</div>
                  <div className="font-mono-num font-bold text-emerald-400 mt-1">
                    {risk.takeProfit2}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">حد سود ۳ (TP3)</div>
                  <div className="font-mono-num font-bold text-emerald-400 mt-1">
                    {risk.takeProfit3}
                  </div>
                </div>
                <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">نسبت ریسک به ریوارد (R:R)</div>
                  <div className="font-mono-num font-bold text-blue-400 mt-1">
                    {risk.riskRewardRatio}
                  </div>
                </div>
                <div className="sm:col-span-2 p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80">
                  <div className="text-xs text-slate-400">سطح ابطال تحلیل (Invalidation)</div>
                  <div className="font-mono-num font-semibold text-amber-300 mt-1">
                    {risk.invalidationLevel}
                  </div>
                </div>
              </div>

              <div className="lg:col-span-5">
                <RiskLadderSvg levels={risk.numericLevels} />
              </div>
            </div>
          </div>

          {/* Decision Reasons, Confirmation & Invalidation */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-slate-100 pb-2 border-b border-slate-800/80">
                دلایل اصلی تصمیم
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                {(dec.decisionReasons || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 pb-2 border-b border-slate-800/80 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" />
                <span>شروط تایید سناریو</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                {(dec.confirmationConditions || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-rose-400 pb-2 border-b border-slate-800/80 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4" />
                <span>شروط ابطال تحلیل</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                {(dec.invalidationConditions || []).map((item, idx) => (
                  <li key={idx}>{item}</li>
                ))}
              </ul>
            </div>
          </div>

          {/* Multi-Timeframe Honest Matrix */}
          <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-slate-800/80">
              <h3 className="text-base font-bold text-slate-100">
                تحلیل چند تایم‌فریمی (Multi-Timeframe)
              </h3>
              <span className="text-xs text-slate-400">
                تنها تایم‌فریم‌های دارای اسکرین‌شات تحلیل می‌شوند
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
              {(multiTimeframe || []).map((tf) => (
                <div
                  key={tf.timeframe}
                  className={`p-3.5 rounded-lg border text-xs space-y-2 ${
                    tf.provided
                      ? 'bg-[#070b17] border-slate-700/80'
                      : 'bg-[#060913]/60 border-slate-800/50 opacity-75'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono-num font-bold text-slate-100">{tf.timeframe}</span>
                    <span
                      className={`font-semibold ${
                        tf.bias === 'صعودی'
                          ? 'text-emerald-400'
                          : tf.bias === 'نزولی'
                            ? 'text-rose-400'
                            : tf.bias === 'خنثی'
                              ? 'text-amber-400'
                              : 'text-slate-500'
                      }`}
                    >
                      {tf.bias}
                    </span>
                  </div>
                  <div className="text-[11px] text-slate-400">{tf.trend}</div>
                  <p className="text-slate-300 leading-relaxed">{tf.summary}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: Full Technical Analysis */}
      {activeSection === 'technical' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-emerald-400 flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <TrendingUp className="w-4 h-4" />
                <span>عوامل صعودی (Bullish Factors)</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                {(tech.bullishFactors || []).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-3">
              <h4 className="text-sm font-bold text-rose-400 flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <TrendingDown className="w-4 h-4" />
                <span>عوامل نزولی (Bearish Factors)</span>
              </h4>
              <ul className="space-y-2 text-xs text-slate-300 leading-relaxed list-disc list-inside">
                {(tech.bearishFactors || []).map((f, i) => (
                  <li key={i}>{f}</li>
                ))}
              </ul>
            </div>
          </div>

          <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6">
            <h3 className="text-base font-bold text-slate-100 pb-4 border-b border-slate-800/80">
              جزئیات ۱۶ شاخص و پارامتر تکنیکال
            </h3>
            <div className="divide-y divide-slate-800/70">
              {[
                { label: 'روند کلی (Overall Trend)', val: tech.overallTrend },
                { label: 'ساختار بازار (Market Structure)', val: tech.marketStructure },
                { label: 'حمایت‌های کلیدی (Support)', val: (tech.supportLevels || []).join(' ، ') || 'نامشخص' },
                { label: 'مقاومت‌های کلیدی (Resistance)', val: (tech.resistanceLevels || []).join(' ، ') || 'نامشخص' },
                { label: 'شاخص RSI', val: tech.rsi },
                { label: 'اندیکاتور MACD', val: tech.macd },
                { label: 'میانگین‌های متحرک (EMA 20 / 50 / 100 / 200)', val: tech.movingAverages },
                { label: 'باندهای بولینگر (Bollinger Bands)', val: tech.bollingerBands },
                { label: 'تحلیل حجم معاملات (Volume)', val: tech.volumeAnalysis },
                { label: 'الگوهای کندلی (Candlestick Patterns)', val: tech.candlestickPatterns },
                { label: 'الگوهای کلاسیک چارت (Chart Patterns)', val: tech.chartPatterns },
                { label: 'احتمال شکست صعودی / نزولی (Breakout/Breakdown)', val: tech.breakoutPossibilities },
                { label: 'واگرایی‌های صعودی و نزولی (Divergences)', val: tech.divergences },
                { label: 'اصلاح فیبوناچی (Fibonacci Retracement)', val: tech.fibonacciRetracement },
                { label: 'پرایس اکشن (Price Action)', val: tech.priceAction },
                { label: 'نواحی نقدینگی (Liquidity Zones)', val: tech.liquidityZones },
                { label: 'مومنتوم بازار (Momentum)', val: tech.momentum },
              ].map((row, idx) => (
                <div
                  key={idx}
                  className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6 text-xs"
                >
                  <div className="md:col-span-4 font-semibold text-slate-200">{row.label}</div>
                  <div className="md:col-span-8 text-slate-300 leading-relaxed">{row.val}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: News & Fundamental Analysis (30%) */}
      {activeSection === 'news' && (
        <div className="space-y-6">
          <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  امتیاز تاثیر اخبار و تحلیل فاندامنتال ({id.symbol})
                </h3>
                <p className="text-xs text-slate-400 mt-1">
                  تفکیک اخبار تاییدشده از شایعات در بازه‌های ۲۴ ساعت، ۷ روز و ۳۰ روز گذشته
                </p>
              </div>
              <div className="text-left">
                <div className="text-xs text-slate-400">امتیاز خبر (-100 تا +100)</div>
                <div
                  className={`text-2xl font-extrabold font-mono-num ${
                    news.impactScore >= 15
                      ? 'text-emerald-400'
                      : news.impactScore <= -15
                        ? 'text-rose-400'
                        : 'text-amber-400'
                  }`}
                >
                  {news.impactScore > 0 ? `+${news.impactScore}` : news.impactScore}
                </div>
              </div>
            </div>

            {/* 24h / 7d / 30d Summaries */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-4 rounded-lg bg-[#070b17] border border-slate-800/80 space-y-1.5">
                <div className="font-bold text-blue-400">اخبار ۲۴ ساعت اخیر</div>
                <p className="text-slate-300 leading-relaxed">{news.last24hSummary}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#070b17] border border-slate-800/80 space-y-1.5">
                <div className="font-bold text-purple-400">اخبار ۷ روز گذشته</div>
                <p className="text-slate-300 leading-relaxed">{news.last7dSummary}</p>
              </div>
              <div className="p-4 rounded-lg bg-[#070b17] border border-slate-800/80 space-y-1.5">
                <div className="font-bold text-slate-200">روند خبری ۳۰ روز اخیر</div>
                <p className="text-slate-300 leading-relaxed">{news.last30dSummary}</p>
              </div>
            </div>

            {/* Fundamental Dimensions */}
            <div className="divide-y divide-slate-800/70 text-xs">
              {[
                { label: 'تاثیر اخبار مثبت / منفی / خنثی', val: `مثبت: ${news.positiveNewsImpact} · منفی: ${news.negativeNewsImpact} · خنثی: ${news.neutralNewsImpact}` },
                { label: 'شایعات در برابر اخبار تاییدشده', val: news.rumorsVsVerified },
                { label: 'همکاری‌ها و آپدیت‌های فنی', val: news.partnershipsAndUpdates },
                { label: 'لیست‌شدن یا حذف از صرافی‌ها (Listings/Delistings)', val: news.listingsAndDelistings },
                { label: 'تحولات رگولاتوری و قانونی', val: news.regulatoryDevelopments },
                { label: 'رخدادهای امنیتی و مشکلات صرافی‌ها', val: news.securityIncidents },
                { label: 'آنلاک توکن و تغییرات عرضه (Token Unlocks)', val: news.tokenUnlocksAndSupply },
                { label: 'سرمایه‌گذاری نهادی و جریان ETF', val: news.institutionalAndEtf },
                { label: 'اثر کوتاه‌مدت در برابر بلندمدت', val: `کوتاه‌مدت: ${news.shortTermImpact} | بلندمدت: ${news.longTermImpact}` },
              ].map((row, idx) => (
                <div key={idx} className="py-3 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6">
                  <div className="md:col-span-4 font-semibold text-slate-200">{row.label}</div>
                  <div className="md:col-span-8 text-slate-300 leading-relaxed">{row.val}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Itemized News Cards */}
          {(news.items || []).length > 0 && (
            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
              <h4 className="text-sm font-bold text-slate-100">
                اخبار بررسی‌شده مرتبط
              </h4>
              <div className="divide-y divide-slate-800/80">
                {(news.items || []).map((item, idx) => (
                  <div key={`${item.id}-${idx}`} className="py-4 first:pt-0 last:pb-0 space-y-2">
                    <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-semibold text-slate-200">{item.source}</span>
                        <span aria-hidden="true">·</span>
                        <span className="tabular-nums">{formatDateTimeFa(item.publishedAt)}</span>
                        <span aria-hidden="true">·</span>
                        <span>اعتبار: {item.credibilityFa}</span>
                        <span aria-hidden="true">·</span>
                        <span
                          className={
                            item.verificationStatus === 'verified'
                              ? 'text-emerald-400'
                              : item.verificationStatus === 'rumor'
                                ? 'text-amber-400'
                                : 'text-blue-400'
                          }
                        >
                          {item.verificationStatusFa}
                        </span>
                      </div>
                      <span
                        className={`font-mono-num font-bold ${
                          item.impactScore > 0
                            ? 'text-emerald-400'
                            : item.impactScore < 0
                              ? 'text-rose-400'
                              : 'text-slate-400'
                        }`}
                      >
                        اثر: {item.impactScore > 0 ? `+${item.impactScore}` : item.impactScore}
                      </span>
                    </div>
                    <h5 className="text-sm font-semibold text-slate-100">{item.titleFa}</h5>
                    <p className="text-xs text-slate-300 leading-relaxed">{item.summaryFa}</p>
                    <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 pt-1">
                      <span>
                        کوتاه‌مدت: {item.shortTermImpactFa} · بلندمدت: {item.longTermImpactFa}
                      </span>
                      {item.url && (
                        <a
                          href={item.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                        >
                          <span>مشاهده منبع</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: Global Market & Macro Conditions (25%) */}
      {activeSection === 'macro' && (
        <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
          <h3 className="text-base font-bold text-slate-100 pb-3 border-b border-slate-800/80">
            تحلیل شرایط کلی بازار رمزارز و اقتصاد کلان
          </h3>
          <div className="divide-y divide-slate-800/70 text-xs">
            {[
              { label: 'روند کلی بازار کریپتو', val: mkt.overallMarketTrend },
              { label: 'جهت بیت‌کوین و اثر بر آلت‌کوین‌ها', val: mkt.btcDirectionAndAltcoinImpact },
              { label: 'روند اتریوم (ETH)', val: mkt.ethTrend },
              { label: 'دامیننس بیت‌کوین (BTC.D)', val: mkt.btcDominanceAnalysis },
              { label: 'ارزش کل بازار (Total Market Cap)', val: mkt.totalMarketCapAnalysis },
              { label: 'شاخص ترس و طمع (Fear & Greed)', val: mkt.fearAndGreedAnalysis },
              { label: 'حجم و نوسانات بازار', val: mkt.marketVolatilityAndVolume },
              { label: 'تحرکات استیبل‌کوین‌ها (USDT/USDC)', val: mkt.stablecoinMovements },
              { label: 'قدرت نسبی آلت‌کوین‌ها', val: mkt.altcoinStrength },
              { label: 'لیکوئیدیشن، فاندینگ‌ریت و Open Interest', val: mkt.liquidationsFundingOi },
              { label: 'تصمیمات فدرال رزرو و رویدادهای اقتصادی', val: mkt.macroAndFedEvents },
              { label: 'گزارش‌های تورم (CPI) و اشتغال', val: mkt.inflationAndEmployment },
              { label: 'ریسک‌های ژئوپلیتیکی', val: mkt.geopoliticalRisks },
            ].map((row, idx) => (
              <div key={idx} className="py-3.5 grid grid-cols-1 md:grid-cols-12 gap-2 md:gap-6">
                <div className="md:col-span-4 font-semibold text-slate-200">{row.label}</div>
                <div className="md:col-span-8 text-slate-300 leading-relaxed">{row.val}</div>
              </div>
            ))}
          </div>

          {report.groundingUrls && report.groundingUrls.length > 0 && (
            <div className="pt-4 border-t border-slate-800/80 space-y-2">
              <div className="text-xs font-semibold text-slate-400">
                منابع وب بررسی‌شده در تحلیل لحظه‌ای:
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-2 text-xs">
                {report.groundingUrls.map((g, i) => (
                  <a
                    key={i}
                    href={g.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-blue-400 hover:underline"
                  >
                    <span>{g.title}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
