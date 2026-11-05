import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Sparkles, Trophy, RotateCcw, Clock, Award } from 'lucide-react';

interface CardItem {
  id: number;
  symbol: string;
  name: string;
  isFlipped: boolean;
  isMatched: boolean;
}

const ICONS_POOL = [
  { symbol: '🗝️', name: 'کلید مان‌کو' },
  { symbol: '💣', name: 'بمب C4' },
  { symbol: '🗡️', name: 'نایف کارامبیت' },
  { symbol: '🎯', name: 'اسنایپر AWP' },
  { symbol: '🛡️', name: 'زره کولار' },
  { symbol: '📦', name: 'جعبه کرِیت' },
  { symbol: '💊', name: 'مدکیت امداد' },
  { symbol: '👑', name: 'تاج قهرمانی' },
  { symbol: '⚡', name: 'صاعقه سایبری' },
  { symbol: '💎', name: 'الماس ویژه' },
];

export const MemoryGame: React.FC = () => {
  const { user, updateWallet, updateUser, setShowAuthModal } = useAuth();
  const [difficulty, setDifficulty] = useState<'easy' | 'medium' | 'hard'>('easy');
  const [cards, setCards] = useState<CardItem[]>([]);
  const [flippedCards, setFlippedCards] = useState<number[]>([]);
  const [moves, setMoves] = useState<number>(0);
  const [timer, setTimer] = useState<number>(0);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [isGameOver, setIsGameOver] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [gameResult, setGameResult] = useState<{ coins: number; xp: number } | null>(null);

  // Setup game board based on difficulty
  const startNewGame = (diff = difficulty) => {
    sound.playClick();
    const pairCount = diff === 'easy' ? 6 : diff === 'medium' ? 8 : 10;
    const selectedIcons = ICONS_POOL.slice(0, pairCount);
    
    const deck: CardItem[] = [];
    selectedIcons.forEach((item, index) => {
      // 2 cards per item
      deck.push({
        id: index * 2,
        symbol: item.symbol,
        name: item.name,
        isFlipped: false,
        isMatched: false,
      });
      deck.push({
        id: index * 2 + 1,
        symbol: item.symbol,
        name: item.name,
        isFlipped: false,
        isMatched: false,
      });
    });

    // Shuffle
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }

    setCards(deck);
    setFlippedCards([]);
    setMoves(0);
    setTimer(0);
    setIsPlaying(true);
    setIsGameOver(false);
    setGameResult(null);
  };

  useEffect(() => {
    startNewGame();
  }, [difficulty]);

  // Timer Tick
  useEffect(() => {
    let interval: NodeJS.Timeout | null = null;
    if (isPlaying && !isGameOver) {
      interval = setInterval(() => {
        setTimer((t) => t + 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [isPlaying, isGameOver]);

  const handleCardClick = (index: number) => {
    if (!isPlaying || isGameOver || flippedCards.length >= 2) return;
    if (cards[index].isFlipped || cards[index].isMatched) return;

    sound.playClick(800, 0.04);

    const newCards = [...cards];
    newCards[index].isFlipped = true;
    setCards(newCards);

    const newFlipped = [...flippedCards, index];
    setFlippedCards(newFlipped);

    if (newFlipped.length === 2) {
      setMoves((m) => m + 1);
      const [firstIdx, secondIdx] = newFlipped;
      const firstCard = newCards[firstIdx];
      const secondCard = newCards[secondIdx];

      if (firstCard.symbol === secondCard.symbol) {
        // Matched!
        sound.playCoin();
        setTimeout(() => {
          newCards[firstIdx].isMatched = true;
          newCards[secondIdx].isMatched = true;
          setCards([...newCards]);
          setFlippedCards([]);

          // Check if all matched
          const allMatched = newCards.every((c) => c.isMatched);
          if (allMatched) {
            handleVictory();
          }
        }, 300);
      } else {
        // Not matched - flip back
        setTimeout(() => {
          newCards[firstIdx].isFlipped = false;
          newCards[secondIdx].isFlipped = false;
          setCards([...newCards]);
          setFlippedCards([]);
        }, 900);
      }
    }
  };

  const handleVictory = async () => {
    setIsGameOver(true);
    setIsPlaying(false);
    sound.playWin();

    if (!user) {
      setShowAuthModal(true);
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.completeMemoryGame(difficulty, moves + 1, Math.max(5, timer));
      setGameResult({ coins: res.rewardCoins, xp: res.rewardXp });
      updateWallet(res.wallet);
      updateUser(res.user);
    } catch {
      // ignore
    } finally {
      setIsSubmitting(false);
    }
  };

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = secs % 60;
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-purple-400 mb-1">
            <Sparkles className="w-4 h-4" />
            <span>بازی شماره ۳: چالش حافظه و تمرکز</span>
          </div>
          <h2 className="text-2xl font-black text-white">کارت‌های حافظه گیمینگ (Memory Match)</h2>
          <p className="text-xs text-slate-400 mt-1">
            کارت‌های هم‌شکل را پیدا کنید، رکورد زمانی بهتر بزنید و سکه طلایی و XP دریافت کنید!
          </p>
        </div>

        {/* Difficulty Selector */}
        <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => {
              setDifficulty('easy');
              startNewGame('easy');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              difficulty === 'easy' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            آسان (۱۲ کارت)
          </button>
          <button
            onClick={() => {
              setDifficulty('medium');
              startNewGame('medium');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              difficulty === 'medium' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            متوسط (۱۶ کارت)
          </button>
          <button
            onClick={() => {
              setDifficulty('hard');
              startNewGame('hard');
            }}
            className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              difficulty === 'hard' ? 'bg-purple-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            سخت (۲۰ کارت)
          </button>
        </div>
      </div>

      {/* Stats Bar */}
      <div className="flex items-center justify-between px-6 py-3 bg-[#12141c] border border-white/10 rounded-xl glass-panel">
        <div className="flex items-center gap-6 text-xs text-slate-300">
          <div className="flex items-center gap-1.5 font-bold">
            <Clock className="w-4 h-4 text-cyan-400" />
            <span>زمان سپری‌شده: <span className="text-white font-mono">{formatTime(timer)}</span></span>
          </div>
          <div className="flex items-center gap-1.5 font-bold">
            <Award className="w-4 h-4 text-purple-400" />
            <span>حرکات: <span className="text-white font-mono">{moves}</span></span>
          </div>
        </div>

        <button
          onClick={() => startNewGame()}
          className="flex items-center gap-1 text-xs text-slate-300 hover:text-white px-3 py-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg transition-colors cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>شروع مجدد</span>
        </button>
      </div>

      {/* Victory Alert */}
      {isGameOver && (
        <div className="p-6 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/50 rounded-2xl text-center glow-purple animate-fadeIn">
          <div className="inline-flex p-3 rounded-full bg-amber-400/20 text-amber-300 mb-2">
            <Trophy className="w-8 h-8 animate-bounce" />
          </div>
          <h3 className="text-xl font-black text-white">پیروزی! تمام کارت‌ها تطبیق داده شدند</h3>
          <p className="text-xs text-slate-300 mt-1">
            در مدت {formatTime(timer)} و با {moves} حرکت بازی را به پایان رساندید.
          </p>

          {gameResult && (
            <div className="mt-4 inline-flex items-center gap-4 px-4 py-2 bg-black/40 border border-amber-500/40 rounded-xl">
              <span className="text-amber-300 font-bold text-sm">+{gameResult.coins} سکه طلایی</span>
              <span className="text-purple-300 font-bold text-sm">+{gameResult.xp} امتیاز XP</span>
            </div>
          )}

          <div className="mt-5">
            <button
              onClick={() => startNewGame()}
              className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              بازی دوباره با چالش جدید
            </button>
          </div>
        </div>
      )}

      {/* Cards Grid */}
      <div
        className={`grid gap-3.5 ${
          difficulty === 'easy'
            ? 'grid-cols-3 sm:grid-cols-4'
            : difficulty === 'medium'
            ? 'grid-cols-4'
            : 'grid-cols-4 sm:grid-cols-5'
        }`}
      >
        {cards.map((card, index) => {
          const isRevealed = card.isFlipped || card.isMatched;
          return (
            <div
              key={card.id}
              onClick={() => handleCardClick(index)}
              className={`h-24 sm:h-28 rounded-2xl flex flex-col items-center justify-center p-2 text-center cursor-pointer select-none transition-all duration-300 transform perspective-1000 ${
                card.isMatched
                  ? 'bg-emerald-950/30 border-2 border-emerald-500/40 text-emerald-300 shadow-lg shadow-emerald-500/10'
                  : isRevealed
                  ? 'bg-gradient-to-tr from-purple-900/60 to-indigo-900/60 border-2 border-purple-400 text-white scale-105 shadow-xl glow-purple'
                  : 'bg-[#181a24] hover:bg-[#202332] border border-white/10 hover:border-purple-500/40 text-slate-500 hover:scale-102'
              }`}
            >
              {isRevealed ? (
                <div className="flex flex-col items-center gap-1 animate-fadeIn">
                  <span className="text-3xl sm:text-4xl">{card.symbol}</span>
                  <span className="text-[10px] font-bold text-slate-200 truncate max-w-[80px]">
                    {card.name}
                  </span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center">
                  <div className="w-8 h-8 rounded-full bg-white/[0.04] border border-white/5 flex items-center justify-center text-xs font-bold text-purple-400">
                    ?
                  </div>
                  <span className="text-[9px] text-slate-500 mt-1 font-mono">COINZONE</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
