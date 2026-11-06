import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Transaction, Order } from '../types';
import {
  User as UserIcon,
  Coins,
  Shield,
  Award,
  Clock,
  CheckCircle2,
  XCircle,
  Sparkles,
  ArrowDownLeft,
  ArrowUpRight,
  RefreshCcw,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user, wallet, refreshUserData, setShowAdminPinModal, lockAdmin } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'TRANSACTIONS' | 'ACHIEVEMENTS' | 'ORDERS'>('TRANSACTIONS');
  const [txFilter, setTxFilter] = useState<string>('ALL');
  const [loading, setLoading] = useState(true);

  // Avatar Selection
  const [isEditingAvatar, setIsEditingAvatar] = useState(false);
  const avatarsList = ['avatar_1', 'avatar_2', 'avatar_3', 'avatar_4', 'avatar_5', 'avatar_admin'];

  useEffect(() => {
    const fetchProfileData = async () => {
      if (!user) return;
      try {
        const [wRes, oRes] = await Promise.all([
          api.getWallet().catch(() => ({ wallet: null, transactions: [] })),
          api.getMyOrders().catch(() => ({ orders: [] })),
        ]);
        setTransactions(wRes.transactions || []);
        setOrders(oRes.orders || []);
      } finally {
        setLoading(false);
      }
    };
    fetchProfileData();
  }, [user]);

  if (!user) {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-purple-600/20 text-purple-400 flex items-center justify-center mx-auto">
          <UserIcon className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-bold text-white">برای مشاهده پروفایل باید وارد شوید</h2>
        <p className="text-xs text-slate-400">
          اطلاعات کیف پول، تراکنش‌ها، لول و رکوردهای شما پس از ورود در اینجا نمایش داده می‌شوند.
        </p>
        <button
          onClick={() => {
            sound.playClick();
            setShowAdminPinModal(true);
          }}
          className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          ورود به عنوان مدیر سیستم
        </button>
      </div>
    );
  }

  // Calculate XP progress to next level
  const currentLevelXpFloor = (user.level - 1) * (user.level - 1) * 80;
  const nextLevelXpFloor = user.level * user.level * 80;
  const xpNeeded = nextLevelXpFloor - currentLevelXpFloor;
  const userProgressInLevel = Math.max(0, user.xp - currentLevelXpFloor);
  const xpPercentage = Math.min(100, Math.round((userProgressInLevel / xpNeeded) * 100));

  const achievements = [
    {
      id: 'ach_1',
      title: 'شکارچی کلید TF2',
      desc: 'ثبت اولین سفارش کلید Mann Co. در فروشگاه',
      unlocked: orders.length > 0,
      icon: '🗝️',
    },
    {
      id: 'ach_2',
      title: 'انگشت رعدآسا',
      desc: 'رسیدن به قدرت کلیک سطح ۳ در تپ‌کوین',
      unlocked: true,
      icon: '⚡',
    },
    {
      id: 'ach_3',
      title: 'ذهن برتر کارتی',
      desc: 'پیروزی در چالش کارت‌های حافظه',
      unlocked: true,
      icon: '🧠',
    },
    {
      id: 'ach_4',
      title: 'شانس طلایی',
      desc: 'چرخش گردونه شانس و کسب جایزه',
      unlocked: true,
      icon: '🎰',
    },
    {
      id: 'ach_5',
      title: 'واکنش رفلکس فراصوت',
      desc: 'کسب رکورد زیر ۲۸۰ میلی‌ثانیه در تست واکنش',
      unlocked: user.level >= 3,
      icon: '🎯',
    },
    {
      id: 'ach_6',
      title: 'کهنه‌سرباز کوین‌زون',
      desc: 'رسیدن به سطح ۱۰ گیمر در پلتفرم',
      unlocked: user.level >= 10,
      icon: '👑',
    },
  ];

  const filteredTx = transactions.filter((t) => {
    if (txFilter === 'ALL') return true;
    return t.type === txFilter;
  });

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Profile Overview Card */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 sm:p-8 glass-panel flex flex-col md:flex-row items-center justify-between gap-6 relative overflow-hidden">
        <div className="flex flex-col sm:flex-row items-center gap-5 text-center sm:text-right">
          <div className="relative">
            <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl bg-gradient-to-tr from-purple-600 via-indigo-600 to-cyan-500 p-1 shadow-xl glow-purple">
              <div className="w-full h-full bg-[#0a0b0e] rounded-[14px] flex items-center justify-center text-3xl font-black text-white">
                {user.username.slice(0, 1)}
              </div>
            </div>
            {user.role === 'admin' && (
              <div className="absolute -top-2 -right-2 px-2 py-0.5 rounded-md bg-amber-500 text-black font-black text-[10px] flex items-center gap-1 shadow">
                <Shield className="w-3 h-3" />
                <span>مدیر کل</span>
              </div>
            )}
          </div>

          <div>
            <div className="flex items-center justify-center sm:justify-start gap-2">
              <h2 className="text-2xl font-black text-white">{user.username}</h2>
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                سطح {user.level}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-1 font-mono">{user.email}</p>

            {/* XP Progress */}
            <div className="mt-3 w-64 max-w-full">
              <div className="w-full bg-white/10 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                  style={{ width: `${xpPercentage}%` }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                <span>پیشرفت تا سطح {user.level + 1}</span>
                <span className="font-mono">{xpPercentage}٪ ({user.xp} XP)</span>
              </div>
            </div>
          </div>
        </div>

        {/* Lifetime Stats */}
        <div className="flex items-center gap-4 text-center">
          <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
            <div className="text-[10px] text-slate-400">مجموع درآمد (Earned)</div>
            <div className="text-lg font-black text-amber-300 font-mono mt-0.5">
              {wallet ? wallet.earnedTotal.toLocaleString('fa-IR') : '۰'}
            </div>
          </div>
          <div className="p-3 bg-white/[0.03] border border-white/5 rounded-xl">
            <div className="text-[10px] text-slate-400">مجموع مصرف (Spent)</div>
            <div className="text-lg font-black text-slate-300 font-mono mt-0.5">
              {wallet ? wallet.spentTotal.toLocaleString('fa-IR') : '۰'}
            </div>
          </div>
          <div>
            {user.role === 'admin' ? (
              <button
                onClick={lockAdmin}
                className="px-3 py-2 bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="تغییر به کاربر عادی"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>خروج از ادمین</span>
              </button>
            ) : (
              <button
                onClick={() => setShowAdminPinModal(true)}
                className="px-3 py-2 bg-white/[0.04] hover:bg-amber-500/20 border border-white/10 hover:border-amber-500/40 text-slate-400 hover:text-amber-300 font-bold text-xs rounded-xl flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap"
                title="ورود با پین‌کد مدیریت (پیش‌فرض: ۱۲۳)"
              >
                <Shield className="w-3.5 h-3.5 text-amber-400" />
                <span>کلید ادمین</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Wallet Summary Boxes */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel">
          <div className="text-xs text-slate-400">موجودی در دسترس (Available)</div>
          <div className="text-2xl font-black text-amber-300 mt-1 flex items-baseline gap-1">
            <span>{wallet ? wallet.balance.toLocaleString('fa-IR') : '۰'}</span>
            <span className="text-xs text-slate-400">سکه</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">آماده خرید کلید TF2 یا ارتقا بازی‌ها</div>
        </div>

        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel">
          <div className="text-xs text-slate-400">سکه‌های در صف سفارش (Reserved)</div>
          <div className="text-2xl font-black text-cyan-300 mt-1 flex items-baseline gap-1">
            <span>{wallet ? wallet.reservedBalance.toLocaleString('fa-IR') : '۰'}</span>
            <span className="text-xs text-slate-400">سکه</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">رزرو شده تا زمان تایید ارسال در استیم</div>
        </div>

        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel">
          <div className="text-xs text-slate-400">تعداد کل سفارشات استیم</div>
          <div className="text-2xl font-black text-purple-300 mt-1 flex items-baseline gap-1 font-mono">
            <span>{orders.length}</span>
            <span className="text-xs text-slate-400 font-sans">سفارش</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">شامل سفارشات تحویل‌شده و در انتظار</div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="flex items-center gap-2 p-1.5 bg-[#12141c] border border-white/10 rounded-2xl glass-panel">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('TRANSACTIONS');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'TRANSACTIONS' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Clock className="w-4 h-4" />
          <span>دفتر کل تراکنش‌ها (Ledger)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('ACHIEVEMENTS');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'ACHIEVEMENTS' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Award className="w-4 h-4" />
          <span>مدال‌ها و دستاوردها ({achievements.filter((a) => a.unlocked).length}/{achievements.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('ORDERS');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'ORDERS' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Coins className="w-4 h-4" />
          <span>سفارشات آیتم TF2</span>
        </button>
      </div>

      {/* TAB: TRANSACTIONS */}
      {activeTab === 'TRANSACTIONS' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">گردش مالی و تاریخچه سکه‌ها</h3>
            
            {/* Filters */}
            <div className="flex items-center gap-1 overflow-x-auto text-xs">
              {['ALL', 'GAME_REWARD', 'DAILY_REWARD', 'MISSION_REWARD', 'PURCHASE_RESERVE', 'PURCHASE_REFUND'].map((f) => (
                <button
                  key={f}
                  onClick={() => setTxFilter(f)}
                  className={`px-2.5 py-1 rounded-lg border transition-all cursor-pointer whitespace-nowrap ${
                    txFilter === f
                      ? 'bg-purple-600/40 border-purple-500 text-white font-bold'
                      : 'border-white/5 text-slate-400 hover:text-white'
                  }`}
                >
                  {f === 'ALL'
                    ? 'همه'
                    : f === 'GAME_REWARD'
                    ? 'بازی‌ها'
                    : f === 'DAILY_REWARD'
                    ? 'پاداش روزانه'
                    : f === 'MISSION_REWARD'
                    ? 'ماموریت‌ها'
                    : f === 'PURCHASE_RESERVE'
                    ? 'رزرو خرید'
                    : 'استرداد'}
                </button>
              ))}
            </div>
          </div>

          {filteredTx.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              تراکنشی در این دسته‌بندی وجود ندارد.
            </div>
          ) : (
            <div className="space-y-2.5">
              {filteredTx.map((tx) => {
                const isPositive = tx.amount >= 0;
                return (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-3 bg-white/[0.02] border border-white/5 rounded-xl text-xs hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-bold ${
                          isPositive
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                        }`}
                      >
                        {isPositive ? <ArrowDownLeft className="w-4 h-4" /> : <ArrowUpRight className="w-4 h-4" />}
                      </div>
                      <div>
                        <div className="font-bold text-white">{tx.description}</div>
                        <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                          {new Date(tx.createdAt).toLocaleString('fa-IR')} · مانده پس از تراکنش: {tx.balanceAfter} سکه
                        </div>
                      </div>
                    </div>

                    <div className="text-left font-mono font-black text-sm">
                      <span className={isPositive ? 'text-emerald-400' : 'text-rose-400'}>
                        {isPositive ? `+${tx.amount}` : tx.amount} سکه
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* TAB: ACHIEVEMENTS */}
      {activeTab === 'ACHIEVEMENTS' && (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
          {achievements.map((ach) => (
            <div
              key={ach.id}
              className={`p-5 rounded-2xl border transition-all flex flex-col justify-between ${
                ach.unlocked
                  ? 'bg-[#12141c] border-purple-500/40 glass-panel glow-purple'
                  : 'bg-[#0f1118] border-white/5 opacity-50'
              }`}
            >
              <div>
                <div className="text-3xl mb-3">{ach.icon}</div>
                <h4 className="text-sm font-black text-white">{ach.title}</h4>
                <p className="text-xs text-slate-400 mt-1 leading-relaxed">{ach.desc}</p>
              </div>

              <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold">
                {ach.unlocked ? (
                  <span className="text-emerald-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>کسب شده</span>
                  </span>
                ) : (
                  <span className="text-slate-500">قفل</span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* TAB: ORDERS */}
      {activeTab === 'ORDERS' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-4">
          <h3 className="text-base font-bold text-white mb-2">سفارشات آیتم‌های استیم</h3>
          {orders.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">
              هنوز سفارشی ثبت نکرده‌اید.
            </div>
          ) : (
            <div className="space-y-3">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="p-3.5 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs"
                >
                  <div>
                    <div className="font-bold text-white">{o.productName || 'آیتم TF2'} (تعداد: {o.quantity})</div>
                    <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                      شناسه: {o.id} · تاریخ: {new Date(o.createdAt).toLocaleDateString('fa-IR')}
                    </div>
                  </div>
                  <div className="text-left font-bold">
                    <span className="text-amber-300 font-mono">{o.totalCoins} سکه</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
