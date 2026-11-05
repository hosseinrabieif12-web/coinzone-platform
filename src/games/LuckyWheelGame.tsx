import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Sparkles, Trophy, AlertCircle, Clock } from 'lucide-react';

interface Segment {
  label: string;
  coins: number;
  color: string;
  probability: string;
}

export const LuckyWheelGame: React.FC = () => {
  const { user, updateWallet, updateUser, setShowAuthModal } = useAuth();
  const [canSpin, setCanSpin] = useState<boolean>(true);
  const [loadingStatus, setLoadingStatus] = useState<boolean>(true);
  const [isSpinning, setIsSpinning] = useState<boolean>(false);
  const [rotation, setRotation] = useState<number>(0);
  const [winResult, setWinResult] = useState<{ coins: number; xp: number } | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  // Wheel Segments (6 primary prize levels repeated evenly or segmented)
  const segments: Segment[] = [
    { label: '۱۰ سکه', coins: 10, color: '#3b82f6', probability: '۴۰٪' },
    { label: '۲۰ سکه', coins: 20, color: '#8b5cf6', probability: '۳۰٪' },
    { label: '۳۰ سکه', coins: 30, color: '#06b6d4', probability: '۱۵٪' },
    { label: '۵۰ سکه', coins: 50, color: '#ec4899', probability: '۱۰٪' },
    { label: '۱۰۰ سکه', coins: 100, color: '#eab308', probability: '۴٪' },
    { label: '۲۰۰ سکه', coins: 200, color: '#f97316', probability: '۱٪' },
    { label: '۱۰ سکه', coins: 10, color: '#6366f1', probability: '۴۰٪' },
    { label: '۲۰ سکه', coins: 20, color: '#a855f7', probability: '۳۰٪' },
  ];

  // Draw the wheel on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const numSegs = segments.length;
    const anglePerSeg = (2 * Math.PI) / numSegs;
    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = centerX - 12;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    segments.forEach((seg, i) => {
      const startAngle = i * anglePerSeg;
      const endAngle = (i + 1) * anglePerSeg;

      // Slice
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.arc(centerX, centerY, radius, startAngle, endAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();

      // Border line
      ctx.lineWidth = 2;
      ctx.strokeStyle = '#0a0b0e';
      ctx.stroke();

      // Text
      ctx.save();
      ctx.translate(centerX, centerY);
      ctx.rotate(startAngle + anglePerSeg / 2);
      ctx.textAlign = 'right';
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 15px Vazirmatn, sans-serif';
      ctx.shadowColor = 'rgba(0, 0, 0, 0.7)';
      ctx.shadowBlur = 4;
      ctx.fillText(seg.label, radius - 25, 6);
      ctx.restore();
    });

    // Outer rim
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#232738';
    ctx.stroke();

    // Center hub
    ctx.beginPath();
    ctx.arc(centerX, centerY, 32, 0, 2 * Math.PI);
    ctx.fillStyle = '#0a0b0e';
    ctx.fill();
    ctx.lineWidth = 4;
    ctx.strokeStyle = '#a855f7';
    ctx.stroke();

    ctx.fillStyle = '#facc15';
    ctx.font = 'bold 18px sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('⚡', centerX, centerY);
  }, []);

  // Check Daily Spin Status
  useEffect(() => {
    if (!user) {
      setLoadingStatus(false);
      return;
    }
    const checkStatus = async () => {
      try {
        const res = await api.getLuckyWheelStatus();
        setCanSpin(res.canSpin);
      } catch {
        // ignore
      } finally {
        setLoadingStatus(false);
      }
    };
    checkStatus();
  }, [user]);

  const handleSpin = async () => {
    if (!user) {
      sound.playClick();
      setShowAuthModal(true);
      return;
    }

    if (!canSpin || isSpinning) return;

    setIsSpinning(true);
    setWinResult(null);
    sound.playClick();

    try {
      const res = await api.spinLuckyWheel();
      
      // Calculate target angle based on returned prize
      // Target segment index
      let targetIndex = 0;
      for (let i = 0; i < segments.length; i++) {
        if (segments[i].coins === res.prizeCoins) {
          targetIndex = i;
          break;
        }
      }

      // Pointer is at the top (3 * PI / 2 or 270 deg)
      const numSegs = segments.length;
      const degPerSeg = 360 / numSegs;
      // To bring targetIndex to top (270 deg)
      // canvas startAngle=0 is at 3 o'clock (90 deg from top)
      const targetDeg = 270 - (targetIndex * degPerSeg + degPerSeg / 2);
      const totalSpin = 360 * 6 + targetDeg; // 6 full revolutions + target

      // Animate tick sounds
      let currentDeg = 0;
      const tickInterval = setInterval(() => {
        sound.playWheelTick();
        currentDeg += 30;
        if (currentDeg >= 1800) clearInterval(tickInterval);
      }, 70);

      setRotation(totalSpin);

      setTimeout(() => {
        setIsSpinning(false);
        setCanSpin(false);
        setWinResult({ coins: res.prizeCoins, xp: res.xpReward });
        sound.playWin();
        updateWallet(res.wallet);
        updateUser(res.user);
      }, 4500);
    } catch (err: unknown) {
      setIsSpinning(false);
      const e = err as Error;
      alert(e.message || 'خطا در ثبت چرخش گردونه');
      sound.playError();
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>بازی شماره ۲: شانس روزانه</span>
          </div>
          <h2 className="text-2xl font-black text-white">گردونه شانس کوین‌زون (Lucky Wheel)</h2>
          <p className="text-xs text-slate-400 mt-1">
            یک بار در روز شانس خود را امتحان کنید و تا ۲۰۰ سکه طلایی رایگان برنده شوید!
          </p>
        </div>

        <div className="flex items-center gap-2 px-4 py-2 bg-purple-950/40 border border-purple-500/30 rounded-xl text-xs font-bold text-purple-300">
          <Clock className="w-4 h-4 text-purple-400" />
          <span>۱ چرخش رایگان در هر ۲۴ ساعت</span>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Wheel Canvas Section */}
        <div className="lg:col-span-2 bg-[#12141c] border border-white/10 rounded-2xl p-8 glass-panel flex flex-col items-center justify-center relative min-h-[460px] overflow-hidden">
          
          {/* Subtle neon backdrop */}
          <div className="absolute w-80 h-80 rounded-full bg-purple-600/10 blur-3xl pointer-events-none" />

          {/* Top Indicator Arrow */}
          <div className="relative z-20 -mb-5 flex flex-col items-center">
            <div className="w-0 h-0 border-l-[14px] border-l-transparent border-r-[14px] border-r-transparent border-t-[24px] border-t-amber-400 drop-shadow-[0_2px_10px_rgba(250,204,21,0.8)] filter" />
          </div>

          {/* Canvas Wheel */}
          <div className="relative z-10 p-2">
            <canvas
              ref={canvasRef}
              width={340}
              height={340}
              style={{
                transform: `rotate(${rotation}deg)`,
                transition: isSpinning ? 'transform 4.5s cubic-bezier(0.12, 0.8, 0.15, 1)' : 'none',
              }}
              className="rounded-full shadow-2xl glow-purple max-w-full"
            />
          </div>

          {/* Result Alert */}
          {winResult && (
            <div className="mt-4 p-4 bg-emerald-500/20 border border-emerald-500/40 rounded-xl text-center animate-bounce z-20">
              <div className="text-base font-black text-emerald-300">🎉 تبریک! شما برنده شدید:</div>
              <div className="text-sm font-bold text-white mt-1">
                +{winResult.coins} سکه طلایی و +{winResult.xp} امتیاز XP
              </div>
            </div>
          )}

          {/* Spin Trigger Button */}
          <div className="mt-6 z-20 w-full max-w-xs">
            {canSpin ? (
              <button
                onClick={handleSpin}
                disabled={isSpinning || loadingStatus}
                className="w-full py-3.5 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-2 transform active:scale-95 disabled:opacity-50"
              >
                {isSpinning ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <Sparkles className="w-4 h-4" />
                    <span>چرخش رایگان گردونه شانس</span>
                  </>
                )}
              </button>
            ) : (
              <div className="flex items-center justify-center gap-2 py-3 px-4 bg-white/[0.04] border border-white/10 rounded-xl text-xs text-slate-400 font-medium text-center">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0" />
                <span>شما امروز شانس رایگان خود را استفاده کرده‌اید. فردا دوباره سر بزنید!</span>
              </div>
            )}
          </div>
        </div>

        {/* Probabilities Breakdown Sidebar */}
        <div className="space-y-4">
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel">
            <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>شانس جوایز (طبق مشخصات رسمی)</span>
            </h3>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <span className="text-blue-300 font-bold">۱۰ سکه</span>
                <span className="text-slate-300 font-mono">۴۰٪ شانس</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-purple-500/10 border border-purple-500/20">
                <span className="text-purple-300 font-bold">۲۰ سکه</span>
                <span className="text-slate-300 font-mono">۳۰٪ شانس</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-cyan-500/10 border border-cyan-500/20">
                <span className="text-cyan-300 font-bold">۳۰ سکه</span>
                <span className="text-slate-300 font-mono">۱۵٪ شانس</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-pink-500/10 border border-pink-500/20">
                <span className="text-pink-300 font-bold">۵۰ سکه</span>
                <span className="text-slate-300 font-mono">۱۰٪ شانس</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-yellow-500/10 border border-yellow-500/20">
                <span className="text-yellow-300 font-bold">۱۰۰ سکه (کمیاب)</span>
                <span className="text-slate-300 font-mono">۴٪ شانس</span>
              </div>
              <div className="flex items-center justify-between p-2 rounded-lg bg-orange-500/15 border border-orange-500/30">
                <span className="text-orange-400 font-black">۲۰۰ سکه (افسانه‌ای!)</span>
                <span className="text-orange-300 font-mono font-bold">۱٪ شانس</span>
              </div>
            </div>
          </div>

          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-4 glass-panel text-xs text-slate-400 space-y-2 leading-relaxed">
            <div className="font-bold text-slate-200">الگوریتم تصادفی ایمن:</div>
            <div>نتیجه چرخش در سمت سرور (Server-side) تعیین و ذخیره می‌شود و غیرقابل دستکاری در مرورگر است.</div>
          </div>
        </div>

      </div>
    </div>
  );
};
