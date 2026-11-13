import React from 'react';
import { RefreshCw, AlertTriangle } from 'lucide-react';
import type { GlobalMarketData } from '../types.ts';
import {
  formatCompactUsd,
  formatDateTimeFa,
  formatPercent,
  formatUsd,
} from '../utils/formatters.ts';

interface MarketStripProps {
  data: GlobalMarketData | null;
  loading: boolean;
  error: string | null;
  onRefresh: () => void;
}

export const MarketStrip: React.FC<MarketStripProps> = ({
  data,
  loading,
  error,
  onRefresh,
}) => {
  const unavailableSources =
    data?.sources.filter((s) => s.status === 'unavailable') || [];

  return (
    <section className="bg-[#0B1120] border-b border-slate-800/80 no-print">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 py-3 flex flex-wrap items-center justify-between gap-4 text-xs">
        {loading && !data ? (
          <div className="flex items-center gap-6 w-full overflow-x-auto py-1">
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse shrink-0" />
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse shrink-0" />
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse shrink-0" />
            <div className="h-4 w-28 bg-slate-800 rounded animate-pulse shrink-0" />
          </div>
        ) : error && !data ? (
          <div className="flex items-center justify-between w-full gap-3 text-rose-400">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>خطا در دریافت داده‌های لحظه‌ای بازار: {error}</span>
            </div>
            <button
              type="button"
              onClick={onRefresh}
              className="px-3 py-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              تلاش مجدد
            </button>
          </div>
        ) : data ? (
          <>
            <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
              {/* BTC */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">BTC:</span>
                {data.btc.available ? (
                  <>
                    <span className="font-mono-num text-slate-100 font-semibold">
                      {formatUsd(data.btc.priceUsd)}
                    </span>
                    <span
                      className={`font-mono-num ${
                        (data.btc.change24h || 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(data.btc.change24h)}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-400">ناموجود</span>
                )}
              </div>

              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">
                ·
              </span>

              {/* ETH */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">ETH:</span>
                {data.eth.available ? (
                  <>
                    <span className="font-mono-num text-slate-100 font-semibold">
                      {formatUsd(data.eth.priceUsd)}
                    </span>
                    <span
                      className={`font-mono-num ${
                        (data.eth.change24h || 0) >= 0
                          ? 'text-emerald-400'
                          : 'text-rose-400'
                      }`}
                    >
                      {formatPercent(data.eth.change24h)}
                    </span>
                  </>
                ) : (
                  <span className="text-amber-400">ناموجود</span>
                )}
              </div>

              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">
                ·
              </span>

              {/* BTC.D */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">BTC.D:</span>
                {data.global.available && data.global.btcDominance !== undefined ? (
                  <span className="font-mono-num text-slate-200 font-semibold">
                    {data.global.btcDominance.toFixed(2)}%
                  </span>
                ) : (
                  <span className="text-amber-400">ناموجود</span>
                )}
              </div>

              <span className="text-slate-700 hidden lg:inline" aria-hidden="true">
                ·
              </span>

              {/* Total Market Cap */}
              <div className="hidden lg:flex items-center gap-2">
                <span className="text-slate-400 font-medium">ارزش کل بازار:</span>
                {data.global.available ? (
                  <span className="font-mono-num text-slate-200 font-semibold">
                    {formatCompactUsd(data.global.totalMarketCapUsd)}
                  </span>
                ) : (
                  <span className="text-amber-400">ناموجود</span>
                )}
              </div>

              <span className="text-slate-700 hidden sm:inline" aria-hidden="true">
                ·
              </span>

              {/* Fear & Greed */}
              <div className="flex items-center gap-2">
                <span className="text-slate-400 font-medium">شاخص ترس و طمع:</span>
                {data.fearAndGreed.available ? (
                  <span
                    className={`font-semibold ${
                      (data.fearAndGreed.value || 50) >= 60
                        ? 'text-emerald-400'
                        : (data.fearAndGreed.value || 50) <= 40
                          ? 'text-rose-400'
                          : 'text-amber-400'
                    }`}
                  >
                    <span className="font-mono-num">{data.fearAndGreed.value}</span>{' '}
                    ({data.fearAndGreed.classificationFa})
                  </span>
                ) : (
                  <span className="text-amber-400">ناموجود</span>
                )}
              </div>
            </div>

            <div className="flex items-center gap-3 text-slate-400 shrink-0">
              {unavailableSources.length > 0 && (
                <span
                  className="text-amber-400 flex items-center gap-1"
                  title={unavailableSources.map((s) => `${s.name}: ${s.message || 'خطا'}`).join('\n')}
                >
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{unavailableSources.length} منبع موقتاً در دسترس نیست</span>
                </span>
              )}
              <span className="hidden xl:inline tabular-nums">
                به‌روزرسانی: {formatDateTimeFa(data.lastUpdated)}
              </span>
              <button
                type="button"
                onClick={onRefresh}
                disabled={loading}
                aria-label="به‌روزرسانی داده‌های بازار"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-slate-800/80 hover:bg-slate-700 text-slate-200 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                <span>بروزرسانی</span>
              </button>
            </div>
          </>
        ) : null}
      </div>
    </section>
  );
};
