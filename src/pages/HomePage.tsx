import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { IMAGES } from '../assets/images';
import { Mission, Transaction } from '../types';
import {
  Gamepad2,
  Gift,
  Coins,
  ArrowRight,
  Sparkles,
  Zap,
  Target,
  Brain,
  Timer,
  CheckCircle2,
} from 'lucide-react';

interface HomePageProps {
  setActiveTab: (tab: string) => void;
  setSelectedGame?: (game: string) => void;
}

export const HomePage: React.FC<HomePageProps> = ({ setActiveTab }) => {
  const { user, wallet, setShowAuthModal, setShowDailyModal } = useAuth();
  const [missions, setMissions] = useState<Mission[]>([]);
  const [recentTransactions, setRecentTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [mRes, wRes] = await Promise.all([
          api.getMissions().catch(() => ({ missions: [] })),
          api.getWallet().catch(() => ({ wallet: null, transactions: [] })),
        ]);
        setMissions(mRes.missions.slice(0, 3));
        setRecentTransactions(wRes.transactions?.slice(0, 4) || []);
      } finally {
        setLoading(false);
      }
    };
    loadHomeData();
  }, [user]);

  // Game cards definition
  const featuredGames = [
    {
      id: 'tap_coin',
      title: 'تپ کوین (Tap Coin)',
      desc: 'سکه را لمس کن، قدرت ارتقا بخر و درآمد خودکار بساز.',
      icon: Coins,
      color: 'from-amber-500/20 to-yellow-600/20 text-amber-400 border-amber-500/30',
      badge: 'محبوب‌ترین',
    },
    {
      id: 'lucky_wheel',
      title: 'گردونه شانس',
      desc: '۱ چرخش روزانه رایگان با شانس تا ۲۰۰ سکه طلایی.',
      icon: Gift,
      color: 'from-purple-500/20 to-indigo-600/20 text-purple-400 border-purple-500/30',
      badge: 'پاداش فوری',
    },
    {
      id: 'memory',
      title: 'کارت‌های حافظه',
      desc: '۳ سطح دشواری تطبیق کارت‌های سلاح‌ها و اسکین‌های گیمینگی.',
      icon: Brain,
      color: 'from-cyan-500/20 to-blue-600/20 text-cyan-400 border-cyan-500/30',
      badge: 'ضریب XP بالا',
    },
    {
      id: 'reaction_test',
      title: 'تست سرعت واکنش',
      desc: 'سنجش رفلکس با دقت میلی‌ثانیه و پاداش رده‌های الماس و طلا.',
      icon: Zap,
      color: 'from-emerald-500/20 to-teal-600/20 text-emerald-400 border-emerald-500/30',
      badge: 'رفلکس گیمر',
    },
    {
      id: 'number_guess',
      title: 'حدس عدد شانس',
      desc: 'چالش هوش ریاضی و حدس عدد مخفی سرور در ۶ تلاش.',
      icon: Target,
      color: 'from-pink-500/20 to-rose-600/20 text-pink-400 border-pink-500/30',
      badge: 'امتیازی',
    },
  ];

  return (
    <div className="space-y-10 pb-12">
      {/* 1. Hero Showcase Banner */}
      <div className="relative rounded-3xl overflow-hidden border border-white/10 shadow-2xl glass-panel">
        <div className="absolute inset-0 z-0">
          <img
            src={IMAGES.heroBanner}
            alt="COINZONE گیمینگ آرنا"
            className="w-full h-full object-cover opacity-35 filter brightness-75 scale-105 transform hover:scale-100 transition-transform duration-1000"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0b0e] via-[#0a0b0e]/75 to-transparent" />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0a0b0e] via-transparent to-transparent" />
        </div>

        <div className="relative z-10 p-6 sm:p-10 lg:p-12 max-w-3xl">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-purple-500/20 border border-purple-500/30 text-purple-300 text-xs font-bold mb-4 shadow">
            <Sparkles className="w-3.5 h-3.5 text-cyan-400" />
            <span>پلتفرم رسمی جوایز استیم و کلید Team Fortress 2</span>
          </div>

          <h1 className="text-3xl sm:text-5xl font-black text-white tracking-tight leading-tight">
            بازی کن، سکه جمع کن، <br />
            <span className="bg-gradient-to-r from-purple-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              کلید Mann Co. TF2
            </span>{' '}
            دریافت کن!
          </h1>

          <p className="mt-4 text-sm sm:text-base text-slate-300 leading-relaxed max-w-2xl">
            در ۵ مینی‌گیم هیجان‌انگیز مهارت‌هایت را به چالش بکش، مأموریت‌های روزانه را انجام بده و سکه‌هایت را به صورت
            مستقیم و آنی به کلیدهای ارزشمند Team Fortress 2 تبدیل کن.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-4">
            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('games');
              }}
              className="py-3.5 px-6 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-600/40 transition-all cursor-pointer flex items-center gap-2 group"
            >
              <Gamepad2 className="w-4 h-4 group-hover:rotate-12 transition-transform" />
              <span>ورود به بخش بازی‌ها</span>
              <ArrowRight className="w-4 h-4 rotate-180" />
            </button>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('shop');
              }}
              className="py-3.5 px-6 bg-white/[0.06] hover:bg-white/[0.12] border border-white/15 text-white font-bold text-sm rounded-xl transition-all cursor-pointer flex items-center gap-2"
            >
              <span>مشاهده فروشگاه کلید TF2</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. User Stats & Daily Reward Strip */}
      {user && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Level & XP */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">سطح شما (Level)</div>
              <div className="text-2xl font-black text-white mt-0.5">سطح {user.level}</div>
              <div className="text-[11px] text-purple-400 mt-1">مجموع XP: {user.xp.toLocaleString('fa-IR')}</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-purple-600/20 border border-purple-500/30 text-purple-300 flex items-center justify-center font-black text-lg">
              {user.level}
            </div>
          </div>

          {/* Current Coin Balance */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel flex items-center justify-between">
            <div>
              <div className="text-xs text-slate-400">موجودی سکه در دسترس</div>
              <div className="text-2xl font-black text-amber-300 mt-0.5 flex items-baseline gap-1.5">
                <span>{wallet ? wallet.balance.toLocaleString('fa-IR') : '۰'}</span>
                <span className="text-xs text-slate-400 font-normal">سکه</span>
              </div>
              {wallet && wallet.reservedBalance > 0 && (
                <div className="text-[11px] text-cyan-400 mt-1">
                  {wallet.reservedBalance.toLocaleString('fa-IR')} سکه در صف سفارشات
                </div>
              )}
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-amber-400 flex items-center justify-center text-2xl">
              🪙
            </div>
          </div>

          {/* Daily Login Reward CTA */}
          <div
            onClick={() => {
              sound.playClick();
              setShowDailyModal(true);
            }}
            className="bg-gradient-to-r from-amber-500/10 to-yellow-600/10 border border-amber-500/30 hover:border-amber-400/60 rounded-2xl p-5 glass-panel flex items-center justify-between cursor-pointer transition-all group"
          >
            <div>
              <div className="text-xs font-bold text-amber-300">تقویم پاداش روزانه</div>
              <div className="text-sm font-black text-white mt-0.5">دریافت سکه‌های رایگان امروز</div>
              <div className="text-[11px] text-slate-400 mt-1">تا ۱۵۰ سکه پاداش زنجیره‌ای</div>
            </div>
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center group-hover:scale-110 transition-transform">
              <Gift className="w-6 h-6 animate-bounce" />
            </div>
          </div>
        </div>
      )}

      {/* Admin Quick Action Banner */}
      {user?.role === 'admin' && (
        <div className="p-4 bg-gradient-to-r from-purple-950/40 via-indigo-950/30 to-[#12141c] border border-purple-500/30 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 animate-fadeIn">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold shrink-0">
              ⚡
            </div>
            <div>
              <div className="text-xs font-bold text-white flex items-center gap-2">
                <span>قابلیت آپلود خودکار پروژه روی گیت‌هاب (GitHub Auto-Upload)</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">فعال</span>
              </div>
              <div className="text-[11px] text-slate-400 mt-0.5">
                سورس کامل پلتفرم، ورکر Cloudflare و دیتابیس را فقط با وارد کردن یک توکن روی گیت‌هاب پوش کنید.
              </div>
            </div>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('admin');
            }}
            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
          >
            <span>ورود به بخش آپلود گیت‌هاب</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>
      )}

      {/* 3. Featured 5 Playable Games */}
      <div>
        <div className="flex items-center justify-between mb-5">
          <div>
            <h2 className="text-xl font-black text-white">بازی‌های کوین‌زون</h2>
            <p className="text-xs text-slate-400 mt-0.5">انتخاب کن و همین حالا شروع به استخراج سکه کن</p>
          </div>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('games');
            }}
            className="text-xs font-bold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer"
          >
            <span>مشاهده همه</span>
            <ArrowRight className="w-3.5 h-3.5 rotate-180" />
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {featuredGames.map((game) => {
            const Icon = game.icon;
            return (
              <div
                key={game.id}
                onClick={() => {
                  sound.playClick();
                  setActiveTab('games');
                }}
                className="bg-[#12141c] border border-white/10 hover:border-purple-500/40 rounded-2xl p-5 glass-panel glass-panel-hover flex flex-col justify-between cursor-pointer group"
              >
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${game.color} border flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform`}>
                      <Icon className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white/[0.05] border border-white/10 text-slate-300">
                      {game.badge}
                    </span>
                  </div>
                  <h3 className="text-base font-bold text-white group-hover:text-purple-300 transition-colors">
                    {game.title}
                  </h3>
                  <p className="text-xs text-slate-400 mt-1.5 leading-relaxed">{game.desc}</p>
                </div>

                <div className="mt-4 pt-3 border-t border-white/5 flex items-center justify-between text-xs font-bold text-purple-400 group-hover:text-cyan-300 transition-colors">
                  <span>ورود به بازی</span>
                  <ArrowRight className="w-4 h-4 rotate-180 group-hover:-translate-x-1 transition-transform" />
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* 4. Featured TF2 Product Card & Missions Split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Featured TF2 Item Showcase */}
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel relative overflow-hidden flex flex-col justify-between">
          <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
          
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                محصول اصلی پلتفرم
              </span>
              <span className="text-xs text-slate-400">موجودی انبار: ۴۲ عدد</span>
            </div>

            <div className="relative rounded-xl overflow-hidden aspect-square mb-4 border border-white/10 bg-black/40">
              <img
                src={IMAGES.tf2Key}
                alt="Mann Co Supply Crate Key"
                className="w-full h-full object-cover transform hover:scale-105 transition-transform duration-500"
              />
            </div>

            <h3 className="text-lg font-black text-white">کلید صندوق مان‌کو TF2</h3>
            <p className="text-xs text-slate-400 mt-1 leading-relaxed">
              ارزشمندترین و استانداردترین واحد پول مارکت استیم. قابل ترید فوری یا فروش در بازار.
            </p>
          </div>

          <div className="mt-5 pt-4 border-t border-white/10 flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400">قیمت خرید</div>
              <div className="text-xl font-black text-amber-300 flex items-baseline gap-1">
                <span>۶۵۰</span>
                <span className="text-xs text-slate-400">سکه</span>
              </div>
            </div>

            <button
              onClick={() => {
                sound.playClick();
                setActiveTab('shop');
              }}
              className="py-2.5 px-5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer"
            >
              دریافت این آیتم
            </button>
          </div>
        </div>

        {/* Missions & Live Activity */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Daily Missions Glance */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Target className="w-5 h-5 text-purple-400" />
                <h3 className="text-base font-bold text-white">مأموریت‌های روزانه</h3>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('missions');
                }}
                className="text-xs font-bold text-purple-400 hover:text-purple-300 cursor-pointer"
              >
                مشاهده همه مأموریت‌ها
              </button>
            </div>

            <div className="space-y-3">
              {missions.map((m) => {
                const progress = m.currentProgress || 0;
                const pct = Math.min(100, Math.round((progress / m.goalTarget) * 100));
                return (
                  <div
                    key={m.id}
                    className="p-3.5 bg-white/[0.03] border border-white/5 rounded-xl flex items-center justify-between gap-4"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white truncate">{m.title}</span>
                        {m.completed && (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        )}
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="mt-2 w-full bg-white/10 rounded-full h-1.5 overflow-hidden">
                        <div
                          className="bg-gradient-to-r from-purple-500 to-cyan-400 h-full rounded-full transition-all duration-300"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                        <span>پیشرفت: {progress} / {m.goalTarget}</span>
                        <span>{pct}٪</span>
                      </div>
                    </div>

                    <div className="text-left shrink-0">
                      <div className="text-xs font-black text-amber-300">+{m.rewardCoins} سکه</div>
                      <div className="text-[10px] text-purple-300 font-bold">+{m.rewardXp} XP</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Recent Live Transactions */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Timer className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">گردش تراکنش‌های اخیر</h3>
              </div>
              <button
                onClick={() => {
                  sound.playClick();
                  setActiveTab('profile');
                }}
                className="text-xs font-bold text-cyan-400 hover:text-cyan-300 cursor-pointer"
              >
                تاریخچه کامل
              </button>
            </div>

            {recentTransactions.length === 0 ? (
              <div className="text-center py-6 text-xs text-slate-500">
                تراکنشی جهت نمایش یافت نشد.
              </div>
            ) : (
              <div className="space-y-2">
                {recentTransactions.map((tx) => (
                  <div
                    key={tx.id}
                    className="flex items-center justify-between p-2.5 bg-white/[0.02] border border-white/5 rounded-xl text-xs"
                  >
                    <div className="truncate max-w-[260px] text-slate-300 font-medium">
                      {tx.description}
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className={`font-mono font-bold ${tx.amount >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                        {tx.amount >= 0 ? `+${tx.amount}` : tx.amount} سکه
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </div>
  );
};
