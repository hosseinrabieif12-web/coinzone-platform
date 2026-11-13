import type { ChartAnalysisReport, CombinedDecisionType } from '../types.ts';

export async function readApiJson<T = any>(res: Response, fallbackError: string): Promise<T> {
  const text = await res.text();
  let parsed: any = null;
  try {
    parsed = text ? JSON.parse(text) : null;
  } catch {
    const looksLikeHtml = text.trim().toLowerCase().startsWith('<!doctype') || text.trim().toLowerCase().startsWith('<html');
    throw new Error(
      looksLikeHtml
        ? 'سرویس API سرور پاسخ JSON نداد (در کلودفلر مطمئن شوید پوشه functions و خروجی dist از طریق Connect to Git دیپلوی شده‌اند).'
        : res.ok
          ? 'پاسخ سرور ساختار معتبر JSON نداشت.'
          : `${fallbackError} (کد وضعیت ${res.status})`
    );
  }
  if (!res.ok) {
    throw new Error(parsed?.error || fallbackError);
  }
  return parsed as T;
}

export function formatUsd(val?: number | null): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 'نامشخص';
  if (val >= 1000) {
    return `$${val.toLocaleString('en-US', { maximumFractionDigits: 2 })}`;
  }
  if (val >= 1) {
    return `$${val.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 })}`;
  }
  return `$${val.toLocaleString('en-US', { minimumFractionDigits: 4, maximumFractionDigits: 6 })}`;
}

export function formatCompactUsd(val?: number | null): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 'نامشخص';
  if (val >= 1e12) return `$${(val / 1e12).toFixed(2)}T`;
  if (val >= 1e9) return `$${(val / 1e9).toFixed(2)}B`;
  if (val >= 1e6) return `$${(val / 1e6).toFixed(2)}M`;
  return formatUsd(val);
}

export function formatPercent(val?: number | null): string {
  if (typeof val !== 'number' || !Number.isFinite(val)) return 'نامشخص';
  const sign = val > 0 ? '+' : '';
  return `${sign}${val.toFixed(2)}%`;
}

export function formatDateTimeFa(iso?: string): string {
  if (!iso) return 'نامشخص';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('fa-IR', {
      dateStyle: 'medium',
      timeStyle: 'short',
    }).format(d);
  } catch {
    return d.toLocaleString();
  }
}

export function getDecisionStyle(decision: CombinedDecisionType): {
  bg: string;
  border: string;
  text: string;
  labelFa: string;
} {
  switch (decision) {
    case 'STRONG BUY':
      return {
        bg: 'bg-emerald-500/12',
        border: 'border-emerald-500/40',
        text: 'text-emerald-400',
        labelFa: 'خرید قوی (STRONG BUY)',
      };
    case 'BUY':
      return {
        bg: 'bg-emerald-500/10',
        border: 'border-emerald-500/30',
        text: 'text-emerald-400',
        labelFa: 'خرید (BUY)',
      };
    case 'WAIT':
      return {
        bg: 'bg-amber-500/10',
        border: 'border-amber-500/35',
        text: 'text-amber-400',
        labelFa: 'صبر و انتظار (WAIT)',
      };
    case 'SELL':
      return {
        bg: 'bg-rose-500/10',
        border: 'border-rose-500/30',
        text: 'text-rose-400',
        labelFa: 'فروش (SELL)',
      };
    case 'STRONG SELL':
      return {
        bg: 'bg-rose-500/15',
        border: 'border-rose-500/45',
        text: 'text-rose-400',
        labelFa: 'فروش قوی (STRONG SELL)',
      };
    case 'NO TRADE':
    default:
      return {
        bg: 'bg-slate-800/70',
        border: 'border-slate-600/50',
        text: 'text-slate-300',
        labelFa: 'عدم ورود به معامله (NO TRADE)',
      };
  }
}

export async function processImageFile(file: File): Promise<{
  base64Data: string;
  mimeType: string;
  previewUrl: string;
  thumbnailDataUrl: string;
}> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('خطا در خواندن فایل تصویر'));
    reader.onload = () => {
      const dataUrl = String(reader.result || '');
      const img = new Image();
      img.onerror = () => reject(new Error('فایل انتخاب‌شده یک تصویر معتبر نیست'));
      img.onload = () => {
        // Resize only if larger than 1800px so TradingView candles & text stay crisp while keeping payload fast
        const maxDim = 1800;
        let w = img.width;
        let h = img.height;
        if (w > maxDim || h > maxDim) {
          const ratio = Math.min(maxDim / w, maxDim / h);
          w = Math.round(w * ratio);
          h = Math.round(h * ratio);
        }

        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (!ctx) {
          reject(new Error('خطا در پردازش تصویر'));
          return;
        }
        ctx.drawImage(img, 0, 0, w, h);

        const mimeType = file.type === 'image/jpeg' || file.type === 'image/jpg' ? 'image/jpeg' : 'image/png';
        const optimizedDataUrl = canvas.toDataURL(mimeType, mimeType === 'image/jpeg' ? 0.9 : undefined);
        const base64Data = optimizedDataUrl.split(',')[1] || '';

        // Small thumbnail for localStorage history
        const thumbCanvas = document.createElement('canvas');
        const tw = 320;
        const th = Math.max(160, Math.round((h / w) * tw));
        thumbCanvas.width = tw;
        thumbCanvas.height = th;
        const tCtx = thumbCanvas.getContext('2d');
        tCtx?.drawImage(img, 0, 0, tw, th);
        const thumbnailDataUrl = thumbCanvas.toDataURL('image/jpeg', 0.65);

        resolve({
          base64Data,
          mimeType,
          previewUrl: optimizedDataUrl,
          thumbnailDataUrl,
        });
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

export function buildMarkdownReport(report: ChartAnalysisReport): string {
  const { identification: id, decisionEngine: dec, riskManagement: risk, technicalAnalysis: tech, newsAndFundamental: news, marketConditions: mkt } = report;
  return `# گزارش تحلیلی CRYPTO SCOPE AI — ${id.symbol} (${id.coinNameFa})
تاریخ: ${formatDateTimeFa(report.createdAt)}
صرافی/پلتفرم: ${id.exchange} | تایم‌فریم: ${id.detectedTimeframe} | قیمت: ${id.currentPriceText}

## تصمیم نهایی موتور ترکیبی (۴۵٪ تکنیکال / ۳۰٪ اخبار / ۲۵٪ بازار)
- **تصمیم نهایی:** ${dec.finalDecision} (${dec.finalDecisionFa})
- **سیگنال چارت:** ${dec.chartSignal} (${dec.chartSignalFa})
- **امتیاز اطمینان تحلیلی:** ${dec.confidenceScore} از ۱۰۰
- **احتمال سناریوی صعودی:** ${dec.bullishProbability}% | **احتمال سناریوی نزولی:** ${dec.bearishProbability}%
- **امتیاز وزن‌دهی‌شده کل:** ${dec.weightedBreakdown.combinedScore} (تکنیکال: ${dec.weightedBreakdown.technicalScore} | اخبار: ${dec.weightedBreakdown.newsScore} | بازار: ${dec.weightedBreakdown.marketScore})
- **تضاد بین ماژول‌ها:** ${dec.moduleDisagreements}

### دلایل تصمیم
${dec.decisionReasons.map((r) => `- ${r}`).join('\n')}

### شروط تایید (Confirmation)
${dec.confirmationConditions.map((c) => `- ${c}`).join('\n')}

### شروط ابطال (Invalidation)
${dec.invalidationConditions.map((c) => `- ${c}`).join('\n')}

## مدیریت ریسک و سطوح معاملاتی ${risk.isEstimated ? '(برآورد تحلیلی)' : ''}
- **ناحیه ورود:** ${risk.entryZone}
- **حد ضرر (SL):** ${risk.stopLoss}
- **حد سود ۱ (TP1):** ${risk.takeProfit1}
- **حد سود ۲ (TP2):** ${risk.takeProfit2}
- **حد سود ۳ (TP3):** ${risk.takeProfit3}
- **نسبت ریسک به ریوارد (R:R):** ${risk.riskRewardRatio}
- **سطح ابطال تحلیل:** ${risk.invalidationLevel}

## تحلیل تکنیکال
- **روند کلی:** ${tech.overallTrend}
- **ساختار بازار:** ${tech.marketStructure}
- **حمایت‌ها:** ${tech.supportLevels.join(' ، ')}
- **مقاومت‌ها:** ${tech.resistanceLevels.join(' ، ')}
- **RSI:** ${tech.rsi}
- **MACD:** ${tech.macd}
- **میانگین‌های متحرک (EMA):** ${tech.movingAverages}
- **Bollinger Bands:** ${tech.bollingerBands}
- **حجم معاملات:** ${tech.volumeAnalysis}
- **الگوهای کندلی:** ${tech.candlestickPatterns}
- **الگوهای چارت:** ${tech.chartPatterns}
- **واگرایی‌ها:** ${tech.divergences}
- **فیبوناچی:** ${tech.fibonacciRetracement}
- **نواحی نقدینگی:** ${tech.liquidityZones}

## تحلیل اخبار و فاندامنتال (امتیاز اثر خبری: ${news.impactScore})
- **۲۴ ساعت گذشته:** ${news.last24hSummary}
- **۷ روز گذشته:** ${news.last7dSummary}
- **۳۰ روز گذشته:** ${news.last30dSummary}
- **شایعات در برابر اخبار تاییدشده:** ${news.rumorsVsVerified}

## شرایط کلان بازار
- **روند کلی بازار:** ${mkt.overallMarketTrend}
- **وضعیت بیت‌کوین و اثر بر آلت‌کوین‌ها:** ${mkt.btcDirectionAndAltcoinImpact}
- **رویدادهای فدرال رزرو و اقتصاد کلان:** ${mkt.macroAndFedEvents}

---
*سلب مسئولیت: ${dec.riskDisclaimer}*
`;
}
