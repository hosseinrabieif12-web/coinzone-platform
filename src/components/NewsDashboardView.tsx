import React, { useState } from 'react';
import {
  AlertTriangle,
  Calendar,
  ExternalLink,
  Loader2,
  RefreshCw,
  Search,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import type { GlobalMarketData, NewsDashboardData } from '../types.ts';
import { formatDateTimeFa, formatPercent, formatUsd } from '../utils/formatters.ts';

interface NewsDashboardViewProps {
  data: NewsDashboardData | null;
  globalMarket: GlobalMarketData | null;
  loading: boolean;
  error: string | null;
  selectedAsset: string;
  onSelectAsset: (asset: string) => void;
  onRefresh: (asset: string, force?: boolean) => void;
}

type NewsFilter = 'all' | 'positive' | 'negative' | 'neutral' | 'verified' | 'rumor';

const QUICK_ASSETS = ['BTC', 'ETH', 'SOL', 'XRP', 'BNB', 'TON'];

export const NewsDashboardView: React.FC<NewsDashboardViewProps> = ({
  data,
  globalMarket,
  loading,
  error,
  selectedAsset,
  onSelectAsset,
  onRefresh,
}) => {
  const [assetInput, setAssetInput] = useState(selectedAsset);
  const [filter, setFilter] = useState<NewsFilter>('all');

  const handleAssetSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleaned = assetInput.trim().toUpperCase() || 'BTC';
    onSelectAsset(cleaned);
    onRefresh(cleaned, true);
  };

  const filteredNews =
    data?.latestNews.filter((item) => {
      if (filter === 'all') return true;
      if (filter === 'positive') return item.sentiment === 'positive';
      if (filter === 'negative') return item.sentiment === 'negative';
      if (filter === 'neutral') return item.sentiment === 'neutral';
      if (filter === 'verified') return item.verificationStatus === 'verified';
      if (filter === 'rumor') return item.verificationStatus === 'rumor';
      return true;
    }) || [];

  return (
    <div className="space-y-6">
      {/* Header & Asset Selector */}
      <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-100">
              داشبورد اخبار لحظه‌ای و شرایط کلان بازار
            </h1>
            <p className="text-xs sm:text-sm text-slate-400 mt-1">
              رصد مستقیم CoinDesk، Cointelegraph، CryptoCompare، CryptoPanic، CoinGecko، Binance و رویدادهای فدرال رزرو
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <form onSubmit={handleAssetSubmit} className="flex items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  dir="ltr"
                  value={assetInput}
                  onChange={(e) => setAssetInput(e.target.value)}
                  placeholder="BTC, SOL, XRP..."
                  className="w-36 sm:w-44 pl-3 pr-8 py-2 rounded-lg bg-[#060913] border border-slate-700/80 text-xs text-slate-100 font-mono-num text-left focus:outline-none focus:border-blue-500"
                />
              </div>
              <button
                type="submit"
                disabled={loading}
                className="px-3.5 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                تحلیل اخبار ارز
              </button>
            </form>
            <button
              type="button"
              onClick={() => onRefresh(selectedAsset, true)}
              disabled={loading}
              className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>بروزرسانی</span>
            </button>
          </div>
        </div>

        {/* Quick Asset Buttons */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-slate-400 ml-2">ارزهای منتخب:</span>
            {QUICK_ASSETS.map((sym) => (
              <button
                key={sym}
                type="button"
                disabled={loading}
                onClick={() => {
                  setAssetInput(sym);
                  onSelectAsset(sym);
                  onRefresh(sym, true);
                }}
                className={`px-3 py-1 rounded-md text-xs font-mono-num font-semibold transition-colors cursor-pointer ${
                  selectedAsset === sym
                    ? 'bg-purple-600 text-white'
                    : 'bg-[#060913] border border-slate-800 text-slate-300 hover:text-white'
                }`}
              >
                {sym}
              </button>
            ))}
          </div>

          {data && (
            <span className="text-xs text-slate-400 tabular-nums">
              آخرین بروزرسانی: {formatDateTimeFa(data.lastUpdated)}
            </span>
          )}
        </div>

        {/* Source Status Strip */}
        {data?.sources && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-[11px] text-slate-400 pt-1">
            <span className="font-medium text-slate-300">وضعیت منابع زنده:</span>
            {data.sources.map((s, idx) => (
              <span
                key={`${s.name}-${idx}`}
                title={s.message || 'متصل'}
                className={s.status === 'online' ? 'text-emerald-400' : 'text-amber-400'}
              >
                {s.name}: {s.status === 'online' ? 'متصل' : 'ناموجود'}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Loading / Error States */}
      {loading && !data && (
        <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-10 flex flex-col items-center justify-center gap-3 text-slate-300">
          <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
          <p className="text-sm font-medium">
            در حال دریافت و امتیازدهی اخبار زنده و رویدادهای اقتصاد کلان برای {selectedAsset}...
          </p>
        </div>
      )}

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/30 rounded-xl p-4 flex items-center justify-between gap-4 text-xs text-rose-300">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => onRefresh(selectedAsset, true)}
            className="px-3 py-1.5 rounded bg-slate-800 text-slate-200 hover:bg-slate-700 cursor-pointer shrink-0"
          >
            تلاش مجدد
          </button>
        </div>
      )}

      {data && (
        <>
          {/* Summary Row: News Score, Sentiment, BTC Condition, Asset Summary */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-4 space-y-2">
              <div className="text-xs text-slate-400">
                امتیاز کلی اخبار ({data.selectedAsset})
              </div>
              <div
                className={`text-3xl font-extrabold font-mono-num ${
                  data.overallNewsScore >= 15
                    ? 'text-emerald-400'
                    : data.overallNewsScore <= -15
                      ? 'text-rose-400'
                      : 'text-amber-400'
                }`}
              >
                {data.overallNewsScore > 0 ? `+${data.overallNewsScore}` : data.overallNewsScore}
                <span className="text-xs font-normal text-slate-500"> / 100</span>
              </div>
              <div className="text-xs text-slate-400 tabular-nums">
                مثبت: <span className="text-emerald-400 font-semibold">{data.positiveCount}</span>
                {' · '}
                منفی: <span className="text-rose-400 font-semibold">{data.negativeCount}</span>
                {' · '}
                خنثی: <span className="text-slate-300 font-semibold">{data.neutralCount}</span>
              </div>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-blue-400">
                وضعیت بیت‌کوین و دامیننس
              </div>
              {globalMarket?.btc.available ? (
                <div className="flex items-baseline gap-2">
                  <span className="font-mono-num font-bold text-lg text-slate-100">
                    {formatUsd(globalMarket.btc.priceUsd)}
                  </span>
                  <span
                    className={`font-mono-num text-xs ${
                      (globalMarket.btc.change24h || 0) >= 0
                        ? 'text-emerald-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {formatPercent(globalMarket.btc.change24h)}
                  </span>
                </div>
              ) : null}
              <p className="text-xs text-slate-300 leading-relaxed">
                {data.btcConditionSummaryFa}
              </p>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-purple-400">
                احساسات کلی بازار
              </div>
              {globalMarket?.fearAndGreed.available && (
                <div className="text-sm font-bold text-slate-100">
                  <span className="font-mono-num">{globalMarket.fearAndGreed.value}</span>{' '}
                  ({globalMarket.fearAndGreed.classificationFa})
                </div>
              )}
              <p className="text-xs text-slate-300 leading-relaxed">
                {data.marketSentimentSummaryFa}
              </p>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-4 space-y-2">
              <div className="text-xs font-semibold text-slate-200">
                رویدادهای اثرگذار بر {data.selectedAsset}
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {data.assetSpecificSummaryFa}
              </p>
            </div>
          </div>

          {/* Top Positive & Top Negative Highlights */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-emerald-400 flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <TrendingUp className="w-4 h-4" />
                <span>مهم‌ترین اخبار مثبت</span>
              </h2>
              <div className="divide-y divide-slate-800/70">
                {data.topPositiveNews.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">خبر مثبت شاخصی در این بازه ثبت نشد.</p>
                ) : (
                  data.topPositiveNews.map((item, idx) => (
                    <div key={`${item.id}-pos-${idx}`} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>
                          {item.source} · {item.verificationStatusFa}
                        </span>
                        <span className="font-mono-num text-emerald-400 font-bold">
                          +{Math.abs(item.impactScore)}
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-slate-100">{item.titleFa}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.summaryFa}</p>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 space-y-4">
              <h2 className="text-sm font-bold text-rose-400 flex items-center gap-2 pb-2 border-b border-slate-800/80">
                <TrendingDown className="w-4 h-4" />
                <span>مهم‌ترین اخبار منفی و ریسک‌ها</span>
              </h2>
              <div className="divide-y divide-slate-800/70">
                {data.topNegativeNews.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3">خبر منفی بحرانی در این بازه ثبت نشد.</p>
                ) : (
                  data.topNegativeNews.map((item, idx) => (
                    <div key={`${item.id}-neg-${idx}`} className="py-3 first:pt-0 last:pb-0 space-y-1">
                      <div className="flex items-center justify-between gap-2 text-[11px] text-slate-400">
                        <span>
                          {item.source} · {item.verificationStatusFa}
                        </span>
                        <span className="font-mono-num text-rose-400 font-bold">
                          {item.impactScore < 0 ? item.impactScore : `-${item.impactScore}`}
                        </span>
                      </div>
                      <h3 className="text-xs font-semibold text-slate-100">{item.titleFa}</h3>
                      <p className="text-xs text-slate-300 leading-relaxed">{item.summaryFa}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          {/* Upcoming Economic Events */}
          <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <h2 className="text-sm font-bold text-slate-100 flex items-center gap-2 pb-3 border-b border-slate-800/80">
              <Calendar className="w-4 h-4 text-blue-400" />
              <span>رویدادهای اقتصادی و کلان پیش رو (فدرال رزرو، تورم، اشتغال)</span>
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {data.upcomingEconomicEvents.map((ev, idx) => (
                <div
                  key={idx}
                  className="p-4 rounded-lg bg-[#070b17] border border-slate-800/80 space-y-2 text-xs"
                >
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="text-blue-400 font-medium">{ev.dateLabel}</span>
                    <span
                      className={
                        ev.importance === 'high'
                          ? 'text-rose-400 font-semibold'
                          : ev.importance === 'medium'
                            ? 'text-amber-400'
                            : 'text-slate-400'
                      }
                    >
                      اهمیت: {ev.importance === 'high' ? 'بالا' : ev.importance === 'medium' ? 'متوسط' : 'عادی'}
                    </span>
                  </div>
                  <div className="font-bold text-slate-100 text-sm">{ev.title}</div>
                  <p className="text-slate-300 leading-relaxed">{ev.impactOnCryptoFa}</p>
                  <div className="text-[11px] text-slate-400 pt-1">وضعیت: {ev.status}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Full Filterable Latest News Feed */}
          <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
            <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-800/80">
              <h2 className="text-base font-bold text-slate-100">
                جریان لحظه‌ای اخبار رمزارزها
              </h2>
              <div className="flex flex-wrap items-center gap-1 p-1 bg-[#060913] border border-slate-800 rounded-lg">
                {(
                  [
                    { id: 'all', label: 'همه' },
                    { id: 'positive', label: 'مثبت' },
                    { id: 'negative', label: 'منفی' },
                    { id: 'neutral', label: 'خنثی' },
                    { id: 'verified', label: 'تاییدشده' },
                    { id: 'rumor', label: 'شایعه' },
                  ] as { id: NewsFilter; label: string }[]
                ).map((f) => (
                  <button
                    key={f.id}
                    type="button"
                    onClick={() => setFilter(f.id)}
                    className={`px-3 py-1 rounded-md text-xs font-medium transition-colors cursor-pointer whitespace-nowrap shrink-0 ${
                      filter === f.id
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-slate-800/80">
              {filteredNews.length === 0 ? (
                <p className="text-xs text-slate-400 py-6 text-center">
                  خبری با فیلتر انتخاب‌شده یافت نشد.
                </p>
              ) : (
                filteredNews.map((item, idx) => (
                  <article key={`${item.id}-feed-${idx}`} className="py-4 first:pt-0 last:pb-0 space-y-2">
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
                        امتیاز اثر: {item.impactScore > 0 ? `+${item.impactScore}` : item.impactScore}
                      </span>
                    </div>

                    <h3 className="text-sm font-bold text-slate-100">{item.titleFa}</h3>
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
                          <span>مطالعه اصل خبر</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      )}
                    </div>
                  </article>
                ))
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
