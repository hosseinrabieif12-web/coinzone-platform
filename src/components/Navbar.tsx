import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/sound';
import {
  Coins,
  Volume2,
  VolumeX,
  User,
  Shield,
  LogOut,
  Gift,
  Menu,
  X,
  Sparkles,
} from 'lucide-react';

interface NavbarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({ activeTab, setActiveTab }) => {
  const { user, wallet, isMuted, toggleMute, logout, setShowAuthModal, setShowDailyModal } = useAuth();
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const navItems = [
    { id: 'home', label: 'داشبورد' },
    { id: 'games', label: 'بازی‌ها' },
    { id: 'wheel', label: 'گردونه شانس' },
    { id: 'missions', label: 'مأموریت‌ها' },
    { id: 'shop', label: 'فروشگاه TF2' },
    { id: 'leaderboard', label: 'رتبه‌بندی' },
    { id: 'profile', label: 'پروفایل' },
  ];

  if (user?.role === 'admin') {
    navItems.push({ id: 'admin', label: 'پنل مدیریت' });
  }

  const handleNavClick = (tabId: string) => {
    sound.playClick();
    setActiveTab(tabId);
    setMobileMenuOpen(false);
  };

  return (
    <header className="sticky top-0 z-40 w-full bg-[#0d0f15]/90 backdrop-blur-md border-b border-white/10">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-8">
        
        {/* Zone 1: Single text element wordmark */}
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => handleNavClick('home')}
            className="flex items-center gap-2.5 text-left cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-purple-600 to-cyan-500 p-0.5 shadow-md shadow-purple-600/30 group-hover:scale-105 transition-transform">
              <div className="w-full h-full bg-[#0a0b0e] rounded-[10px] flex items-center justify-center">
                <Coins className="w-5 h-5 text-purple-400 group-hover:rotate-12 transition-transform" />
              </div>
            </div>
            <span className="text-xl font-black tracking-tight text-white font-gaming whitespace-nowrap">
              COIN<span className="text-purple-400">ZONE</span>
            </span>
          </button>
        </div>

        {/* Zone 2: Clean single-line text navigation links */}
        <nav className="hidden lg:flex items-center gap-6 text-sm font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => handleNavClick(item.id)}
                className={`whitespace-nowrap shrink-0 transition-colors py-1 relative cursor-pointer ${
                  isActive
                    ? 'text-purple-400 font-bold'
                    : 'text-slate-300 hover:text-white'
                }`}
              >
                {item.label}
                {isActive && (
                  <span className="absolute bottom-0 right-0 left-0 h-0.5 bg-gradient-to-r from-purple-500 to-cyan-400 rounded-full" />
                )}
              </button>
            );
          })}
        </nav>

        {/* Zone 3: Primary Action & User Zone */}
        <div className="flex items-center gap-3 shrink-0">
          {/* Sound Toggle */}
          <button
            onClick={toggleMute}
            aria-label={isMuted ? 'روشن کردن صدا' : 'قطع صدا'}
            className="p-2 text-slate-400 hover:text-white bg-white/[0.04] hover:bg-white/[0.08] border border-white/5 rounded-xl transition-colors cursor-pointer"
            title={isMuted ? 'صدا قطع است' : 'صدا فعال است'}
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-cyan-400" />}
          </button>

          {user ? (
            <>
              {/* Daily Login Button */}
              <button
                onClick={() => {
                  sound.playClick();
                  setShowDailyModal(true);
                }}
                className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold rounded-xl transition-all cursor-pointer whitespace-nowrap shrink-0"
              >
                <Gift className="w-4 h-4 text-amber-400 animate-bounce" />
                <span>پاداش روزانه</span>
              </button>

              {/* Live Coin Balance Pill */}
              <button
                onClick={() => handleNavClick('profile')}
                className="flex items-center gap-2 px-3.5 py-1.5 bg-gradient-to-r from-purple-950/60 to-indigo-950/60 border border-purple-500/40 rounded-xl hover:border-purple-400 transition-all cursor-pointer group shadow-inner"
              >
                <div className="w-5 h-5 rounded-full bg-amber-400/20 text-amber-400 flex items-center justify-center font-bold text-xs group-hover:scale-110 transition-transform">
                  🪙
                </div>
                <div className="flex items-baseline gap-1">
                  <span className="text-sm font-black text-amber-300 tabular-nums">
                    {wallet ? wallet.balance.toLocaleString('fa-IR') : '۰'}
                  </span>
                  <span className="text-[10px] text-slate-400 font-medium">سکه</span>
                </div>
              </button>

              {/* User Avatar & Menu */}
              <div className="relative">
                <button
                  onClick={() => {
                    sound.playClick();
                    setShowUserMenu(!showUserMenu);
                  }}
                  className="flex items-center gap-2 p-1 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-xl cursor-pointer transition-colors"
                >
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-purple-500 to-cyan-500 flex items-center justify-center text-xs font-bold text-white shadow">
                    {user.username.slice(0, 1)}
                  </div>
                  <div className="hidden md:flex flex-col text-right">
                    <span className="text-xs font-bold text-white truncate max-w-[90px]">{user.username}</span>
                    <span className="text-[10px] text-purple-300 flex items-center gap-1">
                      <span>سطح {user.level}</span>
                      {user.role === 'admin' && <Shield className="w-2.5 h-2.5 text-amber-400" />}
                    </span>
                  </div>
                </button>

                {/* Dropdown Menu */}
                {showUserMenu && (
                  <div className="absolute left-0 mt-2 w-48 bg-[#141620] border border-white/15 rounded-xl shadow-2xl py-2 z-50 text-right animate-fadeIn">
                    <div className="px-4 py-2 border-b border-white/10 mb-1">
                      <div className="text-xs font-bold text-white truncate">{user.username}</div>
                      <div className="text-[11px] text-slate-400 truncate">{user.email}</div>
                    </div>

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        handleNavClick('profile');
                      }}
                      className="w-full text-right px-4 py-2 text-xs text-slate-200 hover:bg-purple-600/20 hover:text-white flex items-center gap-2 cursor-pointer"
                    >
                      <User className="w-3.5 h-3.5 text-purple-400" />
                      <span>پروفایل و تراکنش‌ها</span>
                    </button>

                    {user.role === 'admin' && (
                      <button
                        onClick={() => {
                          setShowUserMenu(false);
                          handleNavClick('admin');
                        }}
                        className="w-full text-right px-4 py-2 text-xs text-amber-300 hover:bg-amber-600/20 flex items-center gap-2 cursor-pointer font-bold"
                      >
                        <Shield className="w-3.5 h-3.5 text-amber-400" />
                        <span>ورود به پنل مدیریت</span>
                      </button>
                    )}

                    <button
                      onClick={() => {
                        setShowUserMenu(false);
                        logout();
                      }}
                      className="w-full text-right px-4 py-2 text-xs text-rose-400 hover:bg-rose-600/20 flex items-center gap-2 cursor-pointer border-t border-white/5 mt-1"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>خروج از حساب</span>
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <button
              onClick={() => {
                sound.playClick();
                setShowAuthModal(true);
              }}
              className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-600/30 transition-all cursor-pointer whitespace-nowrap shrink-0 flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>ورود / عضویت</span>
            </button>
          )}

          {/* Mobile Menu Hamburger */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 text-slate-300 hover:text-white rounded-lg cursor-pointer"
            aria-label="منوی سایت"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="lg:hidden bg-[#0d0f15] border-b border-white/10 px-4 pt-2 pb-4 space-y-1">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavClick(item.id)}
              className={`w-full text-right py-2.5 px-3 rounded-lg text-sm font-medium transition-colors cursor-pointer ${
                activeTab === item.id ? 'bg-purple-600/20 text-purple-300 font-bold' : 'text-slate-300 hover:bg-white/5'
              }`}
            >
              {item.label}
            </button>
          ))}
          {user && (
            <button
              onClick={() => {
                sound.playClick();
                setShowDailyModal(true);
                setMobileMenuOpen(false);
              }}
              className="w-full text-right py-2.5 px-3 rounded-lg text-sm font-bold text-amber-300 bg-amber-500/10 flex items-center justify-between"
            >
              <span>دریافت پاداش روزانه</span>
              <Gift className="w-4 h-4 text-amber-400" />
            </button>
          )}
        </div>
      )}
    </header>
  );
};
