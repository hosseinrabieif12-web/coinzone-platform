import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { User, Wallet } from '../types';
import { api } from '../services/api';
import { sound } from '../services/sound';

interface AuthContextType {
  user: User | null;
  wallet: Wallet | null;
  isLoading: boolean;
  isMuted: boolean;
  toggleMute: () => void;
  // Seamless Gamer Session & Admin Unlock
  unlockAdmin: (key: string) => Promise<boolean>;
  lockAdmin: () => Promise<void>;
  showAdminPinModal: boolean;
  setShowAdminPinModal: (show: boolean) => void;
  // Modals & User Management
  showDailyModal: boolean;
  setShowDailyModal: (show: boolean) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  refreshUserData: () => Promise<void>;
  updateWallet: (wallet: Wallet) => void;
  updateUser: (user: User) => void;
  // Compatibility methods
  login: (loginOrEmail: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [showAdminPinModal, setShowAdminPinModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);

  const toggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  // Generate or read persistent device ID
  const getDeviceId = () => {
    if (typeof window === 'undefined') return 'server_dev';
    let id = localStorage.getItem('coinzone_device_id');
    if (!id) {
      id = 'dev_' + Math.random().toString(36).substring(2, 10) + Date.now().toString(36);
      localStorage.setItem('coinzone_device_id', id);
    }
    return id;
  };

  // Check URL query parameters for instant Admin key (e.g. ?admin=1 or ?admin=123)
  const getAdminKeyFromUrl = () => {
    if (typeof window === 'undefined') return undefined;
    const params = new URLSearchParams(window.location.search);
    const adminParam = params.get('admin') || params.get('admin_key') || params.get('key');
    if (adminParam === '1' || adminParam === '123' || adminParam === 'admin' || adminParam === 'true') {
      return '123';
    }
    return adminParam || undefined;
  };

  // Telegram WebApp detection
  const getTelegramUser = () => {
    if (typeof window === 'undefined') return undefined;
    const tg = (window as any).Telegram?.WebApp;
    if (tg?.initDataUnsafe?.user) {
      return tg.initDataUnsafe.user;
    }
    return undefined;
  };

  // Initialize or restore player session seamlessly
  const initPlayerSession = useCallback(async () => {
    setIsLoading(true);
    try {
      const deviceId = getDeviceId();
      const adminKey = getAdminKeyFromUrl();
      const telegramUser = getTelegramUser();

      // Check if we already have a token
      const existingToken = api.getToken();
      if (existingToken && !adminKey) {
        try {
          const res = await api.getMe();
          setUser(res.user);
          setWallet(res.wallet);
          setIsLoading(false);
          return;
        } catch {
          // Token expired, re-create session below
        }
      }

      // Initialize persistent session with server
      const sessionRes = await api.initSession({
        deviceId,
        telegramUser,
        adminKey,
      });

      setUser(sessionRes.user);
      setWallet(sessionRes.wallet);
    } catch (err) {
      console.error('Session initialization error:', err);
      // Fallback local gamer
      setUser({
        id: 'usr_gamer_1',
        username: 'Gamer_Pro',
        email: 'gamer@coinzone.gg',
        role: 'user',
        avatar: 'avatar_1',
        level: 4,
        xp: 1450,
        isBanned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
      setWallet({
        id: 'wal_usr_gamer_1',
        userId: 'usr_gamer_1',
        balance: 480,
        earnedTotal: 720,
        spentTotal: 240,
        reservedBalance: 0,
        updatedAt: new Date().toISOString(),
      });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    initPlayerSession();
  }, [initPlayerSession]);

  const refreshUserData = async () => {
    try {
      const res = await api.getMe();
      setUser(res.user);
      setWallet(res.wallet);
    } catch {
      // ignore
    }
  };

  // Unlock Admin mode with secret Key or PIN (default: 123)
  const unlockAdmin = async (key: string): Promise<boolean> => {
    sound.playClick();
    try {
      const res = await api.adminUnlock(key);
      if (res.user) {
        setUser(res.user);
      }
      if (res.wallet) {
        setWallet(res.wallet);
      }
      sound.playWin();
      setShowAdminPinModal(false);
      return true;
    } catch (err: unknown) {
      sound.playError();
      const e = err as Error;
      throw new Error(e.message || 'کلید ادمین اشتباه است.');
    }
  };

  // Lock Admin mode (revert to Gamer role)
  const lockAdmin = async () => {
    sound.playClick();
    try {
      const res = await api.adminLock();
      if (res.user) {
        setUser(res.user);
      }
    } catch {
      if (user) {
        setUser({ ...user, role: 'user' });
      }
    }
  };

  const updateWallet = (newWallet: Wallet) => {
    setWallet(newWallet);
  };

  const updateUser = (newUser: User) => {
    setUser(newUser);
  };

  // Compatibility methods
  const login = async () => {
    await refreshUserData();
  };
  const register = async () => {
    await refreshUserData();
  };
  const logout = () => {
    // Reset role to normal gamer
    if (user && user.role === 'admin') {
      lockAdmin();
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isLoading,
        isMuted,
        toggleMute,
        unlockAdmin,
        lockAdmin,
        showAdminPinModal,
        setShowAdminPinModal,
        showDailyModal,
        setShowDailyModal,
        showAuthModal,
        setShowAuthModal,
        refreshUserData,
        updateWallet,
        updateUser,
        login,
        register,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within an AuthProvider');
  return ctx;
};
