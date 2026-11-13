import React, { useRef, useState } from 'react';
import { Send, Loader2, Bot, User, Trash2 } from 'lucide-react';
import type { ChartAnalysisReport, ChatMessage, GlobalMarketData } from '../types.ts';
import { formatDateTimeFa, readApiJson } from '../utils/formatters.ts';

interface AiChatViewProps {
  report: ChartAnalysisReport | null;
  globalMarket: GlobalMarketData | null;
  messages: ChatMessage[];
  onMessagesChange: (msgs: ChatMessage[]) => void;
}

const SUGGESTED_QUESTIONS = [
  'چرا این تصمیم (خرید / فروش / عدم ورود) را پیشنهاد دادی؟',
  'اگر سطح حمایت کلیدی بشکند چه اتفاقی می‌افتد؟',
  'آیا الان زمان مناسبی برای ورود است؟',
  'بهترین تایم‌فریم برای بررسی این ارز چیست؟',
  'تحلیل را به زبان ساده توضیح بده',
];

export const AiChatView: React.FC<AiChatViewProps> = ({
  report,
  globalMarket,
  messages,
  onMessagesChange,
}) => {
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const endRef = useRef<HTMLDivElement>(null);

  const sendQuestion = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    setError(null);
    const userMsg: ChatMessage = {
      id: `u_${Date.now()}`,
      role: 'user',
      content: trimmed,
      timestamp: new Date().toISOString(),
    };
    const nextMessages = [...messages, userMsg];
    onMessagesChange(nextMessages);
    setInput('');
    setSending(true);

    try {
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: trimmed,
          history: nextMessages,
          report,
          globalMarket,
        }),
      });
      const data = await readApiJson<{ answer: string; timestamp?: string }>(
        res,
        'خطا در دریافت پاسخ از هوش مصنوعی'
      );
      const aiMsg: ChatMessage = {
        id: `a_${Date.now()}`,
        role: 'assistant',
        content: data.answer,
        timestamp: data.timestamp || new Date().toISOString(),
      };
      onMessagesChange([...nextMessages, aiMsg]);
      setTimeout(() => endRef.current?.scrollIntoView({ behavior: 'smooth' }), 60);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطای ارتباط با سرور');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl flex flex-col h-[calc(100vh-14rem)] min-h-[540px]">
      {/* Chat Header */}
      <div className="p-4 sm:p-5 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-base sm:text-lg font-bold text-slate-100">
            گفتگو با تحلیلگر هوشمند CRYPTO SCOPE AI
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            {report?.identification && report?.decisionEngine
              ? `متصل به گزارش فعال: ${report.identification.symbol || 'نامشخص'} (${report.identification.detectedTimeframe || 'نامشخص'}) · تصمیم: ${report.decisionEngine.finalDecisionFa || report.decisionEngine.finalDecision || 'نامشخص'}`
              : 'هنوز چارتی تحلیل نشده است — می‌توانید درباره وضعیت کلی بازار بپرسید یا ابتدا یک چارت تحلیل کنید.'}
          </p>
        </div>

        {messages.length > 0 && (
          <button
            type="button"
            onClick={() => onMessagesChange([])}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700/80 text-xs text-slate-300 hover:text-rose-400 hover:border-rose-500/40 transition-colors cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>پاک کردن گفتگو</span>
          </button>
        )}
      </div>

      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center max-w-lg mx-auto space-y-3 py-8">
            <div className="w-12 h-12 rounded-xl bg-blue-500/10 border border-blue-500/30 flex items-center justify-center text-blue-400">
              <Bot className="w-6 h-6" />
            </div>
            <h2 className="text-sm font-bold text-slate-200">
              سوالات تحلیلی خود را بپرسید
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              درباره دلایل سیگنال، سناریوی شکست حمایت یا مقاومت، نقطه ورود بهینه و یا توضیح ساده تحلیل از هوش مصنوعی سوال کنید.
            </p>
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex items-start gap-3 ${
                msg.role === 'user' ? 'flex-row' : 'flex-row'
              }`}
            >
              <div
                className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border ${
                  msg.role === 'user'
                    ? 'bg-purple-500/15 border-purple-500/35 text-purple-300'
                    : 'bg-blue-500/15 border-blue-500/35 text-blue-300'
                }`}
              >
                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
              </div>
              <div className="flex-1 bg-[#070b17] border border-slate-800/80 rounded-xl p-3.5 space-y-1.5">
                <div className="flex items-center justify-between text-[11px] text-slate-400">
                  <span className="font-semibold text-slate-300">
                    {msg.role === 'user' ? 'شما' : 'تحلیلگر CRYPTO SCOPE AI'}
                  </span>
                  <span className="tabular-nums">{formatDateTimeFa(msg.timestamp)}</span>
                </div>
                <div className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                  {msg.content}
                </div>
              </div>
            </div>
          ))
        )}

        {sending && (
          <div className="flex items-center gap-2 text-xs text-blue-400 px-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>در حال تنظیم پاسخ تحلیلی...</span>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {/* Quick Questions + Composer */}
      <div className="p-4 border-t border-slate-800/80 space-y-3 bg-[#080d1a] rounded-b-xl">
        <div className="flex flex-wrap gap-1.5">
          {SUGGESTED_QUESTIONS.map((q) => (
            <button
              key={q}
              type="button"
              disabled={sending}
              onClick={() => void sendQuestion(q)}
              className="px-3 py-1.5 rounded-lg bg-[#0B1120] border border-slate-700/80 hover:border-blue-500/50 text-xs text-slate-300 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
            >
              {q}
            </button>
          ))}
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <form
          onSubmit={(e) => {
            e.preventDefault();
            void sendQuestion(input);
          }}
          className="flex items-center gap-2"
        >
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={sending}
            placeholder="پرسش خود را به فارسی بنویسید..."
            className="flex-1 px-4 py-2.5 rounded-xl bg-[#060913] border border-slate-700/80 text-sm text-slate-100 placeholder:text-slate-500 focus:outline-none focus:border-blue-500"
          />
          <button
            type="submit"
            disabled={sending || !input.trim()}
            className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-sm font-semibold transition-colors cursor-pointer disabled:opacity-45 flex items-center gap-2 shrink-0"
          >
            <Send className="w-4 h-4" />
            <span>ارسال</span>
          </button>
        </form>
      </div>
    </div>
  );
};
