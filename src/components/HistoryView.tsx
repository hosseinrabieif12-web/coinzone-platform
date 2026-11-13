import React, { useState } from 'react';
import { Trash2, Eye, Search, History as HistoryIcon } from 'lucide-react';
import type { AnalysisHistoryEntry } from '../types.ts';
import { formatDateTimeFa, getDecisionStyle } from '../utils/formatters.ts';

interface HistoryViewProps {
  entries: AnalysisHistoryEntry[];
  onLoadEntry: (entry: AnalysisHistoryEntry) => void;
  onDeleteEntry: (id: string) => void;
  onClearAll: () => void;
  onGoToAnalyze: () => void;
}

export const HistoryView: React.FC<HistoryViewProps> = ({
  entries,
  onLoadEntry,
  onDeleteEntry,
  onClearAll,
  onGoToAnalyze,
}) => {
  const [search, setSearch] = useState('');

  const filtered = (entries || []).filter(
    (e) =>
      e &&
      e.id &&
      `${e.symbol || ''} ${e.finalDecision || ''} ${e.finalDecisionFa || ''}`
        .toLowerCase()
        .includes(search.trim().toLowerCase())
  );

  return (
    <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl font-bold text-slate-100">تاریخچه تحلیل‌های ذخیره‌شده</h1>
          <p className="text-xs text-slate-400 mt-1">
            گزارش‌ها به صورت محلی در مرورگر شما ذخیره می‌شوند
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="جستجو در نماد یا سیگنال..."
              className="w-48 pl-3 pr-8 py-2 rounded-lg bg-[#060913] border border-slate-700/80 text-xs text-slate-100 focus:outline-none focus:border-blue-500"
            />
          </div>

          {entries.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg border border-rose-500/35 text-rose-400 hover:bg-rose-500/10 text-xs font-medium transition-colors cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>پاک کردن کل تاریخچه</span>
            </button>
          )}
        </div>
      </div>

      {entries.length === 0 ? (
        <div className="py-12 flex flex-col items-center justify-center text-center space-y-3">
          <div className="w-12 h-12 rounded-xl bg-slate-800/80 border border-slate-700 flex items-center justify-center text-slate-400">
            <HistoryIcon className="w-6 h-6" />
          </div>
          <p className="text-sm font-medium text-slate-300">
            هنوز تحلیلی در تاریخچه ذخیره نشده است
          </p>
          <p className="text-xs text-slate-400 max-w-md">
            پس از آپلود اولین اسکرین‌شات چارت و دریافت گزارش، خلاصه و جزئیات کامل تحلیل به صورت خودکار اینجا ثبت می‌شود.
          </p>
          <button
            type="button"
            onClick={onGoToAnalyze}
            className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer"
          >
            آپلود اولین چارت
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <p className="text-xs text-slate-400 py-8 text-center">
          موردی با عبارت جستجو شده یافت نشد.
        </p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((entry) => {
            const safeDecision = entry.finalDecision || 'NO TRADE';
            const style = getDecisionStyle(safeDecision);
            return (
              <div
                key={entry.id}
                className="bg-[#070b17] border border-slate-800/90 rounded-xl overflow-hidden flex flex-col"
              >
                <div className="h-36 bg-slate-950 border-b border-slate-800/80 relative">
                  {entry.thumbnailDataUrl ? (
                    <img
                      src={entry.thumbnailDataUrl}
                      alt={entry.symbol}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center text-xs text-slate-500">
                      بدون پیش‌نمایش
                    </div>
                  )}
                </div>

                <div className="p-4 flex-1 flex flex-col justify-between gap-3">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between gap-2 text-xs text-slate-400">
                      <span className="font-mono-num">{entry.timeframe || 'نامشخص'}</span>
                      <span className="tabular-nums">{formatDateTimeFa(entry.createdAt)}</span>
                    </div>
                    <div className="flex items-center justify-between gap-2">
                      <h3 className="font-mono-num font-bold text-base text-slate-100">
                        {entry.symbol || 'UNKNOWN'}
                      </h3>
                      <span className={`text-xs font-bold ${style.text}`}>
                        {safeDecision}
                      </span>
                    </div>
                    <div className="text-xs text-slate-400 tabular-nums">
                      اطمینان: {entry.confidenceScore ?? 0}/100 · امتیاز کل:{' '}
                      {(entry.combinedScore ?? 0) > 0 ? `+${entry.combinedScore}` : (entry.combinedScore ?? 0)}
                    </div>
                  </div>

                  <div className="flex items-center justify-between gap-2 pt-3 border-t border-slate-800/80">
                    <button
                      type="button"
                      onClick={() => onLoadEntry(entry)}
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600/20 border border-blue-500/35 text-blue-300 hover:bg-blue-600/30 text-xs font-semibold transition-colors cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>مشاهده گزارش</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDeleteEntry(entry.id)}
                      aria-label="حذف گزارش"
                      className="p-2 rounded-lg bg-slate-800/80 hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
