import React, { useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Cloud,
  Copy,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  FolderGit2,
  GitBranch,
  KeyRound,
  Loader2,
  LogOut,
  UploadCloud,
  AlertTriangle,
} from 'lucide-react';
import { readApiJson } from '../utils/formatters.ts';

interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
}

interface GitHubStatusResponse {
  oauthConfigured: boolean;
  connected: boolean;
  callbackUrl: string;
  fileCount: number;
  filesPreview: string[];
  user?: {
    login: string;
    name?: string | null;
    avatar_url?: string;
    html_url?: string;
  };
  repos?: GitHubRepoSummary[];
}

interface UploadResult {
  repoFullName: string;
  htmlUrl: string;
  branch: string;
  commitSha: string;
  fileCount: number;
  cloudflareDeployUrl: string;
}

export const GitHubDeployView: React.FC = () => {
  const [status, setStatus] = useState<GitHubStatusResponse | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // GitHub Token login state (held only until sent to server)
  const [tokenInput, setTokenInput] = useState('');
  const [showToken, setShowToken] = useState(false);
  const [connectingToken, setConnectingToken] = useState(false);

  // Upload options
  const [repoMode, setRepoMode] = useState<'new' | 'existing'>('new');
  const [newRepoName, setNewRepoName] = useState('crypto-scope-ai');
  const [selectedExistingRepo, setSelectedExistingRepo] = useState('');
  const [branch, setBranch] = useState('main');
  const [isPrivate, setIsPrivate] = useState(false);
  const [commitMessage, setCommitMessage] = useState(
    'Deploy CRYPTO SCOPE AI (Cloudflare Pages Ready)'
  );

  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null);
  const [copiedText, setCopiedText] = useState<string | null>(null);
  const [showFiles, setShowFiles] = useState(false);

  const fetchStatus = useCallback(
    async (explicitSessionId?: string | null) => {
      setLoading(true);
      setError(null);
      const activeSid = explicitSessionId !== undefined ? explicitSessionId : sessionId;
      try {
        const res = await fetch('/api/github/status', {
          headers: activeSid ? { 'x-github-session': activeSid } : undefined,
        });
        const data = await readApiJson<GitHubStatusResponse>(
          res,
          'خطا در دریافت وضعیت اتصال گیت‌هاب'
        );
        setStatus(data);
        if (data.repos && data.repos.length > 0) {
          setSelectedExistingRepo((prev) => prev || data.repos![0].full_name);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'خطا در اتصال به سرور');
      } finally {
        setLoading(false);
      }
    },
    [sessionId]
  );

  useEffect(() => {
    void fetchStatus();
  }, [fetchStatus]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const origin = event.origin || '';
      if (
        !origin.endsWith('.run.app') &&
        !origin.includes('localhost') &&
        !origin.includes('127.0.0.1')
      ) {
        return;
      }
      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        const sid = typeof event.data.sessionId === 'string' ? event.data.sessionId : null;
        if (sid) setSessionId(sid);
        void fetchStatus(sid);
      } else if (event.data?.type === 'OAUTH_AUTH_ERROR') {
        setError(event.data?.error || 'احراز هویت گیت‌هاب ناموفق بود.');
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [fetchStatus]);

  const handleCopy = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(text);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      // Ignore clipboard failure
    }
  };

  const handleConnectWithToken = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tokenInput.trim() || connectingToken) return;
    setError(null);
    setConnectingToken(true);
    try {
      const res = await fetch('/api/github/connect-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: tokenInput.trim() }),
      });
      const data = await readApiJson<{
        ok: boolean;
        sessionId: string;
        user: { login: string };
      }>(res, 'توکن گیت‌هاب معتبر نیست');
      setTokenInput('');
      setSessionId(data.sessionId);
      await fetchStatus(data.sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در اتصال با توکن گیت‌هاب');
    } finally {
      setConnectingToken(false);
    }
  };

  const handleConnectOAuth = async () => {
    setError(null);
    try {
      const res = await fetch('/api/auth/github/url');
      const data = await readApiJson<{ configured: boolean; url?: string }>(
        res,
        'خطا در ایجاد لینک اتصال گیت‌هاب'
      );
      if (!data.configured || !data.url) {
        setError(
          'اتصال OAuth در این سرور تنظیم نشده است؛ از اتصال مستقیم با توکن گیت‌هاب استفاده کنید.'
        );
        return;
      }
      const popup = window.open(data.url, 'github_oauth_popup', 'width=640,height=720');
      if (!popup) {
        setError('پنجره بازشو (Popup) توسط مرورگر مسدود شد. لطفاً اجازه باز شدن Popup را بدهید.');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در اتصال به گیت‌هاب');
    }
  };

  const handleDisconnect = async () => {
    await fetch('/api/github/logout', {
      method: 'POST',
      headers: sessionId ? { 'x-github-session': sessionId } : undefined,
    });
    setSessionId(null);
    setUploadResult(null);
    await fetchStatus(null);
  };

  const handleAutoUpload = async () => {
    setError(null);
    setUploadResult(null);
    const repoTarget = repoMode === 'new' ? newRepoName : selectedExistingRepo;
    if (!repoTarget.trim()) {
      setError('لطفاً نام مخزن را مشخص کنید.');
      return;
    }

    setUploading(true);
    try {
      const res = await fetch('/api/github/upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(sessionId ? { 'x-github-session': sessionId } : {}),
        },
        body: JSON.stringify({
          repoMode,
          repoName: repoTarget.trim(),
          isPrivate,
          branch: branch.trim() || 'main',
          commitMessage: commitMessage.trim(),
        }),
      });
      const result = await readApiJson<UploadResult>(res, 'خطا در آپلود پروژه به گیت‌هاب');
      setUploadResult(result);
      await fetchStatus(sessionId);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'خطا در آپلود خودکار گیت‌هاب');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadZip = () => {
    window.location.href = '/api/github/download-bundle';
  };

  return (
    <div className="space-y-6">
      {/* Header Card */}
      <div className="bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-1.5">
          <h1 className="text-xl sm:text-2xl font-bold text-slate-100 flex items-center gap-2.5">
            <FolderGit2 className="w-6 h-6 text-blue-400 shrink-0" />
            <span>آپلود خودکار در گیت‌هاب و استقرار روی کلودفلر</span>
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 max-w-3xl leading-relaxed">
            با وارد کردن توکن گیت‌هاب (<span className="font-mono-num">Personal Access Token</span>)، کل پروژه همراه با فایل <span className="font-mono-num">wrangler.toml</span> و توابع کلودفلر (<span className="font-mono-num">functions/api/[[path]].ts</span>) به صورت خودکار در مخزن گیت‌هاب شما آپلود می‌شود.
          </p>
        </div>

        <button
          type="button"
          onClick={handleDownloadZip}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs sm:text-sm font-semibold transition-colors cursor-pointer whitespace-nowrap shrink-0"
        >
          <Download className="w-4 h-4 text-purple-400" />
          <span>دانلود بسته آماده کلودفلر (ZIP)</span>
        </button>
      </div>

      {error && (
        <div className="bg-rose-500/10 border border-rose-500/35 rounded-xl p-4 text-xs text-rose-300 flex items-start gap-2.5">
          <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Main GitHub Auto Upload Card */}
        <div className="lg:col-span-7 bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-5">
          <div className="flex items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
            <h2 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <UploadCloud className="w-5 h-5 text-blue-400" />
              <span>آپلود خودکار به مخزن GitHub</span>
            </h2>
            {status && (
              <span className="text-xs text-slate-400 tabular-nums">
                تعداد فایل‌های پروژه: {status.fileCount}
              </span>
            )}
          </div>

          {loading && !status ? (
            <div className="py-10 flex items-center justify-center gap-2 text-xs text-slate-400">
              <Loader2 className="w-5 h-5 animate-spin text-blue-400" />
              <span>در حال بررسی وضعیت اتصال گیت‌هاب...</span>
            </div>
          ) : status && !status.connected ? (
            <div className="space-y-5">
              {/* Primary Token Connection Form */}
              <form
                onSubmit={handleConnectWithToken}
                className="p-5 rounded-xl bg-[#070b17] border border-slate-800/90 space-y-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2 text-sm font-bold text-slate-100">
                    <KeyRound className="w-4 h-4 text-blue-400" />
                    <span>اتصال فوری با توکن گیت‌هاب (Token)</span>
                  </div>
                  <a
                    href="https://github.com/settings/tokens/new?scopes=repo&description=CRYPTO-SCOPE-AI"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-xs text-blue-400 hover:underline"
                  >
                    <span>ساخت توکن جدید با دسترسی repo</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>

                <p className="text-xs text-slate-400 leading-relaxed">
                  توکن شخصی گیت‌هاب (<span className="font-mono-num text-slate-300">ghp_...</span> یا <span className="font-mono-num text-slate-300">github_pat_...</span>) با دسترسی <span className="font-mono-num text-slate-300">repo</span> را وارد کنید. توکن صرفاً برای ارسال امن فایل‌ها در نشست سرور استفاده می‌شود و در مرورگر ذخیره نمی‌گردد.
                </p>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
                  <div className="relative flex-1">
                    <input
                      type={showToken ? 'text' : 'password'}
                      dir="ltr"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="ghp_xxxxxxxxxxxxxxxxxxxx"
                      autoComplete="off"
                      className="w-full pl-10 pr-3 py-2.5 rounded-xl bg-[#060913] border border-slate-700 text-xs sm:text-sm text-slate-100 font-mono-num text-left focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowToken((v) => !v)}
                      aria-label={showToken ? 'مخفی کردن توکن' : 'نمایش توکن'}
                      className="absolute left-2.5 top-1/2 -translate-y-1/2 p-1 text-slate-400 hover:text-slate-200 cursor-pointer"
                    >
                      {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>

                  <button
                    type="submit"
                    disabled={connectingToken || !tokenInput.trim()}
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white text-xs sm:text-sm font-semibold transition-all cursor-pointer disabled:opacity-45 flex items-center justify-center gap-2 whitespace-nowrap shrink-0"
                  >
                    {connectingToken ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        <span>در حال تایید توکن...</span>
                      </>
                    ) : (
                      <>
                        <KeyRound className="w-4 h-4" />
                        <span>اتصال با توکن گیت‌هاب</span>
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Optional OAuth Alternative if Configured */}
              {status.oauthConfigured && (
                <div className="p-4 rounded-xl bg-[#070b17] border border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
                  <span className="text-xs text-slate-300">
                    یا اتصال مستقیم از طریق پنجره OAuth گیت‌هاب:
                  </span>
                  <button
                    type="button"
                    onClick={handleConnectOAuth}
                    className="flex items-center gap-2 px-4 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    <FolderGit2 className="w-3.5 h-3.5" />
                    <span>ورود با OAuth</span>
                  </button>
                </div>
              )}
            </div>
          ) : status && status.connected && status.user ? (
            <div className="space-y-5">
              {/* Connected User Strip */}
              <div className="flex flex-wrap items-center justify-between gap-3 p-3.5 rounded-xl bg-[#070b17] border border-slate-800">
                <div className="flex items-center gap-3">
                  {status.user.avatar_url && (
                    <img
                      src={status.user.avatar_url}
                      alt={status.user.login}
                      className="w-9 h-9 rounded-full border border-slate-700"
                    />
                  )}
                  <div className="text-xs">
                    <div className="font-bold text-slate-100">
                      متصل به <span dir="ltr" className="font-mono-num text-blue-400">@{status.user.login}</span>
                    </div>
                    <div className="text-slate-400">
                      آماده ساخت مخزن یا ارسال مستقیم فایل‌ها
                    </div>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleDisconnect()}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-700 text-xs text-slate-300 hover:text-rose-400 transition-colors cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>قطع اتصال</span>
                </button>
              </div>

              {/* Repo Mode Switch */}
              <div className="flex items-center gap-1 p-1 bg-[#070b17] border border-slate-800 rounded-lg w-fit">
                <button
                  type="button"
                  onClick={() => {
                    setRepoMode('new');
                    setBranch('main');
                  }}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    repoMode === 'new'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  ساخت مخزن جدید
                </button>
                <button
                  type="button"
                  onClick={() => setRepoMode('existing')}
                  className={`px-3.5 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                    repoMode === 'existing'
                      ? 'bg-blue-600 text-white'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  آپلود روی مخزن موجود
                </button>
              </div>

              {/* Repo Form */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                {repoMode === 'new' ? (
                  <div>
                    <label className="block text-slate-400 mb-1.5">نام مخزن جدید</label>
                    <input
                      type="text"
                      dir="ltr"
                      value={newRepoName}
                      onChange={(e) => setNewRepoName(e.target.value)}
                      placeholder="crypto-scope-ai"
                      className="w-full px-3 py-2 rounded-lg bg-[#070b17] border border-slate-700 text-slate-100 font-mono-num text-left focus:outline-none focus:border-blue-500"
                    />
                  </div>
                ) : (
                  <div>
                    <label className="block text-slate-400 mb-1.5">انتخاب مخزن</label>
                    <select
                      dir="ltr"
                      value={selectedExistingRepo}
                      onChange={(e) => {
                        const val = e.target.value;
                        setSelectedExistingRepo(val);
                        const match = status.repos?.find((r) => r.full_name === val);
                        if (match) setBranch(match.default_branch || 'main');
                      }}
                      className="w-full px-3 py-2 rounded-lg bg-[#070b17] border border-slate-700 text-slate-100 font-mono-num text-left focus:outline-none focus:border-blue-500"
                    >
                      {(status.repos || []).map((r) => (
                        <option key={r.id} value={r.full_name}>
                          {r.full_name}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div>
                  <label className="block text-slate-400 mb-1.5">شاخه (Branch)</label>
                  <div className="relative">
                    <GitBranch className="w-3.5 h-3.5 text-slate-500 absolute right-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      dir="ltr"
                      value={branch}
                      onChange={(e) => setBranch(e.target.value)}
                      className="w-full pl-3 pr-8 py-2 rounded-lg bg-[#070b17] border border-slate-700 text-slate-100 font-mono-num text-left focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-slate-400 mb-1.5">پیام کامیت (Commit Message)</label>
                  <input
                    type="text"
                    value={commitMessage}
                    onChange={(e) => setCommitMessage(e.target.value)}
                    className="w-full px-3 py-2 rounded-lg bg-[#070b17] border border-slate-700 text-slate-100 focus:outline-none focus:border-blue-500"
                  />
                </div>

                {repoMode === 'new' && (
                  <label className="sm:col-span-2 flex items-center gap-2 text-slate-300 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={isPrivate}
                      onChange={(e) => setIsPrivate(e.target.checked)}
                      className="rounded border-slate-700 bg-[#070b17] text-blue-600 focus:ring-blue-500"
                    />
                    <span>ایجاد مخزن به صورت خصوصی (Private Repository)</span>
                  </label>
                )}
              </div>

              <button
                type="button"
                disabled={uploading}
                onClick={() => void handleAutoUpload()}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-l from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500 text-white font-semibold text-sm transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>در حال آپلود خودکار {status.fileCount} فایل در گیت‌هاب...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4" />
                    <span>آپلود خودکار پروژه در گیت‌هاب</span>
                  </>
                )}
              </button>

              {uploadResult && (
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/35 space-y-3 text-xs">
                  <div className="flex items-center gap-2 font-bold text-emerald-400 text-sm">
                    <CheckCircle2 className="w-5 h-5 shrink-0" />
                    <span>پروژه با موفقیت در گیت‌هاب آپلود شد!</span>
                  </div>
                  <div className="text-slate-300 space-y-1">
                    <div>
                      مخزن: <span dir="ltr" className="font-mono-num text-slate-100">{uploadResult.repoFullName}</span>
                    </div>
                    <div>
                      شاخه: <span className="font-mono-num text-slate-100">{uploadResult.branch}</span> · تعداد فایل‌ها: <span className="font-mono-num">{uploadResult.fileCount}</span>
                    </div>
                    <div>
                      شناسه کامیت: <span className="font-mono-num text-slate-300">{uploadResult.commitSha.slice(0, 10)}</span>
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2.5 pt-1">
                    <a
                      href={uploadResult.htmlUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold transition-colors"
                    >
                      <span>مشاهده در GitHub</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                    <a
                      href={uploadResult.cloudflareDeployUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-lg bg-orange-600 hover:bg-orange-500 text-white font-semibold transition-colors"
                    >
                      <Cloud className="w-3.5 h-3.5" />
                      <span>اتصال و دیپلوی در Cloudflare Pages</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}
            </div>
          ) : null}

          {/* Included Files Toggle */}
          {status && status.filesPreview.length > 0 && (
            <div className="pt-3 border-t border-slate-800/80">
              <button
                type="button"
                onClick={() => setShowFiles((v) => !v)}
                className="text-xs text-blue-400 hover:underline cursor-pointer"
              >
                {showFiles
                  ? 'بستن فهرست فایل‌های آماده آپلود'
                  : `مشاهده فهرست ${status.filesPreview.length} فایل آماده آپلود`}
              </button>
              {showFiles && (
                <div
                  dir="ltr"
                  className="mt-3 p-3 rounded-lg bg-[#060913] border border-slate-800 max-h-48 overflow-y-auto font-mono-num text-[11px] text-slate-400 grid grid-cols-1 sm:grid-cols-2 gap-1 text-left"
                >
                  {status.filesPreview.map((p) => (
                    <div key={p} className="truncate">
                      {p}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right / End Column: Cloudflare Pages Guide */}
        <div className="lg:col-span-5 bg-[#0B1120] border border-slate-800/90 rounded-xl p-5 sm:p-6 space-y-4">
          <div className="flex items-center gap-2 pb-4 border-b border-slate-800/80">
            <Cloud className="w-5 h-5 text-orange-400" />
            <h2 className="text-base font-bold text-slate-100">
              راهنمای تنظیمات Cloudflare Pages
            </h2>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            پس از آپلود پروژه در گیت‌هاب، در پنل کلودفلر وارد بخش{' '}
            <strong className="text-slate-100">Workers & Pages &gt; Create &gt; Pages &gt; Connect to Git</strong>{' '}
            شوید و مقادیر زیر را تنظیم کنید:
          </p>

          <div className="space-y-3 text-xs">
            {[
              { label: 'Build command', val: 'npm run build' },
              { label: 'Deploy command (Workers)', val: 'npx wrangler deploy' },
              { label: 'Environment variable (Secret)', val: 'GEMINI_API_KEY' },
              { label: 'Worker & Edge API Entry', val: 'worker.ts' },
            ].map((row) => (
              <div
                key={row.label}
                className="p-3 rounded-lg bg-[#070b17] border border-slate-800/80 flex items-center justify-between gap-2"
              >
                <div className="space-y-0.5">
                  <div className="text-[11px] text-slate-400">{row.label}</div>
                  <div dir="ltr" className="font-mono-num font-semibold text-slate-100 text-left">
                    {row.val}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => void handleCopy(row.val)}
                  className="p-1.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 shrink-0 cursor-pointer"
                  title="کپی"
                >
                  {copiedText === row.val ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            ))}
          </div>

          <div className="p-3.5 rounded-lg bg-[#070b17] border border-slate-800/80 text-xs text-slate-400 leading-relaxed">
            فایل‌های <span className="font-mono-num text-slate-200">wrangler.toml</span> و{' '}
            <span className="font-mono-num text-slate-200">worker.ts</span> به گونه‌ای تنظیم شده‌اند که هم رابط کاربری (<span className="font-mono-num text-slate-200">dist</span>) و هم تمام سرویس‌های آنلاین (<span className="font-mono-num text-slate-200">/api/*</span>) به صورت مستقیم روی <span className="font-mono-num text-slate-200">workers.dev</span> اجرا شوند.
          </div>

          <a
            href="https://dash.cloudflare.com/?to=/:account/pages/new/provider/github"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-100 text-xs font-semibold flex items-center justify-center gap-2 transition-colors"
          >
            <span>ورود به داشبورد Cloudflare Pages</span>
            <ExternalLink className="w-3.5 h-3.5" />
          </a>
        </div>
      </div>
    </div>
  );
};
