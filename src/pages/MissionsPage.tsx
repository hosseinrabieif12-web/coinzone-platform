import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Mission } from '../types';
import { Target, CheckCircle2, Gift, Sparkles, Trophy } from 'lucide-react';

export const MissionsPage: React.FC = () => {
  const { user, updateWallet, updateUser, setShowAuthModal } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [filter, setFilter] = useState<'ALL' | 'DAILY' | 'WEEKLY'>('ALL');
  const [loading, setLoading] = useState<boolean>(true);
  const [claimingId, setClaimingId] = useState<string | null>(null);

  const fetchMissions = async () => {
    try {
      const res = await api.getMissions();
      setMissions(res.missions);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMissions();
  }, [user]);

  const handleClaim = async (missionId: string) => {
    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setClaimingId(missionId);
    sound.playClick();

    try {
      const res = await api.claimMission(missionId);
      sound.playCoin();
      sound.playWin();
      updateWallet(res.wallet);
      updateUser(res.user);
      await fetchMissions();
    } catch (err: unknown) {
      const e = err as Error;
      sound.playError();
      alert(e.message || 'خطا در دریافت پاداش');
    } finally {
      setClaimingId(null);
    }
  };

  const filteredMissions = missions.filter((m) => {
    if (filter === 'ALL') return true;
    return m.type === filter;
  });

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>مرکز پاداش‌های ماموریتی</span>
          </div>
          <h2 className="text-2xl font-black text-white">مأموریت‌های کوین‌زون (Missions)</h2>
          <p className="text-xs text-slate-400 mt-1">
            با تکمیل چالش‌های روزانه و هفتگی، سکه طلایی و XP دریافت کن و سطح اکانتت را بالا ببر!
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => {
              sound.playClick();
              setFilter('ALL');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filter === 'ALL' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            همه مأموریت‌ها
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('DAILY');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filter === 'DAILY' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            روزانه
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setFilter('WEEKLY');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              filter === 'WEEKLY' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            هفتگی
          </button>
        </div>
      </div>

      {/* Missions List */}
      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMissions.map((m) => {
            const progress = m.currentProgress || 0;
            const pct = Math.min(100, Math.round((progress / m.goalTarget) * 100));
            const isCompleted = m.completed || progress >= m.goalTarget;
            const isClaimed = m.claimed;

            return (
              <div
                key={m.id}
                className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-all"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-300">
                      {m.type === 'DAILY' ? 'ماموریت روزانه' : 'ماموریت هفتگی'}
                    </span>
                    <h3 className="text-sm sm:text-base font-bold text-white">{m.title}</h3>
                  </div>
                  <p className="text-xs text-slate-400 leading-relaxed">{m.description}</p>

                  {/* Progress Bar */}
                  <div className="mt-3 max-w-md">
                    <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-300 ${
                          isCompleted ? 'bg-emerald-500' : 'bg-gradient-to-r from-purple-500 to-cyan-400'
                        }`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                    <div className="flex items-center justify-between text-[11px] text-slate-400 mt-1 font-mono">
                      <span>
                        {progress} / {m.goalTarget}
                      </span>
                      <span>{pct}٪</span>
                    </div>
                  </div>
                </div>

                {/* Rewards & Action */}
                <div className="flex sm:flex-col items-center sm:items-end justify-between w-full sm:w-auto gap-3 pt-3 sm:pt-0 border-t sm:border-t-0 border-white/5">
                  <div className="text-right flex sm:flex-col items-baseline sm:items-end gap-2 sm:gap-0.5">
                    <div className="text-sm font-black text-amber-300 flex items-center gap-1">
                      <Gift className="w-4 h-4 text-amber-400" />
                      <span>+{m.rewardCoins} سکه</span>
                    </div>
                    <div className="text-xs font-bold text-purple-300">+{m.rewardXp} XP</div>
                  </div>

                  <div>
                    {isClaimed ? (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-400 text-xs font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>دریافت شد</span>
                      </span>
                    ) : isCompleted ? (
                      <button
                        onClick={() => handleClaim(m.id)}
                        disabled={claimingId === m.id}
                        className="py-2 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer flex items-center gap-1.5 animate-pulse"
                      >
                        <Trophy className="w-4 h-4" />
                        <span>دریافت پاداش</span>
                      </button>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 text-slate-400 text-xs font-medium">
                        <Target className="w-3.5 h-3.5" />
                        <span>در حال انجام</span>
                      </span>
                    )}
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
