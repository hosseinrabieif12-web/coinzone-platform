import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Upload,
  Image as ImageIcon,
  X,
  Layers,
  AlertCircle,
  Loader2,
  ClipboardPaste,
  UploadCloud,
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import type { TimeframeKey, UploadedChartFrame } from '../types.ts';
import { processImageFile } from '../utils/formatters.ts';

interface ChartUploadWorkspaceProps {
  frames: UploadedChartFrame[];
  onFramesChange: (frames: UploadedChartFrame[]) => void;
  symbolHint: string;
  onSymbolHintChange: (v: string) => void;
  timeframeHint: string;
  onTimeframeHintChange: (v: string) => void;
  priceHint: string;
  onPriceHintChange: (v: string) => void;
  notesHint: string;
  onNotesHintChange: (v: string) => void;
  isAnalyzing: boolean;
  error: string | null;
  onAnalyze: () => void;
  onClearAll: () => void;
  onOpenGitHubDeploy: () => void;
}

const TIMEFRAMES: { key: TimeframeKey | 'auto'; label: string }[] = [
  { key: 'auto', label: 'تشخیص خودکار' },
  { key: '5m', label: '5 دقیقه' },
  { key: '15m', label: '15 دقیقه' },
  { key: '1h', label: '1 ساعت' },
  { key: '4h', label: '4 ساعت' },
  { key: '1D', label: 'روزانه (1D)' },
];

const LOADING_STEPS = [
  'خواندن دقیق تصویر چارت و شناسایی کندل‌ها و اندیکاتورهای قابل مشاهده...',
  'استعلام داده‌های زنده قیمت، حجم و فاندینگ‌ریت از Binance و CoinGecko...',
  'تحلیل اخبار ۲۴ ساعت، ۷ روز و ۳۰ روز اخیر و رویدادهای فدرال رزرو...',
  'اجرای موتور تصمیم‌گیری ترکیبی (۴۵٪ تکنیکال · ۳۰٪ اخبار · ۲۵٪ شرایط کلان بازار)...',
];

export const ChartUploadWorkspace: React.FC<ChartUploadWorkspaceProps> = ({
  frames,
  onFramesChange,
  symbolHint,
  onSymbolHintChange,
  timeframeHint,
  onTimeframeHintChange,
  priceHint,
  onPriceHintChange,
  notesHint,
  onNotesHintChange,
  isAnalyzing,
  error,
  onAnalyze,
  onClearAll,
  onOpenGitHubDeploy,
}) => {
  const [isDragging, setIsDragging] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [selectedSlotTf, setSelectedSlotTf] = useState<TimeframeKey | 'auto'>('auto');
  const [loadingStepIdx, setLoadingStepIdx] = useState(0);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isAnalyzing) {
      setLoadingStepIdx(0);
      return;
    }
    const timer = setInterval(() => {
      setLoadingStepIdx((prev) => (prev + 1) % LOADING_STEPS.length);
    }, 3200);
    return () => clearInterval(timer);
  }, [isAnalyzing]);

  const handleFiles = useCallback(
    async (fileList: FileList | File[], targetTf: TimeframeKey | 'auto' = selectedSlotTf) => {
      setUploadError(null);
      const validTypes = ['image/png', 'image/jpeg', 'image/jpg'];
      const incoming: UploadedChartFrame[] = [];

      for (const file of Array.from(fileList)) {
        if (!validTypes.includes(file.type)) {
          setUploadError('فقط فرمت‌های PNG، JPG و JPEG پشتیبانی می‌شوند.');
          continue;
        }
        try {
          const processed = await processImageFile(file);
          incoming.push({
            timeframe: targetTf,
            fileName: file.name || `chart-${Date.now()}.png`,
            mimeType: processed.mimeType,
            base64Data: processed.base64Data,
            previewUrl: processed.previewUrl,
          });
        } catch (err) {
          setUploadError(err instanceof Error ? err.message : 'خطا در پردازش تصویر');
        }
      }

      if (incoming.length > 0) {
        onFramesChange([...frames, ...incoming].slice(0, 5));
      }
    },
    [frames, onFramesChange, selectedSlotTf]
  );

  // Support Ctrl+V paste directly from TradingView / Binance screenshot
  useEffect(() => {
    const onPaste = (e: ClipboardEvent) => {
      if (isAnalyzing) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      const files: File[] = [];
      for (const item of Array.from(items)) {
        if (item.type.startsWith('image/')) {
          const f = item.getAsFile();
          if (f) files.push(f);
        }
      }
      if (files.length > 0) {
        e.preventDefault();
        void handleFiles(files, selectedSlotTf);
      }
    };
    window.addEventListener('paste', onPaste);
    return () => window.removeEventListener('paste', onPaste);
  }, [handleFiles, isAnalyzing, selectedSlotTf]);

  const updateFrameTimeframe = (idx: number, tf: TimeframeKey | 'auto') => {
    const next = [...frames];
    next[idx] = { ...next[idx], timeframe: tf };
    onFramesChange(next);
  };

  const removeFrame = (idx: number) => {
    onFramesChange(frames.filter((_, i) => i !== idx));
  };

  return (
    <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4 pb-5 border-b border-slate-800/80">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 leading-snug">
            تحلیل هوشمند چارت و تصمیم‌گیری ترکیبی بازار
          </h1>
          <p className="text-sm text-slate-400 mt-1.5 max-w-2xl leading-relaxed">
            تصویر نمودار را از TradingView، Binance یا هر صرافی دیگر بارگذاری یا با{' '}
            <span className="font-mono-num text-slate-300">Ctrl+V</span> جای‌گذاری کنید تا تحلیل تکنیکال، اخبار لحظه‌ای و شرایط کلان بازار به صورت هم‌زمان ارزیابی شود.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={onOpenGitHubDeploy}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-[#070b17] border border-slate-700/80 hover:border-blue-500/50 text-xs font-medium text-slate-200 hover:text-blue-300 transition-colors cursor-pointer whitespace-nowrap shrink-0"
          >
            <UploadCloud className="w-3.5 h-3.5 text-blue-400" />
            <span>آپلود خودکار گیت‌هاب</span>
          </button>
          {frames.length > 0 && (
            <button
              type="button"
              onClick={onClearAll}
              disabled={isAnalyzing}
              className="px-3.5 py-2 rounded-lg border border-slate-700/80 text-xs font-medium text-slate-300 hover:text-white hover:bg-slate-800/80 transition-colors cursor-pointer disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              پاک کردن تحلیل
            </button>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-6 items-stretch">
        {/* Right column in RTL: Upload & Uploaded Previews */}
        <div className="lg:col-span-7 flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <span className="text-xs font-medium text-slate-300">
              انتخاب تایم‌فریم برای تصویر بعدی (پشتیبانی از تحلیل چند تایم‌فریمی تا ۵ تصویر):
            </span>
            <div className="flex flex-wrap items-center gap-1 p-1 bg-[#060913] border border-slate-800 rounded-lg">
              {TIMEFRAMES.map((tf) => (
                <button
                  key={tf.key}
                  type="button"
                  onClick={() => setSelectedSlotTf(tf.key)}
                  className={`px-2.5 py-1 rounded-md text-xs font-medium transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selectedSlotTf === tf.key
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tf.label}
                </button>
              ))}
            </div>
          </div>

          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files?.length) {
                void handleFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => !isAnalyzing && fileInputRef.current?.click()}
            className={`relative flex-1 min-h-[230px] rounded-xl border-2 border-dashed transition-colors flex flex-col items-center justify-center p-6 text-center cursor-pointer ${
              isDragging
                ? 'border-blue-500 bg-blue-500/10'
                : 'border-slate-700/80 bg-[#070b17] hover:border-blue-500/60 hover:bg-[#090f20]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/jpg"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files?.length) {
                  void handleFiles(e.target.files);
                  e.target.value = '';
                }
              }}
            />

            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400 mb-3">
              <Upload className="w-6 h-6" />
            </div>

            <p className="text-sm font-semibold text-slate-100">
              اسکرین‌شات چارت را اینجا رها کنید یا برای انتخاب کلیک کنید
            </p>
            <p className="text-xs text-slate-400 mt-1.5 flex items-center justify-center gap-2">
              <span>فرمت‌های مجاز: PNG, JPG, JPEG</span>
              <span aria-hidden="true">·</span>
              <span className="inline-flex items-center gap-1 text-purple-400">
                <ClipboardPaste className="w-3.5 h-3.5" />
                امکان Paste مستقیم تصویر
              </span>
            </p>
          </div>

          {/* Uploaded Chart Frames Preview */}
          {frames.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {frames.map((frame, idx) => (
                <div
                  key={`${frame.fileName}-${idx}`}
                  className="bg-[#070b17] border border-slate-800 rounded-lg p-2.5 flex flex-col gap-2"
                >
                  <div className="relative h-36 rounded-md overflow-hidden bg-slate-950 border border-slate-800/80">
                    <img
                      src={frame.previewUrl}
                      alt={frame.fileName}
                      className="w-full h-full object-contain"
                    />
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeFrame(idx);
                      }}
                      disabled={isAnalyzing}
                      aria-label="حذف تصویر"
                      className="absolute top-2 left-2 p-1.5 rounded-md bg-slate-950/90 border border-slate-700 text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between gap-2 text-xs">
                    <span className="text-slate-400 truncate max-w-[130px] flex items-center gap-1.5">
                      <ImageIcon className="w-3.5 h-3.5 shrink-0 text-blue-400" />
                      {frame.fileName}
                    </span>
                    <select
                      value={frame.timeframe}
                      disabled={isAnalyzing}
                      onChange={(e) =>
                        updateFrameTimeframe(idx, e.target.value as TimeframeKey | 'auto')
                      }
                      className="bg-[#0B1120] border border-slate-700 rounded px-2 py-1 text-xs text-slate-200 focus:outline-none focus:border-blue-500"
                    >
                      {TIMEFRAMES.map((tf) => (
                        <option key={tf.key} value={tf.key}>
                          {tf.label}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Left column in RTL: Context Hints & Analyze CTA */}
        <div className="lg:col-span-5 flex flex-col justify-between gap-4 bg-[#070b17] border border-slate-800/80 rounded-xl p-4 sm:p-5">
          <div className="space-y-4">
            <div className="flex items-center gap-2 text-sm font-semibold text-slate-200 pb-2 border-b border-slate-800/80">
              <Layers className="w-4 h-4 text-purple-400" />
              <span>اطلاعات تکمیلی چارت (اختیاری)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  نماد ارز (اگر روی تصویر خوانا نیست)
                </label>
                <input
                  type="text"
                  dir="ltr"
                  value={symbolHint}
                  onChange={(e) => onSymbolHintChange(e.target.value)}
                  placeholder="مثلاً BTCUSDT یا SOL"
                  disabled={isAnalyzing}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono-num text-left"
                />
              </div>

              <div>
                <label className="block text-xs text-slate-400 mb-1.5">
                  تایم‌فریم اصلی
                </label>
                <select
                  value={timeframeHint}
                  onChange={(e) => onTimeframeHintChange(e.target.value)}
                  disabled={isAnalyzing}
                  className="w-full px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-slate-100 focus:outline-none focus:border-blue-500"
                >
                  <option value="">تشخیص از روی تصویر</option>
                  <option value="5m">۵ دقیقه (5m)</option>
                  <option value="15m">۱۵ دقیقه (15m)</option>
                  <option value="1h">۱ ساعت (1h)</option>
                  <option value="4h">۴ ساعت (4h)</option>
                  <option value="1D">روزانه (1D)</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                قیمت فعلی بازار (در صورت نبود محور قیمت در اسکرین‌شات)
              </label>
              <input
                type="text"
                dir="ltr"
                value={priceHint}
                onChange={(e) => onPriceHintChange(e.target.value)}
                placeholder="مثلاً 92450"
                disabled={isAnalyzing}
                className="w-full px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 font-mono-num text-left"
              />
            </div>

            <div>
              <label className="block text-xs text-slate-400 mb-1.5">
                توضیحات یا تمرکز تحلیل شما
              </label>
              <textarea
                rows={2}
                value={notesHint}
                onChange={(e) => onNotesHintChange(e.target.value)}
                placeholder="مثلاً: قصد ورود اسپات یا فیوچرز با اهرم پایین دارم؛ واگرایی RSI بررسی شود..."
                disabled={isAnalyzing}
                className="w-full px-3 py-2 rounded-lg bg-[#0B1120] border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-600 focus:outline-none focus:border-blue-500 resize-none"
              />
            </div>
          </div>

          <div className="space-y-3 pt-2">
            {(uploadError || error) && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 leading-relaxed">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{uploadError || error}</span>
              </div>
            )}

            <button
              type="button"
              onClick={onAnalyze}
              disabled={isAnalyzing || frames.length === 0}
              className="w-full py-3 px-4 rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm transition-all disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-blue-950/40"
            >
              {isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>در حال تحلیل جامع تکنیکال و بنیادی...</span>
                </>
              ) : (
                <span>شروع تحلیل هوشمند چارت و اخبار</span>
              )}
            </button>

            <AnimatePresence>
              {isAnalyzing && (
                <motion.div
                  initial={{ opacity: 0, y: 4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  className="p-3 rounded-lg bg-[#0B1120] border border-blue-500/30 text-xs text-blue-300 space-y-2"
                >
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span>مرحله {loadingStepIdx + 1} از {LOADING_STEPS.length}</span>
                    <span>مدل تحلیلی + داده‌های زنده بازار</span>
                  </div>
                  <p className="font-medium leading-relaxed">{LOADING_STEPS[loadingStepIdx]}</p>
                  <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-l from-blue-500 to-purple-500 transition-all duration-500"
                      style={{
                        width: `${((loadingStepIdx + 1) / LOADING_STEPS.length) * 100}%`,
                      }}
                    />
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};
