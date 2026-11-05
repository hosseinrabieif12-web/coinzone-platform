import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { X, Gift, Check, Flame, Clock } from 'lucide-react';
import { DailyRewardState } from '../types';

export const DailyRewardModal: React.FC = () => {
  const { showDailyModal, setShowDailyModal, user, updateWallet, updateUser } = useAuth();
  const [data, setData] = useState<(DailyRewardState & { streakRewards: number[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimedReward, setClaimedReward] = useState<{ amount: number; xp: number } | null>(null);

  const fetchDailyState = useCallback(async () => {
    if (!user) return;
    setLoading(true);
    try {
      const res = await api.getDailyRewards();
      setData(res);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (showDailyModal && user) {
      fetchDailyState();
      setClaimedReward(null);
    }
  }, [showDailyModal, user, fetchDailyState]);

  if (!showDailyModal) return null;

  const handleClaim = async () => {
    if (!data?.canClaim || claiming) return;
    setClaiming(true);
    sound.playClick();
    try {
      const res = await api.claimDailyReward();
      sound.playCoin();
      sound.playWin();
      setClaimedReward({ amount: res.rewardAmount, xp: res.xpReward });
      updateWallet(res.wallet);
      updateUser(res.user);
      await fetchDailyState();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'خطا در دریافت پاداش');
      sound.playError();
    } finally {
      setClaiming(false);
    }
  };

  const streakDays = data?.streakRewards || [20, 30, 40, 50, 65, 80, 150];
  const currentStreak = data?.streakCount || 0;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-lg bg-[#12141c] border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl glow-gold text-slate-100 overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute top-0 left-1/2 -translate-x-1/2 w-64 h-32 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <button
          onClick={() => {
            sound.playClick();
            setShowDailyModal(false);
          }}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 mb-3 shadow-lg shadow-amber-500/20">
            <Gift className="w-7 h-7" />
          </div>
          <h2 className="text-2xl font-black text-white flex items-center justify-center gap-2">
            <span>تقویم پاداش روزانه</span>
            <span className="flex items-center gap-1 text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 font-bold">
              <Flame className="w-3.5 h-3.5 text-amber-400" />
              <span>زنجیره {currentStreak} روزه</span>
            </span>
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            هر روز به کوین‌زون سر بزن و سکه‌های رایگان برای دریافت کلید TF2 دریافت کن!
          </p>
        </div>

        {claimedReward && (
          <div className="mb-6 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center animate-bounce">
            <div className="text-base font-black text-emerald-300">تبریک! پاداش امروز دریافت شد</div>
            <div className="text-xs text-emerald-200 mt-1">
              +{claimedReward.amount} سکه طلایی و +{claimedReward.xp} امتیاز XP به حسابتان افزوده شد.
            </div>
          </div>
        )}

        {loading ? (
          <div className="py-12 flex items-center justify-center">
            <div className="w-8 h-8 border-3 border-amber-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <>
            {/* 7 Days Grid */}
            <div className="grid grid-cols-4 sm:grid-cols-7 gap-2.5 mb-6">
              {streakDays.map((coins, index) => {
                const dayNum = index + 1;
                const isPassed = index < currentStreak;
                const isCurrent = index === currentStreak;
                const isSpecial = dayNum === 7;

                return (
                  <div
                    key={dayNum}
                    className={`relative flex flex-col items-center justify-between p-3 rounded-xl border transition-all ${
                      isPassed
                        ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                        : isCurrent
                        ? 'bg-gradient-to-b from-amber-500/20 to-amber-900/40 border-amber-400/80 ring-2 ring-amber-400/30 text-white scale-105 shadow-lg'
                        : 'bg-white/[0.02] border-white/5 text-slate-400'
                    } ${isSpecial ? 'col-span-2 sm:col-span-1' : ''}`}
                  >
                    <span className="text-[10px] font-bold text-slate-400 mb-1">روز {dayNum}</span>
                    <div className="my-1.5 flex flex-col items-center">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-black text-xs ${
                        isPassed ? 'bg-emerald-500/20 text-emerald-400' : isCurrent ? 'bg-amber-400 text-black shadow-md' : 'bg-white/5 text-slate-400'
                      }`}>
                        {isPassed ? <Check className="w-4 h-4 stroke-[3]" /> : `+${coins}`}
                      </div>
                    </div>
                    <span className="text-[10px] text-amber-300/80 font-medium">سکه</span>
                  </div>
                );
              })}
            </div>

            {/* Action Button */}
            <div className="pt-2">
              {data?.canClaim ? (
                <button
                  onClick={handleClaim}
                  disabled={claiming}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95"
                >
                  {claiming ? (
                    <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <Gift className="w-5 h-5" />
                      <span>دریافت پاداش امروز (+{data.currentDayReward} سکه)</span>
                    </>
                  )}
                </button>
              ) : (
                <div className="flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-white/[0.04] border border-white/10 text-xs text-slate-400 font-medium">
                  <Clock className="w-4 h-4 text-amber-400" />
                  <span>پاداش امروز دریافت شده است. فردا برای پاداش بعدی سر بزنید!</span>
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};
