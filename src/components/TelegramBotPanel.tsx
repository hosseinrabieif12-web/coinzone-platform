import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { TelegramConfig, TelegramTestResult } from '../types';
import {
  Bot,
  Send,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  RefreshCw,
  Key,
  Shield,
  HelpCircle,
  Sparkles,
  Trash2,
  Check,
  Smartphone,
  Radio,
  Zap,
  MessageSquare,
  Power,
} from 'lucide-react';

export const TelegramBotPanel: React.FC = () => {
  const [botToken, setBotToken] = useState<string>(() => {
    return localStorage.getItem('coinzone_telegram_token') || '';
  });
  const [adminTelegramId, setAdminTelegramId] = useState<string>(() => {
    return localStorage.getItem('coinzone_telegram_admin_id') || '';
  });
  const [customWebhookUrl, setCustomWebhookUrl] = useState<string>('');
  const [config, setConfig] = useState<TelegramConfig | null>(null);

  const [loading, setLoading] = useState(false);
  const [testResult, setTestResult] = useState<TelegramTestResult | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [showGuide, setShowGuide] = useState(false);

  // Test Message
  const [testChatId, setTestChatId] = useState<string>('');
  const [sendingTest, setSendingTest] = useState(false);
  const [testSuccess, setTestSuccess] = useState<string | null>(null);

  const loadConfig = async () => {
    try {
      const cfg = await api.getTelegramConfig();
      setConfig(cfg);
      if (cfg.adminTelegramId && !adminTelegramId) {
        setAdminTelegramId(cfg.adminTelegramId);
        setTestChatId(cfg.adminTelegramId);
      }
      if (!customWebhookUrl) {
        setCustomWebhookUrl(cfg.webhookUrl || cfg.suggestedWebhookUrl || '');
      }
      if (cfg.botToken || botToken) {
        testBot(botToken || undefined);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    loadConfig();
  }, []);

  const testBot = async (tokenToTest?: string) => {
    const tok = tokenToTest || botToken.trim();
    if (!tok) return;

    setLoading(true);
    setErrorMessage(null);
    try {
      const res = await api.getTelegramInfo(tok);
      setTestResult(res);
      if (res.webhookInfo?.url) {
        setCustomWebhookUrl(res.webhookInfo.url);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setErrorMessage(e.message || 'خطا در ارتباط با سرورهای تلگرام');
    } finally {
      setLoading(false);
    }
  };

  // Save config & automatically start live response engine
  const handleSaveAndActivate = async () => {
    if (!botToken.trim()) {
      alert('لطفاً توکن بات تلگرام (Bot Token) را وارد کنید.');
      return;
    }

    sound.playClick();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      // Save config to backend (which persists to disk and starts Long-Polling)
      await api.saveTelegramConfig({
        botToken: botToken.trim(),
        adminTelegramId: adminTelegramId.trim() || undefined,
      });

      localStorage.setItem('coinzone_telegram_token', botToken.trim());
      if (adminTelegramId.trim()) {
        localStorage.setItem('coinzone_telegram_admin_id', adminTelegramId.trim());
      }

      setStatusMessage('🟢 پاسخ‌گویی هوشمند و زنده ربات تلگرام با موفقیت فعال شد!');
      sound.playWin();
      await testBot(botToken.trim());
      await loadConfig();
    } catch (err: unknown) {
      sound.playError();
      const e = err as Error;
      setErrorMessage(e.message || 'خطا در راه‌اندازی ربات');
    } finally {
      setLoading(false);
    }
  };

  // Activate Cloudflare Webhook (for production deploy)
  const handleSetWebhook = async () => {
    if (!botToken.trim()) {
      alert('لطفاً ابتدا توکن بات تلگرام را وارد کنید.');
      return;
    }

    sound.playClick();
    setLoading(true);
    setErrorMessage(null);
    setStatusMessage(null);

    try {
      const res = await api.setTelegramWebhook({
        botToken: botToken.trim(),
        adminTelegramId: adminTelegramId.trim() || undefined,
        webhookUrl: customWebhookUrl.trim() || undefined,
      });

      setStatusMessage(res.message || 'وب‌هوک تلگرام با موفقیت تنظیم شد!');
      sound.playWin();
      await testBot(botToken.trim());
      await loadConfig();
    } catch (err: unknown) {
      sound.playError();
      const e = err as Error;
      setErrorMessage(e.message || 'خطا در ثبت وب‌هوک');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteWebhook = async () => {
    if (!confirm('آیا از حذف وب‌هوک و تغییر به حالت Long-Polling اطمینان دارید؟')) return;
    sound.playClick();
    setLoading(true);
    try {
      await api.deleteTelegramWebhook(botToken.trim() || undefined);
      setStatusMessage('وب‌هوک حذف شد و سیستم به حالت پاسخ‌گویی مستقیم (Polling) تغییر یافت.');
      sound.playCoin();
      await testBot(botToken.trim());
      await loadConfig();
    } catch (err: unknown) {
      sound.playError();
      const e = err as Error;
      setErrorMessage(e.message || 'خطا در حذف وب‌هوک');
    } finally {
      setLoading(false);
    }
  };

  // Send real test message to Telegram
  const handleSendTestMessage = async () => {
    const targetChat = testChatId.trim() || adminTelegramId.trim();
    if (!botToken.trim()) {
      alert('لطفاً توکن بات را وارد کنید.');
      return;
    }
    if (!targetChat) {
      alert('لطفاً شناسه عددی تلگرام خود (Chat ID) را وارد کنید تا پیام تست به آن ارسال شود.');
      return;
    }

    sound.playClick();
    setSendingTest(true);
    setTestSuccess(null);
    try {
      const res = await api.sendTelegramTestMessage({
        botToken: botToken.trim(),
        chatId: targetChat,
      });
      setTestSuccess(res.message || 'پیام تست با موفقیت ارسال شد! لطفاً تلگرام خود را چک کنید.');
      sound.playWin();
    } catch (err: unknown) {
      sound.playError();
      const e = err as Error;
      alert(e.message || 'خطا در ارسال پیام تست تلگرام. مطمئن شوید قبلاً ربات را استارت زده‌اید.');
    } finally {
      setSendingTest(false);
    }
  };

  const botUsername = testResult?.bot?.username || config?.botUsername;

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="p-6 bg-gradient-to-r from-[#181a24] to-[#12141c] border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-cyan-600/20 border border-cyan-500/40 text-cyan-400 flex items-center justify-center shadow-lg shrink-0">
            <Bot className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>اتصال خودکار و پاسخ‌گویی زنده بات تلگرام (Telegram Bot Engine)</span>
              {(config?.pollingActive || config?.webhookActive) && (
                <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold flex items-center gap-1">
                  <Radio className="w-2.5 h-2.5 animate-pulse" />
                  <span>ربات فعال و آنلاین است</span>
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              فقط با وارد کردن توکن بات، موتور پاسخ‌گویی مستقیم فعال شده و دستورات <code className="text-cyan-300 font-mono">/start</code>، استعلام موجودی و مینی‌اپ فورا پاسخ داده می‌شوند.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1.5 cursor-pointer shrink-0 py-1.5 px-3 rounded-lg bg-cyan-950/40 border border-cyan-500/20"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showGuide ? 'بستن راهنما' : 'راهنمای دریافت توکن و ID'}</span>
        </button>
      </div>

      {/* Guide Box */}
      {showGuide && (
        <div className="p-5 bg-cyan-950/30 border border-cyan-500/30 rounded-2xl text-xs space-y-3 animate-fadeIn text-slate-300 leading-relaxed">
          <div className="font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" />
            <span>آموزش سریع راه‌اندازی ربات در ۱ دقیقه:</span>
          </div>

          <ol className="list-decimal list-inside space-y-2 pr-2 text-slate-300">
            <li>
              وارد تلگرام شده و ربات رسمی{' '}
              <a
                href="https://t.me/BotFather"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 font-bold underline inline-flex items-center gap-0.5"
              >
                <span>@BotFather</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              را استارت کنید.
            </li>
            <li>
              دستور <code className="text-amber-300 font-mono">/newbot</code> را بفرستید، یک نام و یوزرنیم (که به bot ختم شود) انتخاب نمایید.
            </li>
            <li>
              توکن API ارائه‌شده (مثال: <code className="text-amber-300 font-mono">8123456789:AAHk...</code>) را کپی کرده و در کادر زیر قرار دهید.
            </li>
            <li>
              برای پیدا کردن شناسه عددی تلگرام خود (جهت تشخیص خودکار ادمین)، به ربات{' '}
              <a
                href="https://t.me/userinfobot"
                target="_blank"
                rel="noreferrer"
                className="text-cyan-400 font-bold underline inline-flex items-center gap-0.5"
              >
                <span>@userinfobot</span>
                <ExternalLink className="w-3 h-3" />
              </a>{' '}
              پیام دهید تا عدد ID شما را نمایش دهد.
            </li>
            <li>
              دکمه <strong>«⚡ فعال‌سازی پاسخ‌گویی مستقیم و تست زنده»</strong> را بزنید.
            </li>
          </ol>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Bot Configuration Form */}
        <div className="lg:col-span-2 space-y-5">
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-4">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <Key className="w-4 h-4 text-cyan-400" />
              <span>مشخصات بات تلگرام</span>
            </h4>

            {/* Bot Token Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300">توکن بات تلگرام (Bot API Token)</label>
                <a
                  href="https://t.me/BotFather"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1"
                >
                  <span>دریافت توکن از BotFather@</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                placeholder="مثال: 8123456789:AAHk9kX-7..."
                value={botToken}
                onChange={(e) => setBotToken(e.target.value)}
                className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
              />
            </div>

            {/* Admin Telegram ID Input */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <Shield className="w-3.5 h-3.5 text-amber-400" />
                  <span>شناسه عددی ادمین تلگرام (Admin Telegram ID)</span>
                </label>
                <a
                  href="https://t.me/userinfobot"
                  target="_blank"
                  rel="noreferrer"
                  className="text-[11px] text-amber-400 hover:text-amber-300 font-bold underline flex items-center gap-1"
                >
                  <span>یافتن ID در userinfobot@</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
              <input
                type="text"
                placeholder="مثال: 987654321"
                value={adminTelegramId}
                onChange={(e) => {
                  setAdminTelegramId(e.target.value);
                  if (!testChatId) setTestChatId(e.target.value);
                }}
                className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
              />
              <p className="text-[11px] text-slate-500 mt-1">
                کاربری که این آیدی را دارد، با دستور <code className="text-amber-400 font-mono">/admin</code> یا باز کردن مینی‌اپ از تلگرام، بدون هیچ رمزی به عنوان مدیر کل شناسایی می‌شود.
              </p>
            </div>

            {/* Primary Action Button: Save & Start Engine */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleSaveAndActivate}
                disabled={loading || !botToken.trim()}
                className="w-full py-3.5 px-6 bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-cyan-500 text-white font-black text-xs rounded-xl shadow-lg shadow-emerald-600/25 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
              >
                {loading ? (
                  <>
                    <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>در حال اتصال و اعتبارسنجی بات...</span>
                  </>
                ) : (
                  <>
                    <Zap className="w-4 h-4" />
                    <span>⚡ فعال‌سازی پاسخ‌گویی مستقیم و تست زنده (Live Engine)</span>
                  </>
                )}
              </button>
            </div>

            {/* Optional Custom Webhook (For Cloudflare deploy) */}
            <div className="pt-4 border-t border-white/5 space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-400">
                  تنظیم وب‌هوک برای کلودفلر (اختیاری - مخصوص زمان دیپلوی روی Cloudflare)
                </label>
                <span className="text-[10px] text-slate-500 font-mono">Webhook Mode</span>
              </div>
              <input
                type="text"
                placeholder="https://coinzone-platform.pages.dev/api/telegram/webhook"
                value={customWebhookUrl}
                onChange={(e) => setCustomWebhookUrl(e.target.value)}
                className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-slate-300 font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
              />
              <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
                <button
                  type="button"
                  onClick={handleSetWebhook}
                  disabled={loading || !botToken.trim()}
                  className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 border border-blue-500/40 text-blue-300 font-bold rounded-lg cursor-pointer flex items-center gap-1"
                >
                  <Send className="w-3.5 h-3.5" />
                  <span>ثبت وب‌هوک در تلگرام</span>
                </button>

                {config?.webhookActive && (
                  <button
                    type="button"
                    onClick={handleDeleteWebhook}
                    disabled={loading}
                    className="px-3 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 text-rose-300 font-bold rounded-lg cursor-pointer flex items-center gap-1"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>حذف وب‌هوک</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Test Message Card: Send direct ping to user's Telegram */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-3">
            <div className="flex items-center gap-2 text-xs font-bold text-cyan-300">
              <MessageSquare className="w-4 h-4 text-cyan-400" />
              <span>ارسال پیام تست فوری به تلگرام شما</span>
            </div>
            <p className="text-[11px] text-slate-400">
              با این ابزار می‌توانید همین لحظه یک پیام تست از ربات به چت خود در تلگرام ارسال کنید تا مطمئن شوید همه چیز درست کار می‌کند:
            </p>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 pt-1">
              <input
                type="text"
                placeholder="شناسه چت یا ID تلگرام شما (مثال: 987654321)"
                value={testChatId}
                onChange={(e) => setTestChatId(e.target.value)}
                className="flex-1 bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
              />
              <button
                type="button"
                onClick={handleSendTestMessage}
                disabled={sendingTest || !botToken.trim()}
                className="px-4 py-2 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 cursor-pointer shadow-md disabled:opacity-50"
              >
                {sendingTest ? (
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    <span>ارسال پیام تست</span>
                  </>
                )}
              </button>
            </div>

            {testSuccess && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/50 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{testSuccess}</span>
              </div>
            )}
          </div>

          {/* Success Banner */}
          {statusMessage && (
            <div className="p-4 bg-emerald-950/40 border border-emerald-500/50 rounded-2xl flex items-center gap-3 text-xs text-emerald-300 animate-fadeIn">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <span>{statusMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 bg-rose-950/40 border border-rose-500/50 rounded-2xl flex items-center gap-3 text-xs text-rose-300 animate-fadeIn">
              <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}
        </div>

        {/* Right Col: Live Bot Info Card */}
        <div className="space-y-4">
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-4">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Smartphone className="w-4 h-4 text-cyan-400" />
              <span>وضعیت زنده بات و وب‌هوک</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">نام بات:</span>
                <span className="text-white font-bold">{testResult?.bot?.first_name || 'هنوز متصل نشده'}</span>
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">یوزرنیم بات:</span>
                {botUsername ? (
                  <a
                    href={`https://t.me/${botUsername}`}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:underline font-mono font-bold flex items-center gap-1 dir-ltr"
                  >
                    <span>@{botUsername}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ) : (
                  <span className="text-slate-500 font-mono">--</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">موتور پاسخ‌گویی:</span>
                {config?.pollingActive ? (
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                    <span>پاسخ‌گویی زنده (Online)</span>
                  </span>
                ) : config?.webhookActive ? (
                  <span className="text-cyan-400 font-bold">وب‌هوک فعال</span>
                ) : (
                  <span className="text-amber-400 font-medium">غیرفعال (منتظر دکمه فعال‌سازی)</span>
                )}
              </div>

              {config?.lastMessageReceived && (
                <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.03]">
                  <span className="text-slate-400">آخرین پیام دریافتی:</span>
                  <span className="font-mono text-emerald-300 text-[11px] truncate max-w-[120px]">
                    {config.lastMessageReceived}
                  </span>
                </div>
              )}
            </div>

            {botUsername && (
              <a
                href={`https://t.me/${botUsername}`}
                target="_blank"
                rel="noreferrer"
                className="w-full py-3 px-3 bg-gradient-to-r from-blue-600 via-indigo-600 to-cyan-500 hover:from-blue-500 hover:to-cyan-400 text-white font-bold text-xs rounded-xl flex items-center justify-center gap-2 shadow-md transition-all active:scale-95"
              >
                <Bot className="w-4 h-4" />
                <span>باز کردن و ارسال /start در تلگرام</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            )}
          </div>

          {/* Supported Commands Box */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-2 text-xs">
            <h5 className="font-bold text-white mb-1">دستورات ربات در تلگرام:</h5>
            <div className="space-y-1.5 text-slate-300 font-mono text-[11px]">
              <div><strong className="text-cyan-400">/start</strong> - خوش‌آمدگویی و اجرای مستقیم بازی</div>
              <div><strong className="text-cyan-400">/balance</strong> - مشاهده موجودی سکه و سطح</div>
              <div><strong className="text-cyan-400">/admin</strong> - لینک مستقیم ورود ادمین</div>
              <div><strong className="text-cyan-400">/help</strong> - راهنمای تبدیل سکه به کلید TF2</div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
