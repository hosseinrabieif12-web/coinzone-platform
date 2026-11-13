import React from 'react';
import { AlertTriangle, RefreshCw, Trash2 } from 'lucide-react';

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<
  { children: React.ReactNode },
  ErrorBoundaryState
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false, errorMessage: '' };
  }

  static getDerivedStateFromError(error: unknown): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error instanceof Error ? error.message : String(error || 'خطای ناشناخته'),
    };
  }

  componentDidCatch(error: unknown) {
    console.error('CRYPTO SCOPE AI UI Error:', error);
  }

  handleReload = () => {
    window.location.reload();
  };

  handleResetAndReload = () => {
    try {
      localStorage.removeItem('crypto_scope_ai_history_v1');
    } catch {
      // Ignore storage error
    }
    window.location.reload();
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          dir="rtl"
          className="min-h-screen bg-[#060913] text-slate-100 flex items-center justify-center p-6"
        >
          <div className="max-w-md w-full bg-[#0B1120] border border-rose-500/40 rounded-2xl p-6 space-y-4 text-center">
            <div className="w-12 h-12 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <h1 className="text-lg font-bold text-slate-100">
              خطای غیرمنتظره در نمایش رابط کاربری
            </h1>
            <p className="text-xs text-slate-400 leading-relaxed">
              برنامه با یک خطای اجرایی مواجه شد. می‌توانید صفحه را بارگذاری مجدد کنید یا حافظه موقت مرورگر را بازنشانی نمایید.
            </p>
            {this.state.errorMessage && (
              <div
                dir="ltr"
                className="p-2.5 rounded-lg bg-[#060913] border border-slate-800 text-[11px] font-mono text-rose-300 break-words text-left"
              >
                {this.state.errorMessage}
              </div>
            )}
            <div className="flex flex-wrap items-center justify-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-semibold cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>بارگذاری مجدد</span>
              </button>
              <button
                type="button"
                onClick={this.handleResetAndReload}
                className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>بازنشانی حافظه و رفرش</span>
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}
