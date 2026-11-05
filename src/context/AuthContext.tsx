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
  login: (loginOrEmail: string, pass: string) => Promise<void>;
  register: (username: string, email: string, pass: string) => Promise<void>;
  logout: () => void;
  refreshUserData: () => Promise<void>;
  updateWallet: (wallet: Wallet) => void;
  updateUser: (user: User) => void;
  showAuthModal: boolean;
  setShowAuthModal: (show: boolean) => void;
  showDailyModal: boolean;
  setShowDailyModal: (show: boolean) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isMuted, setIsMuted] = useState(sound.getMuted());
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showDailyModal, setShowDailyModal] = useState(false);

  const toggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  const refreshUserData = useCallback(async () => {
    try {
      if (api.getToken()) {
        const res = await api.getMe();
        setUser(res.user);
        setWallet(res.wallet);
      }
    } catch {
      // Token might be invalid or expired
      api.logout();
      setUser(null);
      setWallet(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUserData();
  }, [refreshUserData]);

  const login = async (loginOrEmail: string, pass: string) => {
    const res = await api.login(loginOrEmail, pass);
    setUser(res.user);
    setWallet(res.wallet);
    sound.playWin();
    setShowAuthModal(false);
  };

  const register = async (username: string, email: string, pass: string) => {
    const res = await api.register(username, email, pass);
    setUser(res.user);
    setWallet(res.wallet);
    sound.playWin();
    setShowAuthModal(false);
  };

  const logout = () => {
    api.logout();
    setUser(null);
    setWallet(null);
    sound.playClick();
  };

  const updateWallet = (newWallet: Wallet) => {
    setWallet(newWallet);
  };

  const updateUser = (newUser: User) => {
    setUser(newUser);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        wallet,
        isLoading,
        isMuted,
        toggleMute,
        login,
        register,
        logout,
        refreshUserData,
        updateWallet,
        updateUser,
        showAuthModal,
        setShowAuthModal,
        showDailyModal,
        setShowDailyModal,
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
