import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { sound } from '../services/sound';
import { X, Shield, KeyRound, Check, AlertCircle, Bot, Sparkles, ExternalLink } from 'lucide-react';

export const AdminUnlockModal: React.FC = () => {
  const { showAdminPinModal, setShowAdminPinModal, showAuthModal, setShowAuthModal, unlockAdmin } = useAuth();
  const [keyInput, setKeyInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);

  const isOpen = showAdminPinModal || showAuthModal;
  if (!isOpen) return null;

  const handleClose = () => {
    sound.playClick();
    setShowAdminPinModal(false);
    setShowAuthModal(false);
    setError(null);
    setSuccess(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!keyInput.trim()) {
      setError('لطفاً کلید یا پین‌کد مدیریت را وارد کنید.');
      return;
    }
    setError(null);
    setIsSubmitting(true);

    try {
      await unlockAdmin(keyInput.trim());
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'کلید وارد شده اشتباه است.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickPreset = async (val: string) => {
    setKeyInput(val);
    setError(null);
    setIsSubmitting(true);
    try {
      await unlockAdmin(val);
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1000);
    } catch (err: unknown) {
      const e = err as Error;
      setError(e.message || 'کلید وارد شده اشتباه است.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
      <div className="relative w-full max-w-md bg-[#12141c] border border-amber-500/30 rounded-2xl p-6 md:p-8 shadow-2xl glow-purple text-slate-100 overflow-hidden">
        {/* Decorative corner glows */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 bg-purple-600/10 rounded-full blur-2xl pointer-events-none" />

        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-xl hover:bg-white/5 transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="text-center space-y-2 mb-6">
          <div className="w-14 h-14 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
            <Shield className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-black text-white">فعال‌سازی دسترسی مدیریت</h3>
          <p className="text-xs text-slate-400 max-w-xs mx-auto">
            عضویت و ورود عمومی حذف گردیده است. برای دسترسی به پنل مدیریت، کلید یا پین‌کد را وارد کنید:
          </p>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-300 mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <KeyRound className="w-3.5 h-3.5 text-amber-400" />
                <span>کلید دسترسی ادمین (Admin Key)</span>
              </span>
              <span className="text-[11px] text-amber-400/80 font-mono">پیش‌فرض: 123</span>
            </label>
            <input
              type="password"
              placeholder="کلید یا رمز ادمین را وارد کنید..."
              value={keyInput}
              onChange={(e) => setKeyInput(e.target.value)}
              autoFocus
              className="w-full bg-[#181a24] border border-white/10 focus:border-amber-400 rounded-xl px-4 py-3 text-sm text-white font-mono placeholder-slate-600 focus:outline-none text-center tracking-widest"
            />
          </div>

          {/* Quick preset button */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleQuickPreset('123')}
              className="text-xs px-3.5 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 font-bold transition-all cursor-pointer flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>ورود سریع با کلید پیش‌فرض (۱۲۳)</span>
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Success Message */}
          {success && (
            <div className="p-3 bg-emerald-950/40 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-400 shrink-0 stroke-[3]" />
              <span>دسترسی مدیریت با موفقیت فعال گردید!</span>
            </div>
          )}

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || success}
            className="w-full py-3 bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-400 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {isSubmitting ? (
              <span className="w-5 h-5 border-2 border-black/40 border-t-black rounded-full animate-spin" />
            ) : (
              <>
                <Shield className="w-4 h-4" />
                <span>تأیید و ورود به پنل مدیریت</span>
              </>
            )}
          </button>
        </form>

        {/* Alternative Ways Note */}
        <div className="mt-5 pt-4 border-t border-white/5 space-y-2 text-[11px] text-slate-400 leading-relaxed">
          <div className="font-bold text-slate-300 flex items-center gap-1.5">
            <Bot className="w-3.5 h-3.5 text-cyan-400" />
            <span>راه‌های خودکار دیگر برای دسترسی ادمین:</span>
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-400 pr-1">
            <li>
              <strong>اتصال خودکار تلگرام:</strong> اگر با حساب تلگرامی که آیدی آن در تنظیمات بات ثبت شده وارد شوید، نیازی به وارد کردن کلید نیست و سیستم خودکار شما را ادمین می‌شناسد.
            </li>
            <li>
              <strong>لینک مستقیم مرورگر:</strong> با اضافه کردن <code className="text-amber-300 font-mono">?admin=1</code> به انتهای آدرس سایت، حالت مدیریت بدون رمز فعال می‌شود.
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
};

// Compatibility export
export const AuthModal = AdminUnlockModal;
