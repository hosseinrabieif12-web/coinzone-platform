import React, { useState, useEffect } from 'react';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { GitHubConfig, GitHubTestResult, GitHubSyncResult, GitHubRepoItem } from '../types';
import {
  GitBranch,
  Github,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  UploadCloud,
  Key,
  Shield,
  HelpCircle,
  Copy,
  Check,
  RefreshCw,
  FolderGit2,
  Eye,
  EyeOff,
  Sparkles,
  ArrowRight,
  FolderPlus,
} from 'lucide-react';

export const GitHubSyncPanel: React.FC = () => {
  const [config, setConfig] = useState<GitHubConfig | null>(null);
  const [tokenInput, setTokenInput] = useState<string>(() => {
    return localStorage.getItem('coinzone_github_token') || '';
  });
  const [showToken, setShowToken] = useState<boolean>(false);
  const [repoOwner, setRepoOwner] = useState<string>('');
  const [repoName, setRepoName] = useState<string>('coinzone-platform');
  const [branch, setBranch] = useState<string>('main');
  const [isPrivate, setIsPrivate] = useState<boolean>(false);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(true);
  const [commitMessage, setCommitMessage] = useState<string>('آپدیت خودکار پلتفرم کوین‌زون');
  const [d1DatabaseId, setD1DatabaseId] = useState<string>(() => {
    return localStorage.getItem('coinzone_d1_database_id') || '';
  });

  // Repositories list from user's account
  const [userRepos, setUserRepos] = useState<GitHubRepoItem[]>([]);
  const [loadingRepos, setLoadingRepos] = useState<boolean>(false);
  const [selectedRepoMode, setSelectedRepoMode] = useState<'custom' | 'existing'>('custom');

  // Status
  const [testingToken, setTestingToken] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<GitHubTestResult | null>(null);
  const [testError, setTestError] = useState<string | null>(null);

  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadStep, setUploadStep] = useState<string>('');
  const [uploadResult, setUploadResult] = useState<GitHubSyncResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [errorCreateRepoUrl, setErrorCreateRepoUrl] = useState<string | null>(null);

  const [showGuide, setShowGuide] = useState<boolean>(false);
  const [copiedCli, setCopiedCli] = useState<boolean>(false);

  // Fetch initial config from backend
  const fetchConfig = async () => {
    try {
      const cfg = await api.getGitHubConfig();
      setConfig(cfg);
      if (cfg.repoOwner) setRepoOwner(cfg.repoOwner);
      if (cfg.repoName) setRepoName(cfg.repoName);
      if (cfg.branch) setBranch(cfg.branch);
      setIsPrivate(cfg.isPrivate);
      setAutoSyncEnabled(cfg.autoSyncEnabled);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchConfig();
    // Auto-test if we have token saved
    const savedToken = localStorage.getItem('coinzone_github_token');
    if (savedToken && savedToken.trim().length > 10) {
      testToken(savedToken.trim());
    }
  }, []);

  const testToken = async (tok: string) => {
    if (!tok.trim()) return;
    setTestingToken(true);
    setTestError(null);
    setTestResult(null);

    try {
      const res = await api.testGitHubToken(tok.trim());
      setTestResult(res);
      if (res.login && !repoOwner) {
        setRepoOwner(res.login);
      }
      if (res.repos && res.repos.length > 0) {
        setUserRepos(res.repos);
        // If coinzone-platform exists in user's repos, auto-select it
        const match = res.repos.find((r) => r.name.toLowerCase() === repoName.toLowerCase());
        if (match) {
          setSelectedRepoMode('existing');
          setRepoName(match.name);
          if (match.defaultBranch) setBranch(match.defaultBranch);
        }
      }
      localStorage.setItem('coinzone_github_token', tok.trim());
    } catch (err: unknown) {
      const e = err as Error;
      setTestError(e.message || 'خطا در اعتبارسنجی توکن');
    } finally {
      setTestingToken(false);
    }
  };

  const handleTestTokenClick = async () => {
    if (!tokenInput.trim()) {
      alert('لطفاً ابتدا توکن دسترسی شخصی گیت‌هاب (Personal Access Token) را وارد کنید.');
      return;
    }
    sound.playClick();
    await testToken(tokenInput.trim());
    if (!testError) {
      sound.playWin();
    } else {
      sound.playError();
    }
  };

  const refreshUserRepos = async () => {
    const tok = tokenInput.trim() || undefined;
    if (!tok && !config?.isConfigured) {
      alert('لطفاً ابتدا توکن گیت‌هاب را وارد کنید.');
      return;
    }
    setLoadingRepos(true);
    try {
      const res = await api.getMyRepositories(tok);
      setUserRepos(res.repos);
      sound.playCoin();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'خطا در دریافت لیست مخازن');
    } finally {
      setLoadingRepos(false);
    }
  };

  const handleSaveConfig = async () => {
    sound.playClick();
    try {
      await api.saveGitHubConfig({
        token: tokenInput.trim() || undefined,
        repoOwner: repoOwner.trim(),
        repoName: repoName.trim(),
        branch: branch.trim(),
        isPrivate,
        autoSyncEnabled,
      });
      if (tokenInput.trim()) {
        localStorage.setItem('coinzone_github_token', tokenInput.trim());
      }
      sound.playCoin();
      alert('تنظیمات گیت‌هاب با موفقیت در سرور ذخیره گردید.');
      await fetchConfig();
    } catch (err: unknown) {
      const e = err as Error;
      sound.playError();
      alert(e.message || 'خطا در ذخیره تنظیمات');
    }
  };

  const handleUploadNow = async () => {
    const token = tokenInput.trim() || undefined;
    if (!token && !config?.isConfigured) {
      alert('لطفاً توکن دسترسی گیت‌هاب را در مرحله ۱ وارد کنید.');
      return;
    }

    sound.playClick();
    setIsUploading(true);
    setUploadError(null);
    setErrorCreateRepoUrl(null);
    setUploadResult(null);
    setUploadStep('در حال احراز هویت و بررسی دسترسی مخزن...');

    try {
      setUploadStep('در حال اسکن فایل‌های پروژه و ساخت درخت گیت...');
      const res = await api.uploadToGitHub({
        token,
        repoOwner: repoOwner.trim() || undefined,
        repoName: repoName.trim() || 'coinzone-platform',
        branch: branch.trim() || 'main',
        isPrivate,
        commitMessage: commitMessage.trim() || 'Auto-Sync from COINZONE Platform',
        d1DatabaseId: d1DatabaseId.trim() || undefined,
      });

      setUploadResult(res);
      setUploadStep('');
      sound.playWin();
      if (token) {
        localStorage.setItem('coinzone_github_token', token);
      }
      await fetchConfig();
    } catch (err: unknown) {
      const e = err as any;
      sound.playError();
      setUploadStep('');
      setUploadError(e.message || 'خطا در آپلود و همگام‌سازی با گیت‌هاب');

      // Check if it's the repo creation restriction error
      const targetRepo = repoName.trim() || 'coinzone-platform';
      const fallbackUrl = `https://github.com/new?name=${encodeURIComponent(targetRepo)}&description=COINZONE+Gaming+Platform`;
      setErrorCreateRepoUrl(fallbackUrl);
    } finally {
      setIsUploading(false);
    }
  };

  const cliCommands = `git init
git remote add origin https://github.com/${repoOwner || 'YOUR_USERNAME'}/${repoName || 'coinzone-platform'}.git
git branch -M ${branch || 'main'}
git add .
git commit -m "${commitMessage || 'COINZONE Platform Update'}"
git push -u origin ${branch || 'main'}`;

  const copyCliCommands = () => {
    navigator.clipboard.writeText(cliCommands);
    setCopiedCli(true);
    sound.playClick();
    setTimeout(() => setCopiedCli(false), 2500);
  };

  // Pre-configured link that automatically selects `repo` and `workflow` scopes in GitHub
  const generateClassicTokenUrl =
    'https://github.com/settings/tokens/new?description=COINZONE+Auto+Upload&scopes=repo,workflow';

  const createRepoPreFilledUrl = `https://github.com/new?name=${encodeURIComponent(
    repoName || 'coinzone-platform'
  )}&description=${encodeURIComponent('COINZONE Gaming Rewards Platform')}&public=true`;

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 bg-gradient-to-r from-[#181a24] to-[#12141c] border border-white/10 rounded-2xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-purple-600/20 border border-purple-500/40 text-white flex items-center justify-center shadow-lg shrink-0">
            <Github className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-black text-white flex items-center gap-2">
              <span>آپلود خودکار با توکن گیت‌هاب (GitHub Auto-Upload)</span>
              {testResult?.valid && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px] font-bold">
                  متصل به @{testResult.login}
                </span>
              )}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              فقط با وارد کردن توکن گیت‌هاب، سورس‌کد کامل پروژه، ورکر Cloudflare و دیتابیس مستقیماً روی مخزن شما آپلود و دیپلوی می‌شود.
            </p>
          </div>
        </div>

        <button
          onClick={() => setShowGuide(!showGuide)}
          className="text-xs text-purple-400 hover:text-purple-300 font-bold flex items-center gap-1.5 cursor-pointer shrink-0 py-1.5 px-3 rounded-lg bg-purple-950/40 border border-purple-500/20"
        >
          <HelpCircle className="w-4 h-4" />
          <span>{showGuide ? 'بستن راهنما' : 'راهنمای دریافت توکن سریع'}</span>
        </button>
      </div>

      {/* Guide Box */}
      {showGuide && (
        <div className="p-5 bg-purple-950/30 border border-purple-500/30 rounded-2xl text-xs space-y-3 animate-fadeIn text-slate-300 leading-relaxed">
          <div className="font-bold text-white flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-purple-400" />
            <span>چگونه در کمتر از ۱ دقیقه توکن گیت‌هاب بسازیم؟</span>
          </div>

          <div className="space-y-2 text-slate-300">
            <p>
              ۱. روی لینک زیر کلیک کنید تا صفحه ساخت توکن در گیت‌هاب با گزینه‌های لازم (تیک دسترسی <code className="text-amber-300 font-mono">repo</code>) به صورت آماده و خودکار باز شود:
            </p>
            <div className="pt-1">
              <a
                href={generateClassicTokenUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-2 px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl shadow-md"
              >
                <span>🚀 باز کردن صفحه ساخت توکن با تیک‌های خودکار در GitHub</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
            <p className="pt-2">
              ۲. در پایین آن صفحه روی دکمه سبز رنگ <strong>Generate token</strong> کلیک کنید.
            </p>
            <p>
              ۳. توکنی که با عبارت <code className="text-emerald-400 font-mono">ghp_...</code> شروع می‌شود را کپی کرده و در کادر زیر قرار دهید.
            </p>
          </div>
        </div>
      )}

      {/* Main Form & Upload Engine */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Step-by-Step Auto Upload */}
        <div className="lg:col-span-2 space-y-5">
          
          {/* STEP 1: GitHub Token */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-purple-600/30 text-purple-400 text-xs flex items-center justify-center font-black">
                  ۱
                </span>
                <span>توکن دسترسی گیت‌هاب (Personal Access Token)</span>
              </h4>
              <a
                href={generateClassicTokenUrl}
                target="_blank"
                rel="noreferrer"
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold underline flex items-center gap-1"
              >
                <span>ساخت توکن جدید</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <input
                    type={showToken ? 'text' : 'password'}
                    placeholder="توکن خود را اینجا پیست کنید (ghp_... یا github_pat_...)"
                    value={tokenInput}
                    onChange={(e) => {
                      setTokenInput(e.target.value);
                      if (e.target.value.length > 20) {
                        testToken(e.target.value);
                      }
                    }}
                    className="w-full bg-[#181a24] border border-white/10 focus:border-purple-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left pl-10"
                  />
                  <button
                    type="button"
                    onClick={() => setShowToken(!showToken)}
                    className="absolute left-3 top-3 text-slate-500 hover:text-slate-300"
                    title={showToken ? 'مخفی‌سازی' : 'نمایش توکن'}
                  >
                    {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleTestTokenClick}
                  disabled={testingToken || !tokenInput.trim()}
                  className="px-4 py-2.5 bg-purple-600/20 hover:bg-purple-600/30 border border-purple-500/40 text-purple-300 font-bold text-xs rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shrink-0 disabled:opacity-40"
                >
                  {testingToken ? (
                    <span className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  ) : (
                    <>
                      <CheckCircle2 className="w-3.5 h-3.5 text-purple-400" />
                      <span>تست اتصال</span>
                    </>
                  )}
                </button>
              </div>

              {/* Token type helper badge */}
              {tokenInput.trim().startsWith('github_pat_') && (
                <div className="p-2.5 bg-amber-950/30 border border-amber-500/40 rounded-xl text-[11px] text-amber-300 flex items-start gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                  <div className="leading-relaxed">
                    <strong>توکن نوع Fine-Grained شناسایی شد:</strong> به دلیل سیاست‌های امنیتی گیت‌هاب، این نوع توکن نمی‌تواند به طور خودکار مخزن جدید بسازد. لطفاً در مرحله ۲ با دکمه «ساخت مخزن در GitHub» مخزن را بسازید، یا از توکن نوع Classic استفاده کنید.
                  </div>
                </div>
              )}

              {tokenInput.trim().startsWith('ghp_') && (
                <div className="p-2.5 bg-emerald-950/20 border border-emerald-500/30 rounded-xl text-[11px] text-emerald-300 flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>توکن نوع Classic استاندارد (با دسترسی کامل به مخازن)</span>
                </div>
              )}

              {testResult && (
                <div className="p-3 bg-emerald-950/30 border border-emerald-500/40 rounded-xl text-xs text-emerald-300 flex items-center justify-between gap-2 animate-fadeIn">
                  <div className="flex items-center gap-2">
                    <img
                      src={testResult.avatarUrl || 'https://github.githubassets.com/images/modules/logos_page/GitHub-Mark.png'}
                      alt={testResult.login}
                      className="w-6 h-6 rounded-full border border-emerald-400/40"
                    />
                    <span>
                      اکانت متصل شد: <strong className="font-mono text-white">{testResult.login}</strong> ({testResult.name})
                    </span>
                  </div>
                  <span className="text-[11px] text-emerald-400/80 font-mono">
                    {testResult.publicRepos} مخزن عمومی
                  </span>
                </div>
              )}

              {testError && (
                <div className="p-3 bg-rose-950/30 border border-rose-500/40 rounded-xl text-xs text-rose-300 flex items-center gap-2 animate-fadeIn">
                  <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
                  <span>{testError}</span>
                </div>
              )}
            </div>
          </div>

          {/* STEP 2: Repository Selection */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-4">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-bold text-white flex items-center gap-2">
                <span className="w-6 h-6 rounded-lg bg-cyan-600/30 text-cyan-400 text-xs flex items-center justify-center font-black">
                  ۲
                </span>
                <span>انتخاب یا ساخت مخزن در اکانت شما</span>
              </h4>

              {userRepos.length > 0 && (
                <button
                  type="button"
                  onClick={refreshUserRepos}
                  disabled={loadingRepos}
                  className="text-[11px] text-slate-400 hover:text-white flex items-center gap-1 cursor-pointer"
                >
                  <RefreshCw className={`w-3 h-3 ${loadingRepos ? 'animate-spin' : ''}`} />
                  <span>بروزرسانی مخازن</span>
                </button>
              )}
            </div>

            {/* If user has repos in their account, show choice */}
            {userRepos.length > 0 && (
              <div className="flex items-center gap-4 text-xs text-slate-300 pb-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="repoMode"
                    checked={selectedRepoMode === 'existing'}
                    onChange={() => setSelectedRepoMode('existing')}
                    className="accent-purple-500"
                  />
                  <span>انتخاب از مخازن موجود اکانت ({userRepos.length} مخزن)</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="radio"
                    name="repoMode"
                    checked={selectedRepoMode === 'custom'}
                    onChange={() => setSelectedRepoMode('custom')}
                    className="accent-purple-500"
                  />
                  <span>مخزن جدید یا نام دلخواه</span>
                </label>
              </div>
            )}

            {selectedRepoMode === 'existing' && userRepos.length > 0 ? (
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">مخزن مورد نظر را انتخاب کنید:</label>
                <select
                  value={repoName}
                  onChange={(e) => {
                    const selName = e.target.value;
                    setRepoName(selName);
                    const match = userRepos.find((r) => r.name === selName);
                    if (match && match.defaultBranch) {
                      setBranch(match.defaultBranch);
                    }
                  }}
                  className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2.5 text-xs text-white font-mono focus:outline-none dir-ltr text-left"
                >
                  {userRepos.map((r) => (
                    <option key={r.name} value={r.name}>
                      {r.fullName} {r.isPrivate ? '(Private 🔒)' : '(Public 🌐)'}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      نام کاربری یا سازمان (Owner)
                    </label>
                    <input
                      type="text"
                      placeholder="نام کاربری گیت‌هاب شما"
                      value={repoOwner}
                      onChange={(e) => setRepoOwner(e.target.value)}
                      className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">
                      نام مخزن (Repository Name)
                    </label>
                    <input
                      type="text"
                      placeholder="coinzone-platform"
                      value={repoName}
                      onChange={(e) => setRepoName(e.target.value)}
                      className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
                    />
                  </div>
                </div>

                {/* Direct 1-Click Repo Creation link if not created */}
                <div className="p-3 bg-cyan-950/20 border border-cyan-500/30 rounded-xl flex items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-cyan-300">
                    <FolderPlus className="w-4 h-4 shrink-0 text-cyan-400" />
                    <span>آیا مخزن {repoName} را در اکانت خود نساخته‌اید؟</span>
                  </div>
                  <a
                    href={createRepoPreFilledUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-3 py-1.5 bg-cyan-500 hover:bg-cyan-400 text-black font-black rounded-lg text-xs flex items-center gap-1 shrink-0 transition-all shadow"
                  >
                    <span>ساخت مخزن در GitHub (۱ کلیک)</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              </div>
            )}

            {/* Branch and Commit Message */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">شاخه هدف (Branch)</label>
                <div className="relative">
                  <input
                    type="text"
                    value={branch}
                    onChange={(e) => setBranch(e.target.value)}
                    className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white font-mono focus:outline-none dir-ltr text-left"
                  />
                  <GitBranch className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1.5">پیام کامیت (Commit Message)</label>
                <input
                  type="text"
                  value={commitMessage}
                  onChange={(e) => setCommitMessage(e.target.value)}
                  className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white focus:outline-none"
                />
              </div>
            </div>

            {/* Optional Cloudflare D1 Database ID input */}
            <div className="pt-3 border-t border-white/5 space-y-1.5">
              <div className="flex items-center justify-between">
                <label className="text-xs font-bold text-slate-300 flex items-center gap-1.5">
                  <span>شناسه پایگاه‌داده Cloudflare D1 (اختیاری)</span>
                </label>
                <span className="text-[11px] text-slate-400">
                  {d1DatabaseId ? 'تنظیم شده' : 'اختیاری (برای جلوگیری از ارور ۱۰0۲۱)'}
                </span>
              </div>
              <input
                type="text"
                placeholder="مثال: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx (اگر در کلودفلر دیتابیس D1 نساخته‌اید خالی بگذارید)"
                value={d1DatabaseId}
                onChange={(e) => {
                  setD1DatabaseId(e.target.value);
                  localStorage.setItem('coinzone_d1_database_id', e.target.value.trim());
                }}
                className="w-full bg-[#181a24] border border-white/10 focus:border-cyan-400 rounded-xl px-4 py-2 text-xs text-white font-mono placeholder-slate-600 focus:outline-none dir-ltr text-left"
              />
              <p className="text-[11px] text-slate-500">
                اگر در کلودفلر دیتابیس D1 ساخته‌اید UUID آن را اینجا وارد کنید؛ در غیر این صورت فیلد را خالی بگذارید تا کلودفلر ورکر و فرانت‌اند را بدون خطای 10021 با موفقیت مستقر کند.
              </p>
            </div>
          </div>

          {/* STEP 3: Upload Action Button */}
          <div className="space-y-3">
            <button
              type="button"
              onClick={handleUploadNow}
              disabled={isUploading}
              className="w-full py-4 px-6 bg-gradient-to-r from-purple-600 via-indigo-600 to-cyan-500 hover:from-purple-500 hover:to-cyan-400 text-white font-black text-sm rounded-2xl shadow-xl shadow-purple-600/30 transition-all cursor-pointer flex items-center justify-center gap-3 transform active:scale-[0.98] disabled:opacity-50"
            >
              {isUploading ? (
                <>
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>{uploadStep || 'در حال آپلود خودکار و همگام‌سازی با گیت‌هاب...'}</span>
                </>
              ) : (
                <>
                  <UploadCloud className="w-5 h-5" />
                  <span>🚀 شروع آپلود خودکار و پوش به گیت‌هاب (Upload Now)</span>
                </>
              )}
            </button>

            <div className="flex items-center justify-between text-xs text-slate-400 px-1">
              <span>کلیه فایل‌های فرانت‌اند، Cloudflare Worker و دیتابیس پوش خواهند شد.</span>
              <button
                type="button"
                onClick={handleSaveConfig}
                className="text-purple-400 hover:text-purple-300 underline font-bold cursor-pointer"
              >
                ذخیره دائمی تنظیمات در سرور
              </button>
            </div>
          </div>

          {/* Upload Success Alert */}
          {uploadResult && (
            <div className="p-6 bg-emerald-950/40 border-2 border-emerald-500/60 rounded-2xl space-y-3 animate-fadeIn glow-purple">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-emerald-500 text-black flex items-center justify-center font-bold shrink-0">
                  <Check className="w-7 h-7 stroke-[3]" />
                </div>
                <div>
                  <h4 className="text-base font-black text-emerald-300">پروژه با موفقیت روی گیت‌هاب آپلود و مستقر شد!</h4>
                  <p className="text-xs text-emerald-200 mt-0.5">
                    تعداد {uploadResult.uploadedFilesCount} فایل در شاخه {branch} کامیت گردید و اکشن GitHub Actions آماده استقرار است.
                  </p>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-4 pt-3 border-t border-emerald-500/20 text-xs">
                <a
                  href={uploadResult.repoUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black font-black rounded-xl flex items-center gap-2 transition-all shadow-md"
                >
                  <span>مشاهده مخزن در GitHub</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="font-mono text-slate-300">
                  شناسه کامیت: <span className="text-emerald-400 font-bold">{uploadResult.commitSha.substring(0, 7)}</span>
                </div>
              </div>
            </div>
          )}

          {/* Upload Error Banner with 1-Click Action */}
          {uploadError && (
            <div className="p-5 bg-rose-950/40 border border-rose-500/50 rounded-2xl flex flex-col gap-3 text-xs text-rose-300 animate-fadeIn">
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                <div className="space-y-1.5 flex-1">
                  <div className="font-bold text-white text-sm">خطا در ارسال به گیت‌هاب:</div>
                  <div className="whitespace-pre-line leading-relaxed text-slate-200">{uploadError}</div>
                </div>
              </div>

              {/* Action buttons to immediately fix the error */}
              <div className="p-4 bg-black/60 border border-amber-500/40 rounded-xl space-y-3 mt-1 shadow-lg">
                <div className="font-bold text-amber-300 text-sm flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>حل فوری و قطعی این خطا در ۲ قدم:</span>
                </div>

                <div className="text-xs text-slate-300 space-y-1 leading-relaxed">
                  <p>
                    علت: توکن شما از نوع Fine-Grained است یا مخزن <code className="text-amber-300 font-mono font-bold">{repoName}</code> هنوز در اکانت گیت‌هاب شما ساخته نشده است.
                  </p>
                </div>

                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 pt-1">
                  <a
                    href={errorCreateRepoUrl || createRepoPreFilledUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-3 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black rounded-xl flex items-center justify-center gap-2 transition-all shadow-lg active:scale-95 text-xs text-center"
                  >
                    <span>۱. ساخت مخزن «{repoName}» در گیت‌هاب (۱ کلیک)</span>
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>

                  <button
                    type="button"
                    onClick={handleUploadNow}
                    className="px-4 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-black rounded-xl flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg active:scale-95 text-xs text-center"
                  >
                    <RefreshCw className="w-4 h-4 shrink-0" />
                    <span>۲. تلاش مجدد برای آپلود و پوش فوری</span>
                  </button>
                </div>

                <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px] text-slate-400">
                  <span>روش جایگزین: استفاده از توکن Classic با دسترسی کامل</span>
                  <a
                    href={generateClassicTokenUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-cyan-400 hover:text-cyan-300 underline font-bold flex items-center gap-1"
                  >
                    <span>ساخت توکن Classic (تیک‌های خودکار)</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right Col: Info, Status & Terminal Fallback */}
        <div className="space-y-4">
          {/* Status Card */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-3">
            <h4 className="text-xs font-bold text-white flex items-center gap-1.5">
              <Shield className="w-4 h-4 text-purple-400" />
              <span>اطلاعات پایپ‌لاین و مخزن</span>
            </h4>

            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">مخزن هدف:</span>
                {config?.repoUrl ? (
                  <a
                    href={config.repoUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-purple-400 hover:underline font-mono truncate max-w-[140px] dir-ltr"
                  >
                    {config.repoName}
                  </a>
                ) : (
                  <span className="text-white font-mono">{repoName || 'تنظیم نشده'}</span>
                )}
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">شاخه فعال:</span>
                <span className="font-mono text-white">{branch}</span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">آخرین ارسال:</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {config?.lastSyncAt ? new Date(config.lastSyncAt).toLocaleString('fa-IR') : 'هنوز انجام نشده'}
                </span>
              </div>

              <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03]">
                <span className="text-slate-400">دیپلوی Cloudflare:</span>
                <span className="text-emerald-400 font-bold">خودکار (GitHub Actions)</span>
              </div>
            </div>
          </div>

          {/* Terminal Fallback Box */}
          <div className="bg-[#12141c] border border-white/10 rounded-2xl p-5 glass-panel space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-white">دستورات ترمینال (Git CLI)</h4>
              <button
                type="button"
                onClick={copyCliCommands}
                className="text-[11px] text-cyan-400 hover:text-cyan-300 font-bold flex items-center gap-1 cursor-pointer"
              >
                {copiedCli ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedCli ? 'کپی شد!' : 'کپی'}</span>
              </button>
            </div>

            <pre className="p-3 bg-black/60 border border-white/5 rounded-xl font-mono text-[11px] text-slate-300 overflow-x-auto dir-ltr text-left leading-relaxed">
              {cliCommands}
            </pre>
            <div className="text-[10px] text-slate-500 leading-normal">
              اگر ترجیح می‌دهید به جای وب، با ترمینال کدها را بفرستید، دستورات فوق را مستقیماً کپی و اجرا کنید.
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
