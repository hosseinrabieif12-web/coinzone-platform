import React, { useState } from 'react';
import { TapCoinGame } from '../games/TapCoinGame';
import { LuckyWheelGame } from '../games/LuckyWheelGame';
import { MemoryGame } from '../games/MemoryGame';
import { NumberGuessGame } from '../games/NumberGuessGame';
import { ReactionTestGame } from '../games/ReactionTestGame';
import { sound } from '../services/sound';
import { Coins, Gift, Brain, Target, Zap } from 'lucide-react';

export const GamesPage: React.FC<{ initialGame?: string }> = ({ initialGame = 'tap_coin' }) => {
  const [selectedGame, setSelectedGame] = useState<string>(initialGame);

  const gameTabs = [
    { id: 'tap_coin', label: 'تپ کوین', icon: Coins },
    { id: 'lucky_wheel', label: 'گردونه شانس', icon: Gift },
    { id: 'memory', label: 'کارت‌های حافظه', icon: Brain },
    { id: 'reaction_test', label: 'تست واکنش', icon: Zap },
    { id: 'number_guess', label: 'حدس عدد', icon: Target },
  ];

  const handleTabChange = (gameId: string) => {
    sound.playClick();
    setSelectedGame(gameId);
  };

  return (
    <div className="space-y-8 pb-12">
      {/* Game Selector Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#12141c] border border-white/10 rounded-2xl glass-panel overflow-x-auto">
        {gameTabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = selectedGame === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => handleTabChange(tab.id)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold whitespace-nowrap transition-all cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Render Active Game */}
      <div className="animate-fadeIn">
        {selectedGame === 'tap_coin' && <TapCoinGame />}
        {selectedGame === 'lucky_wheel' && <LuckyWheelGame />}
        {selectedGame === 'memory' && <MemoryGame />}
        {selectedGame === 'reaction_test' && <ReactionTestGame />}
        {selectedGame === 'number_guess' && <NumberGuessGame />}
      </div>
    </div>
  );
};
