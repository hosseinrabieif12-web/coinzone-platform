import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { LeaderboardEntry } from '../types';
import { Trophy, Medal, Crown, Sparkles, User as UserIcon } from 'lucide-react';

export const LeaderboardPage: React.FC = () => {
  const { user } = useAuth();
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [userRank, setUserRank] = useState<number | null>(null);
  const [tab, setTab] = useState<'WEEKLY' | 'ALL_TIME'>('ALL_TIME');
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const res = await api.getLeaderboard();
        setLeaderboard(res.leaderboard);
        setUserRank(res.userRank);
      } catch {
        // ignore
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, [user]);

  const topThree = leaderboard.slice(0, 3);
  const remainingPlayers = leaderboard.slice(3);

  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Trophy className="w-4 h-4" />
            <span>جدول برترین‌های کوین‌زون</span>
          </div>
          <h2 className="text-2xl font-black text-white">تالار مشاهیر و رتبه‌بندی گیمرها</h2>
          <p className="text-xs text-slate-400 mt-1">
            برترین استخراج‌کنندگان سکه و گیمرهای حرفه‌ای پلتفرم در رقابت هفتگی و کلی.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => {
              sound.playClick();
              setTab('ALL_TIME');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'ALL_TIME' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            کل دوران (All-Time)
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setTab('WEEKLY');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              tab === 'WEEKLY' ? 'bg-purple-600 text-white shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            هفتگی (Weekly)
          </button>
        </div>
      </div>

      {loading ? (
        <div className="py-16 flex items-center justify-center">
          <div className="w-8 h-8 border-3 border-purple-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Top 3 Podium */}
          {topThree.length >= 3 && (
            <div className="grid grid-cols-3 gap-3 sm:gap-6 items-end pt-6">
              
              {/* Rank 2 (Silver) */}
              <div className="bg-[#12141c] border border-slate-400/30 rounded-2xl p-4 sm:p-6 glass-panel flex flex-col items-center text-center order-1 relative">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-slate-300 text-slate-900 flex items-center justify-center font-black text-lg sm:text-2xl shadow-lg -mt-8 mb-2 border-2 border-slate-200">
                  <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full">
                  {topThree[1].username}
                </span>
                <span className="text-[10px] text-purple-300 mt-0.5">سطح {topThree[1].level}</span>
                <div className="mt-2 text-xs sm:text-base font-black text-slate-300 font-mono">
                  {topThree[1].earnedCoins.toLocaleString('fa-IR')} سکه
                </div>
                <div className="text-[10px] text-slate-400 mt-1">رتبه ۲</div>
              </div>

              {/* Rank 1 (Gold - Taller) */}
              <div className="bg-gradient-to-b from-amber-500/20 via-[#12141c] to-[#12141c] border-2 border-amber-400/60 rounded-2xl p-4 sm:p-7 glass-panel flex flex-col items-center text-center order-2 relative scale-105 shadow-2xl glow-gold">
                <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-amber-400 text-black flex items-center justify-center font-black text-xl sm:text-3xl shadow-xl -mt-10 mb-2 border-2 border-yellow-200">
                  <Crown className="w-7 h-7 sm:w-9 sm:h-9" />
                </div>
                <span className="text-xs sm:text-base font-black text-amber-300 truncate max-w-full">
                  {topThree[0].username}
                </span>
                <span className="text-[10px] text-amber-200/80 mt-0.5">سطح {topThree[0].level}</span>
                <div className="mt-2 text-sm sm:text-lg font-black text-amber-300 font-mono">
                  {topThree[0].earnedCoins.toLocaleString('fa-IR')} سکه
                </div>
                <div className="text-[11px] font-black text-amber-400 mt-1">👑 قهرمان کوین‌زون</div>
              </div>

              {/* Rank 3 (Bronze) */}
              <div className="bg-[#12141c] border border-amber-800/40 rounded-2xl p-4 sm:p-6 glass-panel flex flex-col items-center text-center order-3 relative">
                <div className="w-10 h-10 sm:w-14 sm:h-14 rounded-2xl bg-amber-700 text-amber-100 flex items-center justify-center font-black text-lg sm:text-2xl shadow-lg -mt-8 mb-2 border-2 border-amber-600">
                  <Medal className="w-6 h-6 sm:w-8 sm:h-8" />
                </div>
                <span className="text-xs sm:text-sm font-bold text-white truncate max-w-full">
                  {topThree[2].username}
                </span>
                <span className="text-[10px] text-purple-300 mt-0.5">سطح {topThree[2].level}</span>
                <div className="mt-2 text-xs sm:text-base font-black text-amber-600 font-mono">
                  {topThree[2].earnedCoins.toLocaleString('fa-IR')} سکه
                </div>
                <div className="text-[10px] text-slate-400 mt-1">رتبه ۳</div>
              </div>
            </div>
          )}

          {/* User's own Rank Sticky / Highlight */}
          {user && userRank && (
            <div className="p-4 bg-purple-950/40 border border-purple-500/40 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-xl bg-purple-600 text-white flex items-center justify-center font-black text-sm">
                  #{userRank}
                </div>
                <div>
                  <div className="text-xs font-bold text-white flex items-center gap-1.5">
                    <span>رتبه اختصاصی شما در جدول:</span>
                    <span className="text-purple-300 font-black">{user.username}</span>
                  </div>
                  <div className="text-[11px] text-slate-400">سطح {user.level} · ادامه بده تا به جمع برترین‌ها برسی!</div>
                </div>
              </div>
            </div>
          )}

          {/* Leaderboard Table */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl overflow-hidden glass-panel">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
                    <th className="py-3.5 px-4 font-bold text-center w-16">رتبه</th>
                    <th className="py-3.5 px-4 font-bold">گیمر</th>
                    <th className="py-3.5 px-4 font-bold text-center">سطح (Level)</th>
                    <th className="py-3.5 px-4 font-bold text-center">تعداد بازی</th>
                    <th className="py-3.5 px-4 font-bold text-left">مجموع سکه</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {leaderboard.map((entry) => {
                    const isMe = user?.id === entry.userId;
                    return (
                      <tr
                        key={entry.userId}
                        className={`transition-colors ${
                          isMe ? 'bg-purple-600/15 font-bold' : 'hover:bg-white/[0.02]'
                        }`}
                      >
                        <td className="py-3.5 px-4 text-center font-mono font-bold">
                          {entry.rank <= 3 ? (
                            <span className="text-amber-400 font-black">#{entry.rank}</span>
                          ) : (
                            <span className="text-slate-400">#{entry.rank}</span>
                          )}
                        </td>
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500/20 to-cyan-500/20 border border-white/10 flex items-center justify-center font-bold text-slate-300">
                              {entry.username.slice(0, 1)}
                            </div>
                            <span className={`text-sm ${isMe ? 'text-purple-300 font-black' : 'text-white'}`}>
                              {entry.username}
                              {isMe && <span className="mr-2 text-[10px] text-purple-400 font-normal">(شما)</span>}
                            </span>
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className="px-2 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 font-bold text-[11px]">
                            لول {entry.level}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-center text-slate-400 font-mono">
                          {entry.gamesPlayed}
                        </td>
                        <td className="py-3.5 px-4 text-left font-mono font-black text-amber-300">
                          {entry.earnedCoins.toLocaleString('fa-IR')}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
