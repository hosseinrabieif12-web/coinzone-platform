import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Sparkles, ArrowUp, ArrowDown, CheckCircle2, RotateCcw, AlertTriangle } from 'lucide-react';

interface GuessRecord {
  guess: number;
  hint: 'HIGHER' | 'LOWER' | 'CORRECT';
}

export const NumberGuessGame: React.FC = () => {
  const { user, updateWallet, updateUser, setShowAuthModal } = useAuth();
  const [guessInput, setGuessInput] = useState<string>('50');
  const [attemptsLeft, setAttemptsLeft] = useState<number>(6);
  const [history, setHistory] = useState<GuessRecord[]>([]);
  const [gameStatus, setGameStatus] = useState<'IDLE' | 'PLAYING' | 'WON' | 'LOST'>('IDLE');
  const [feedbackMessage, setFeedbackMessage] = useState<string>('');
  const [revealedNumber, setRevealedNumber] = useState<number | null>(null);
  const [winReward, setWinReward] = useState<{ coins: number; xp: number } | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  const startNewGame = async () => {
    sound.playClick();
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    try {
      await api.startNumberGuess();
      setAttemptsLeft(6);
      setHistory([]);
      setGameStatus('PLAYING');
      setFeedbackMessage('یک عدد بین ۱ تا ۱۰۰ انتخاب کن!');
      setRevealedNumber(null);
      setWinReward(null);
      setGuessInput('50');
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    if (user) {
      startNewGame();
    }
  }, [user]);

  const handleGuess = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseInt(guessInput, 10);
    if (isNaN(num) || num < 1 || num > 100) {
      sound.playError();
      alert('لطفاً عددی بین ۱ تا ۱۰۰ وارد کنید.');
      return;
    }

    if (gameStatus !== 'PLAYING' || isSubmitting) return;

    setIsSubmitting(true);
    sound.playClick();

    try {
      const res = await api.makeNumberGuess(num);

      if (res.result === 'CORRECT') {
        sound.playWin();
        setGameStatus('WON');
        setFeedbackMessage(res.message || 'تبریک! عدد را درست حدس زدید.');
        setHistory((prev) => [{ guess: num, hint: 'CORRECT' }, ...prev]);
        setRevealedNumber(num);
        if (res.rewardCoins && res.rewardXp) {
          setWinReward({ coins: res.rewardCoins, xp: res.rewardXp });
        }
        if (res.wallet) updateWallet(res.wallet);
        if (res.user) updateUser(res.user);
      } else if (res.result === 'GAME_OVER') {
        sound.playError();
        setGameStatus('LOST');
        setFeedbackMessage(res.message || 'فرصت‌های شما تمام شد!');
        setRevealedNumber(res.revealedSecret || null);
        setHistory((prev) => [{ guess: num, hint: 'LOWER' }, ...prev]);
        setAttemptsLeft(0);
      } else {
        // HIGHER or LOWER
        sound.playCoin();
        const hint = res.result;
        setAttemptsLeft(res.attemptsLeft ?? (attemptsLeft - 1));
        setHistory((prev) => [{ guess: num, hint }, ...prev]);
        setFeedbackMessage(
          hint === 'HIGHER'
            ? `عدد مخفی بزرگتر از ${num} است! ⬆️ (برو بالاتر)`
            : `عدد مخفی کوچکتر از ${num} است! ⬇️ (بیا پایین‌تر)`
        );
      }
    } catch (err: unknown) {
      const e = err as Error;
      sound.playError();
      alert(e.message || 'خطا در ثبت حدس');
    } finally {
      setIsSubmitting(false);
    }
  };

  const adjustGuess = (delta: number) => {
    sound.playClick(900, 0.02);
    const curr = parseInt(guessInput, 10) || 50;
    const next = Math.min(100, Math.max(1, curr + delta));
    setGuessInput(String(next));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>بازی شماره ۴: ذهن‌خوانی و احتمال</span>
          </div>
          <h2 className="text-2xl font-black text-white">حدس عدد شانس (Number Guessing)</h2>
          <p className="text-xs text-slate-400 mt-1">
            یک عدد تصادفی بین ۱ تا ۱۰۰ توسط سرور تولید شده است. با ۶ فرصت آن را کشف کنید!
          </p>
        </div>

        <button
          onClick={startNewGame}
          className="flex items-center gap-1.5 px-4 py-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/30 text-purple-300 font-bold text-xs rounded-xl transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>شروع بازی جدید</span>
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Play Card */}
        <div className="lg:col-span-2 bg-[#12141c] border border-white/10 rounded-2xl p-8 glass-panel flex flex-col items-center justify-center text-center">
          
          {/* Attempts Indicator */}
          <div className="flex items-center gap-2 mb-6">
            <span className="text-xs text-slate-400">فرصت‌های باقیمانده:</span>
            <div className="flex items-center gap-1.5">
              {[...Array(6)].map((_, i) => (
                <div
                  key={i}
                  className={`w-3.5 h-3.5 rounded-full border transition-all ${
                    i < attemptsLeft
                      ? 'bg-cyan-400 border-cyan-300 shadow-sm shadow-cyan-400'
                      : 'bg-white/10 border-white/20 opacity-30'
                  }`}
                />
              ))}
            </div>
          </div>

          {/* Secret / State Display */}
          <div className="w-28 h-28 rounded-2xl bg-gradient-to-tr from-purple-950/80 to-indigo-950/80 border-2 border-purple-500/50 flex items-center justify-center text-4xl font-black shadow-2xl glow-purple mb-6 text-white font-mono">
            {revealedNumber !== null ? (
              <span className="text-amber-300 scale-110 animate-bounce">{revealedNumber}</span>
            ) : (
              <span className="text-purple-400/80 animate-pulse">?</span>
            )}
          </div>

          {/* Feedback Message */}
          <div className="mb-6 px-4 py-2 rounded-xl bg-white/[0.04] border border-white/10 text-sm font-bold text-slate-200">
            {feedbackMessage}
          </div>

          {/* Win/Loss Banners */}
          {gameStatus === 'WON' && winReward && (
            <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center animate-fadeIn w-full max-w-sm">
              <div className="text-base font-black text-emerald-300 flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-5 h-5" />
                <span>برنده شدی! پاداش واریز شد:</span>
              </div>
              <div className="text-xs font-bold text-white mt-1">
                +{winReward.coins} سکه طلایی و +{winReward.xp} امتیاز XP
              </div>
            </div>
          )}

          {gameStatus === 'LOST' && (
            <div className="mb-6 p-4 bg-rose-500/20 border border-rose-500/40 rounded-xl text-center animate-fadeIn w-full max-w-sm">
              <div className="text-sm font-black text-rose-300 flex items-center justify-center gap-1.5">
                <AlertTriangle className="w-4 h-4" />
                <span>باختی! عدد مخفی {revealedNumber} بود.</span>
              </div>
              <button
                onClick={startNewGame}
                className="mt-2 text-xs text-rose-200 underline font-bold cursor-pointer"
              >
                تلاش مجدد
              </button>
            </div>
          )}

          {/* Form */}
          {gameStatus === 'PLAYING' && (
            <form onSubmit={handleGuess} className="w-full max-w-sm space-y-4">
              <div className="flex items-center justify-center gap-2">
                <button
                  type="button"
                  onClick={() => adjustGuess(-10)}
                  className="px-2.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                >
                  -۱۰
                </button>
                <button
                  type="button"
                  onClick={() => adjustGuess(-1)}
                  className="px-2.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                >
                  -۱
                </button>

                <input
                  type="number"
                  min={1}
                  max={100}
                  value={guessInput}
                  onChange={(e) => setGuessInput(e.target.value)}
                  className="w-24 text-center font-mono font-black text-2xl py-2 bg-[#181a24] border border-purple-500/40 focus:border-purple-400 focus:outline-none rounded-xl text-white shadow-inner"
                />

                <button
                  type="button"
                  onClick={() => adjustGuess(+1)}
                  className="px-2.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                >
                  +۱
                </button>
                <button
                  type="button"
                  onClick={() => adjustGuess(+10)}
                  className="px-2.5 py-2 bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 rounded-lg text-xs font-mono text-slate-300 cursor-pointer"
                >
                  +۱۰
                </button>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3 bg-gradient-to-r from-purple-600 to-cyan-600 hover:from-purple-500 hover:to-cyan-500 text-white font-black text-sm rounded-xl shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <span>ثبت حدس من</span>
                )}
              </button>
            </form>
          )}
        </div>

        {/* History Log */}
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel flex flex-col">
          <h3 className="text-sm font-bold text-white mb-3">تاریخچه حدس‌های این دور</h3>

          {history.length === 0 ? (
            <div className="my-auto text-center text-xs text-slate-500 py-8">
              هنوز حدسی ثبت نکرده‌اید.
            </div>
          ) : (
            <div className="space-y-2 overflow-y-auto max-h-[320px]">
              {history.map((h, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between p-2.5 rounded-xl border text-xs font-bold ${
                    h.hint === 'CORRECT'
                      ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                      : h.hint === 'HIGHER'
                      ? 'bg-cyan-950/30 border-cyan-500/30 text-cyan-300'
                      : 'bg-purple-950/30 border-purple-500/30 text-purple-300'
                  }`}
                >
                  <span className="font-mono text-sm text-white">عدد {h.guess}</span>
                  <span className="flex items-center gap-1">
                    {h.hint === 'CORRECT' && (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span>کاملاً دقیق!</span>
                      </>
                    )}
                    {h.hint === 'HIGHER' && (
                      <>
                        <ArrowUp className="w-4 h-4 text-cyan-400" />
                        <span>برو بالاتر</span>
                      </>
                    )}
                    {h.hint === 'LOWER' && (
                      <>
                        <ArrowDown className="w-4 h-4 text-purple-400" />
                        <span>بیا پایین‌تر</span>
                      </>
                    )}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
