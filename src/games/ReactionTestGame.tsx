import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Sparkles, Zap, RotateCcw, AlertOctagon, CheckCircle2 } from 'lucide-react';

type TestState = 'IDLE' | 'WAITING' | 'CLICK_NOW' | 'EARLY' | 'RESULT';

export const ReactionTestGame: React.FC = () => {
  const { user, updateWallet, updateUser, setShowAuthModal } = useAuth();
  const [state, setState] = useState<TestState>('IDLE');
  const [reactionMs, setReactionMs] = useState<number | null>(null);
  const [tier, setTier] = useState<string>('');
  const [reward, setReward] = useState<{ coins: number; xp: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const startTimeRef = useRef<number>(0);
  const timerTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const startTest = () => {
    sound.playClick();
    if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);

    setState('WAITING');
    setReactionMs(null);
    setReward(null);

    // Random delay between 2 and 5.5 seconds
    const delay = Math.floor(Math.random() * 3500) + 2000;
    timerTimeoutRef.current = setTimeout(() => {
      startTimeRef.current = performance.now();
      setState('CLICK_NOW');
      sound.playClick(1000, 0.08);
    }, delay);
  };

  const handleBoxClick = async () => {
    if (state === 'WAITING') {
      // False start!
      if (timerTimeoutRef.current) clearTimeout(timerTimeoutRef.current);
      sound.playError();
      setState('EARLY');
    } else if (state === 'CLICK_NOW') {
      const elapsed = Math.round(performance.now() - startTimeRef.current);
      sound.playCoin();
      setReactionMs(elapsed);
      setState('RESULT');

      if (!user) {
        setShowAuthModal(true);
        return;
      }

      setIsSubmitting(true);
      try {
        const res = await api.submitReactionTest(elapsed);
        setTier(res.tier);
        setReward({ coins: res.rewardCoins, xp: res.rewardXp });
        sound.playWin();
        updateWallet(res.wallet);
        updateUser(res.user);
      } catch {
        // ignore
      } finally {
        setIsSubmitting(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>بازی شماره ۵: سنجش رفلکس گیمری</span>
          </div>
          <h2 className="text-2xl font-black text-white">تست سرعت واکنش (Reaction Test)</h2>
          <p className="text-xs text-slate-400 mt-1">
            با تغییر رنگ کادر به سبز نئون، در سریع‌ترین زمان ممکن کلیک کنید و پاداش میلی‌ثانیه‌ای بگیرید!
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-purple-950/40 border border-purple-500/20 rounded-xl text-xs font-bold text-cyan-300">
          <Zap className="w-4 h-4 text-cyan-400" />
          <span>سرعت زیر ۲۸۰ms = پاداش ویژه طلا</span>
        </div>
      </div>

      {/* Main Interactive Arena */}
      <div
        onClick={handleBoxClick}
        className={`w-full min-h-[360px] rounded-2xl flex flex-col items-center justify-center p-8 select-none cursor-pointer transition-all duration-150 relative overflow-hidden border-2 shadow-2xl ${
          state === 'IDLE'
            ? 'bg-[#12141c] border-white/10 hover:border-purple-500/40'
            : state === 'WAITING'
            ? 'bg-rose-950/60 border-rose-500 animate-pulse'
            : state === 'CLICK_NOW'
            ? 'bg-emerald-600 border-emerald-300 scale-102 shadow-emerald-500/50'
            : state === 'EARLY'
            ? 'bg-amber-950/70 border-amber-500'
            : 'bg-[#161824] border-purple-500/40'
        }`}
      >
        {state === 'IDLE' && (
          <div className="text-center space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-purple-600/20 border border-purple-500/40 text-purple-400 flex items-center justify-center mx-auto shadow-lg">
              <Zap className="w-8 h-8" />
            </div>
            <h3 className="text-xl font-black text-white">آماده سنجش رفلکس خود هستید؟</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              روی دکمه زیر کلیک کنید. صفحه قرمز می‌شود. به محض اینکه سبز شد، فوری کلیک کنید!
            </p>
            <button
              onClick={(e) => {
                e.stopPropagation();
                startTest();
              }}
              className="py-3 px-8 bg-gradient-to-r from-purple-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer"
            >
              شروع تست سرعت
            </button>
          </div>
        )}

        {state === 'WAITING' && (
          <div className="text-center space-y-3">
            <div className="w-16 h-16 rounded-full bg-rose-500/30 text-rose-300 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-8 h-8 animate-ping" />
            </div>
            <h3 className="text-2xl font-black text-white">صبر کنید...</h3>
            <p className="text-xs text-rose-200">به محض تغییر به رنگ سبز کلیک کنید!</p>
          </div>
        )}

        {state === 'CLICK_NOW' && (
          <div className="text-center space-y-3 animate-bounce">
            <h3 className="text-4xl sm:text-5xl font-black text-white drop-shadow-lg">
              همین حالا کلیک کن!
            </h3>
            <p className="text-sm font-bold text-emerald-100">سریع‌تر از همه ضربه بزن!</p>
          </div>
        )}

        {state === 'EARLY' && (
          <div className="text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="w-14 h-14 rounded-full bg-amber-500/20 text-amber-300 flex items-center justify-center mx-auto">
              <AlertOctagon className="w-7 h-7" />
            </div>
            <h3 className="text-xl font-black text-amber-300">خیلی زود کلیک کردید!</h3>
            <p className="text-xs text-slate-300">باید منتظر می‌ماندید تا رنگ سبز شود.</p>
            <button
              onClick={startTest}
              className="py-2.5 px-6 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              امتحان دوباره
            </button>
          </div>
        )}

        {state === 'RESULT' && (
          <div className="text-center space-y-4" onClick={(e) => e.stopPropagation()}>
            <div className="inline-flex p-3 rounded-full bg-emerald-500/20 text-emerald-300">
              <CheckCircle2 className="w-8 h-8" />
            </div>
            <div>
              <div className="text-xs text-slate-400">زمان ثبت شده شما:</div>
              <div className="text-4xl sm:text-5xl font-black font-mono text-cyan-300 mt-1">
                {reactionMs} <span className="text-lg">ms</span>
              </div>
              {tier && (
                <div className="inline-block mt-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/40 text-xs font-bold text-purple-300">
                  رتبه کیفی: {tier}
                </div>
              )}
            </div>

            {reward && (
              <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-center">
                <span className="text-amber-300 font-bold text-sm">+{reward.coins} سکه</span>
                <span className="text-slate-400 mx-2">·</span>
                <span className="text-purple-300 font-bold text-sm">+{reward.xp} امتیاز XP</span>
              </div>
            )}

            <button
              onClick={startTest}
              className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer flex items-center gap-1.5 mx-auto"
            >
              <RotateCcw className="w-4 h-4" />
              <span>تست دوباره برای رکورد بهتر</span>
            </button>
          </div>
        )}
      </div>

      {/* Speed Tiers Guide */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel">
        <h4 className="text-xs font-bold text-white mb-3">سطوح سنجش سرعت واکنش:</h4>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
          <div className="p-2.5 rounded-xl bg-purple-950/30 border border-purple-500/30">
            <div className="font-bold text-purple-300">الماس (&lt; 220ms)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">۴۰ سکه + ۶۰ XP</div>
          </div>
          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30">
            <div className="font-bold text-amber-300">طلا (&lt; 280ms)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">۲۵ سکه + ۴۰ XP</div>
          </div>
          <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30">
            <div className="font-bold text-cyan-300">نقره (&lt; 360ms)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">۱۸ سکه + ۲۵ XP</div>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
            <div className="font-bold text-slate-300">معمولی (&gt; 360ms)</div>
            <div className="text-[11px] text-slate-400 mt-0.5">۱۰ سکه + ۱۵ XP</div>
          </div>
        </div>
      </div>
    </div>
  );
};
