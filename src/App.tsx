import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Navbar } from './components/Navbar';
import { AuthModal } from './components/AuthModal';
import { DailyRewardModal } from './components/DailyRewardModal';
import { HomePage } from './pages/HomePage';
import { GamesPage } from './pages/GamesPage';
import { LuckyWheelGame } from './games/LuckyWheelGame';
import { MissionsPage } from './pages/MissionsPage';
import { ShopPage } from './pages/ShopPage';
import { LeaderboardPage } from './pages/LeaderboardPage';
import { ProfilePage } from './pages/ProfilePage';
import { AdminPage } from './pages/AdminPage';
import { Coins, Shield, Sparkles } from 'lucide-react';

function AppContent() {
  const [activeTab, setActiveTab] = useState<string>('home');
  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-slate-100 flex flex-col bg-tactical-grid selection:bg-purple-600 selection:text-white">
      {/* Top Bar */}
      <Navbar activeTab={activeTab} setActiveTab={setActiveTab} />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 pt-6 sm:pt-8">
        {activeTab === 'home' && <HomePage setActiveTab={setActiveTab} />}
        {activeTab === 'games' && <GamesPage initialGame="tap_coin" />}
        {activeTab === 'wheel' && (
          <div className="py-2">
            <LuckyWheelGame />
          </div>
        )}
        {activeTab === 'missions' && <MissionsPage />}
        {activeTab === 'shop' && <ShopPage />}
        {activeTab === 'leaderboard' && <LeaderboardPage />}
        {activeTab === 'profile' && <ProfilePage />}
        {activeTab === 'admin' && <AdminPage />}
      </main>

      {/* Footer */}
      <footer className="mt-auto border-t border-white/10 bg-[#0d0f15]/80 backdrop-blur-md py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-slate-400">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
              <Coins className="w-3.5 h-3.5" />
            </div>
            <span className="font-bold text-white font-gaming">COINZONE</span>
            <span>· پلتفرم جوایز گیمینگ و کلید TF2</span>
          </div>

          <div className="text-center sm:text-right text-[11px] text-slate-500">
            تمامی علائم تجاری Team Fortress 2 و Steam متعلق به شرکت Valve Corporation است. کوین‌زون پلتفرم مستقل است.
          </div>

          <div className="flex items-center gap-4 text-slate-400">
            <button
              onClick={() => setActiveTab('shop')}
              className="hover:text-purple-400 transition-colors cursor-pointer"
            >
              فروشگاه
            </button>
            <button
              onClick={() => setActiveTab('leaderboard')}
              className="hover:text-purple-400 transition-colors cursor-pointer"
            >
              لیدربورد
            </button>
            {user?.role === 'admin' && (
              <button
                onClick={() => setActiveTab('admin')}
                className="text-amber-400 hover:text-amber-300 font-bold transition-colors cursor-pointer"
              >
                پنل مدیریت
              </button>
            )}
          </div>
        </div>
      </footer>

      {/* Modals */}
      <AuthModal />
      <DailyRewardModal />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
