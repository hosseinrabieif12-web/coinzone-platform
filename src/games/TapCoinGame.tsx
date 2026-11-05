import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { IMAGES } from '../assets/images';
import { Zap, Bot, ArrowUpCircle, Sparkles, RefreshCw } from 'lucide-react';

interface FloatingNumber {
  id: number;
  x: number;
  y: number;
  value: number;
}

export const TapCoinGame: React.FC = () => {
  const { user, wallet, updateWallet, updateUser, setShowAuthModal } = useAuth();
  
  // Local Game State
  const [clickPower, setClickPower] = useState(1);
  const [passivePerSec, setPassivePerSec] = useState(0);
  const [pendingTaps, setPendingTaps] = useState(0);
  const [floatingNumbers, setFloatingNumbers] = useState<FloatingNumber[]>([]);
  const [isPressing, setIsPressing] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [todayTaps, setTodayTaps] = useState(0);
  const maxDailyTaps = 1000;

  // Upgrades
  const [clickUpgradeCost, setClickUpgradeCost] = useState(30);
  const [passiveUpgradeCost, setPassiveUpgradeCost] = useState(60);

  // Sync ref
  const syncTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Passive Income Timer
  useEffect(() => {
    if (passivePerSec <= 0 || !user) return;
    const interval = setInterval(() => {
      setPendingTaps((prev) => prev + passivePerSec);
    }, 1000);
    return () => clearInterval(interval);
  }, [passivePerSec, user]);

  // Periodic Auto-Sync to Server
  useEffect(() => {
    if (pendingTaps >= 15 && user && !isSyncing) {
      if (syncTimeoutRef.current) clearTimeout(syncTimeoutRef.current);
      syncTimeoutRef.current = setTimeout(() => {
        handleServerSync();
      }, 1000);
    }
  }, [pendingTaps, user]);

  const handleServerSync = async () => {
    if (pendingTaps <= 0 || !user || isSyncing) return;
    const tapsToSync = pendingTaps;
    setIsSyncing(true);
    try {
      const res = await api.syncTapCoin(tapsToSync, clickPower);
      setPendingTaps((prev) => Math.max(0, prev - tapsToSync));
      setTodayTaps((prev) => prev + tapsToSync);
      updateWallet(res.wallet);
      updateUser(res.user);
    } catch {
      // Keep pending taps to retry
    } finally {
      setIsSyncing(false);
    }
  };

  const handleCoinClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!user) {
      sound.playClick();
      setShowAuthModal(true);
      return;
    }

    if (todayTaps + pendingTaps >= maxDailyTaps) {
      sound.playError();
      alert('شما به سقف مجاز ضربه روزانه (۱۰۰۰ تپ) رسیده‌اید. فردا دوباره ادامه دهید!');
      return;
    }

    sound.playCoin();
    setIsPressing(true);
    setTimeout(() => setIsPressing(false), 120);

    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const newFloat: FloatingNumber = {
      id: Date.now() + Math.random(),
      x,
      y,
      value: clickPower,
    };

    setFloatingNumbers((prev) => [...prev.slice(-15), newFloat]);
    setPendingTaps((prev) => prev + 1);

    setTimeout(() => {
      setFloatingNumbers((prev) => prev.filter((f) => f.id !== newFloat.id));
    }, 900);
  };

  const buyClickUpgrade = () => {
    if (!user || !wallet) {
      setShowAuthModal(true);
      return;
    }
    if (wallet.balance < clickUpgradeCost) {
      sound.playError();
      alert(`موجودی شما کافی نیست. به ${clickUpgradeCost} سکه نیاز دارید.`);
      return;
    }
    sound.playWin();
    // optimistic
    wallet.balance -= clickUpgradeCost;
    updateWallet({ ...wallet });
    setClickPower((p) => p + 1);
    setClickUpgradeCost((c) => Math.floor(c * 1.8));
  };

  const buyPassiveUpgrade = () => {
    if (!user || !wallet) {
      setShowAuthModal(true);
      return;
    }
    if (wallet.balance < passiveUpgradeCost) {
      sound.playError();
      alert(`موجودی شما کافی نیست. به ${passiveUpgradeCost} سکه نیاز دارید.`);
      return;
    }
    sound.playWin();
    wallet.balance -= passiveUpgradeCost;
    updateWallet({ ...wallet });
    setPassivePerSec((p) => p + 1);
    setPassiveUpgradeCost((c) => Math.floor(c * 2.2));
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>بازی شماره ۱: استخراج با لمس سکه</span>
          </div>
          <h2 className="text-2xl font-black text-white">تپ کوین گیمینگی (Tap Coin)</h2>
          <p className="text-xs text-slate-400 mt-1">
            روی سکه طلایی کلیک کن، سکه جمع‌آوری کن، ابزارهای کمکی بخر و خودت را به کلید TF2 نزدیک‌تر کن!
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="text-center px-4 py-2 bg-purple-950/40 border border-purple-500/20 rounded-xl">
            <div className="text-[11px] text-slate-400">قدرت هر کلیک</div>
            <div className="text-lg font-black text-purple-300">+{clickPower} سکه</div>
          </div>
          <div className="text-center px-4 py-2 bg-cyan-950/40 border border-cyan-500/20 rounded-xl">
            <div className="text-[11px] text-slate-400">استخراج خودکار</div>
            <div className="text-lg font-black text-cyan-300">+{passivePerSec}/ثانیه</div>
          </div>
        </div>
      </div>

      {/* Main Play Area */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Center Coin Tap Card */}
        <div className="lg:col-span-2 bg-[#12141c] border border-white/10 rounded-2xl p-8 glass-panel flex flex-col items-center justify-center relative select-none min-h-[420px] overflow-hidden">
          
          {/* Subtle glow aura */}
          <div className="absolute w-72 h-72 rounded-full bg-amber-500/15 blur-3xl pointer-events-none" />

          {/* Pending Sync Ticker */}
          <div className="absolute top-4 right-4 flex items-center gap-2 px-3 py-1 bg-black/40 border border-white/10 rounded-full text-xs text-slate-300">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
            <span>در انتظار همگام‌سازی: {pendingTaps * clickPower} سکه</span>
            {pendingTaps > 0 && (
              <button
                onClick={handleServerSync}
                disabled={isSyncing}
                className="mr-1 text-purple-400 hover:text-white p-1 cursor-pointer"
                title="همگام‌سازی فوری با دیتابیس"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin' : ''}`} />
              </button>
            )}
          </div>

          {/* Daily Limit Bar */}
          <div className="absolute top-4 left-4 text-xs text-slate-400">
            سقف روزانه: {todayTaps + pendingTaps} / {maxDailyTaps} تپ
          </div>

          {/* Animated Coin */}
          <div
            onClick={handleCoinClick}
            className={`relative cursor-pointer transition-transform duration-100 ease-out active:scale-95 my-auto ${
              isPressing ? 'scale-90 rotate-2' : 'hover:scale-105'
            }`}
          >
            <div className="w-56 h-56 sm:w-64 sm:h-64 rounded-full p-2 bg-gradient-to-tr from-amber-600 via-yellow-400 to-amber-200 shadow-2xl glow-gold flex items-center justify-center">
              <img
                src={IMAGES.goldCoin}
                alt="سکه کوین‌زون"
                className="w-full h-full object-cover rounded-full pointer-events-none shadow-inner"
              />
            </div>

            {/* Floating numbers overlay */}
            {floatingNumbers.map((item) => (
              <span
                key={item.id}
                style={{ left: item.x, top: item.y }}
                className="absolute pointer-events-none text-xl sm:text-2xl font-black text-amber-300 drop-shadow-[0_2px_8px_rgba(0,0,0,0.8)] animate-floatUp"
              >
                +{item.value}
              </span>
            ))}
          </div>

          <p className="text-xs text-slate-400 mt-4 text-center font-medium">
            💡 برای استخراج هرچه سریع‌تر روی سکه کلیک کنید!
          </p>
        </div>

        {/* Upgrades Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <ArrowUpCircle className="w-4 h-4 text-purple-400" />
              <span>ارتقای استخراج</span>
            </h3>

            {/* Click Upgrade */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl mb-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">قدرت ضربه</div>
                    <div className="text-[10px] text-slate-400">افزایش +۱ سکه به هر کلیک</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-purple-300">سطح {clickPower}</span>
              </div>

              <button
                onClick={buyClickUpgrade}
                className="w-full py-2 bg-purple-600/30 hover:bg-purple-600/50 border border-purple-500/40 text-purple-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>ارتقا</span>
                <span className="text-amber-400">({clickUpgradeCost} سکه)</span>
              </button>
            </div>

            {/* Passive Income Upgrade */}
            <div className="p-3 bg-white/[0.03] border border-white/10 rounded-xl space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-400">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white">ربات ماینر خودکار</div>
                    <div className="text-[10px] text-slate-400">استخراج خودکار در ثانیه</div>
                  </div>
                </div>
                <span className="text-xs font-bold text-cyan-300">سطح {passivePerSec}</span>
              </div>

              <button
                onClick={buyPassiveUpgrade}
                className="w-full py-2 bg-cyan-600/30 hover:bg-cyan-600/50 border border-cyan-500/40 text-cyan-200 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center justify-center gap-1.5"
              >
                <span>ارتقا ربات</span>
                <span className="text-amber-400">({passiveUpgradeCost} سکه)</span>
              </button>
            </div>
          </div>

          {/* Quick Info Box */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 glass-panel text-xs text-slate-400 space-y-1.5 leading-relaxed">
            <div className="font-bold text-slate-200 mb-1">قوانین و امنیت:</div>
            <div>• سکه‌ها در فواصل زمانی کوتاه به صورت ایمن با سرور سینک می‌شوند.</div>
            <div>• استفاده از اتوکلیکرهای سنگین توسط مکانیزم سقف روزانه کنترل می‌شود.</div>
            <div>• امتیازهای کسب شده مستقیماً به XP و لول اکانت شما افزوده می‌شوند.</div>
          </div>
        </div>

      </div>
    </div>
  );
};
