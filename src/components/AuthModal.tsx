import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/sound';
import { X, Shield, User, Lock, Mail, Sparkles, CheckCircle2 } from 'lucide-react';

export const AuthModal: React.FC = () => {
  const { showAuthModal, setShowAuthModal, login, register } = useAuth();
  const [isRegister, setIsRegister] = useState(false);
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!showAuthModal) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);
    sound.playClick();

    try {
      if (isRegister) {
        await register(username, email, password);
      } else {
        await login(username || email, password);
      }
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'خطا در احراز هویت');
      sound.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickLogin = async (loginId: string, pass: string) => {
    setError(null);
    setIsSubmitting(true);
    sound.playClick();
    try {
      await login(loginId, pass);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'خطا در ورود سریع');
      sound.playError();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#12141c] border border-purple-500/30 rounded-2xl p-6 md:p-8 shadow-2xl glow-purple text-slate-100 overflow-hidden">
        {/* Subtle decorative glowing corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-cyan-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={() => {
            sound.playClick();
            setShowAuthModal(false);
          }}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
          aria-label="بستن"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-purple-500/10 border border-purple-500/30 text-purple-400 mb-3">
            <Sparkles className="w-6 h-6 animate-pulse" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            {isRegister ? 'ثبت‌نام در کوین‌زون' : 'ورود به حساب کاربری'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {isRegister
              ? 'با عضویت در کوین‌زون ۵۰ سکه هدیه اولیه دریافت کنید.'
              : 'برای ثبت رکوردها، دریافت جوایز و سفارش کلید TF2 وارد شوید.'}
          </p>
        </div>

        {/* Quick Demo Fill Buttons */}
        <div className="mb-6 p-3 bg-purple-950/30 border border-purple-500/20 rounded-xl space-y-2">
          <div className="text-[11px] text-purple-300 font-bold text-center">ورود آسان با اکانت‌های ساده پیش‌فرض:</div>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleQuickLogin('user', '123')}
              className="py-2 px-2 bg-white/[0.04] hover:bg-white/[0.08] border border-white/10 rounded-lg text-xs text-cyan-300 font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <User className="w-3.5 h-3.5" />
                <span>کاربر عادی</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">user / 123</span>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin', '123')}
              className="py-2 px-2 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 rounded-lg text-xs text-purple-300 font-bold flex flex-col items-center justify-center gap-0.5 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Shield className="w-3.5 h-3.5" />
                <span>مدیر سیستم</span>
              </div>
              <span className="text-[10px] text-slate-400 font-mono">admin / 123</span>
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {isRegister ? 'نام کاربری' : 'نام کاربری یا ایمیل (مثلاً admin یا user)'}
            </label>
            <div className="relative">
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isRegister ? 'مثال: user1' : 'admin یا user'}
                className="w-full bg-[#181a24] border border-white/10 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all font-mono"
              />
              <User className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          {isRegister && (
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1.5">آدرس ایمیل معتبر</label>
              <div className="relative">
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full bg-[#181a24] border border-white/10 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all"
                />
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1.5">
              {isRegister ? 'کلمه عبور' : 'کلمه عبور (مثلاً 123)'}
            </label>
            <div className="relative">
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="123"
                className="w-full bg-[#181a24] border border-white/10 focus:border-purple-500 focus:outline-none rounded-xl px-4 py-2.5 text-sm text-white placeholder-slate-500 transition-all font-mono"
              />
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-sm rounded-xl shadow-lg shadow-purple-600/30 transition-all disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2 mt-2"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>{isRegister ? 'تکمیل ثبت‌نام و دریافت ۵۰ سکه' : 'ورود به کوین‌زون'}</span>
              </>
            )}
          </button>
        </form>

        {/* Switch Register/Login */}
        <div className="mt-6 text-center text-xs text-slate-400">
          {isRegister ? 'قبلاً ثبت‌نام کرده‌اید؟' : 'هنوز حساب کاربری ندارید؟'}{' '}
          <button
            type="button"
            onClick={() => {
              sound.playClick();
              setIsRegister(!isRegister);
              setError(null);
            }}
            className="text-purple-400 hover:text-purple-300 font-bold underline cursor-pointer mr-1"
          >
            {isRegister ? 'ورود به حساب' : 'ایجاد حساب کاربری جدید'}
          </button>
        </div>
      </div>
    </div>
  );
};
