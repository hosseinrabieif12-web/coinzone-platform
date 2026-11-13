import 'dotenv/config';
import express from 'express';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createServer as createViteServer } from 'vite';
import { fetchGlobalMarketData } from './server/marketService.ts';
import {
  analyzeChartWithAI,
  answerChatQuestion,
  generateNewsDashboard,
} from './server/geminiService.ts';
import {
  collectProjectFiles,
  connectWithGitHubToken,
  createGitHubAuthUrl,
  createZipArchive,
  deleteGitHubSession,
  exchangeGitHubCode,
  getAppBaseUrl,
  getGitHubSession,
  isGitHubOAuthConfigured,
  listUserRepos,
  parseCookieValue,
  uploadProjectToGitHub,
} from './server/githubService.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function formatServerError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'کلید Gemini API نامعتبر است یا دسترسی ندارد. لطفاً تنظیمات کلید را در بخش Secrets بررسی کنید.',
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      status: 429,
      message: 'محدودیت نرخ درخواست (Quota) سرویس هوش مصنوعی موقتاً پر شده است. کمی بعد دوباره تلاش کنید.',
    };
  }
  if (msg.includes('503') || msg.includes('UNAVAILABLE')) {
    return {
      status: 503,
      message: 'سرویس هوش مصنوعی در لحظه فعلی با ترافیک بالا مواجه است. لطفاً چند ثانیه دیگر دوباره تلاش کنید.',
    };
  }
  return {
    status: 500,
    message: msg || 'خطای غیرمنتظره در سرور رخ داد.',
  };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;
  const isProd = process.env.NODE_ENV === 'production';

  app.use(express.json({ limit: '25mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, timestamp: new Date().toISOString() });
  });

  app.get('/api/market/global', async (req, res) => {
    try {
      const force = req.query.refresh === '1';
      const data = await fetchGlobalMarketData(force);
      res.json(data);
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.get('/api/news', async (req, res) => {
    try {
      const asset = typeof req.query.asset === 'string' && req.query.asset.trim()
        ? req.query.asset.trim()
        : 'BTC';
      const force = req.query.refresh === '1';
      const data = await generateNewsDashboard(asset, force);
      res.json(data);
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/analyze-chart', async (req, res) => {
    try {
      const { frames, userHints } = req.body || {};
      if (!Array.isArray(frames) || frames.length === 0) {
        res.status(400).json({ error: 'لطفاً حداقل یک تصویر چارت با فرمت PNG یا JPG بارگذاری کنید.' });
        return;
      }
      const report = await analyzeChartWithAI({
        frames,
        userHints: userHints || {},
      });
      res.json(report);
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/chat', async (req, res) => {
    try {
      const { question, history, report, globalMarket } = req.body || {};
      if (!question || typeof question !== 'string' || !question.trim()) {
        res.status(400).json({ error: 'متن پرسش نمی‌تواند خالی باشد.' });
        return;
      }
      const answer = await answerChatQuestion({
        question: question.trim(),
        history: Array.isArray(history) ? history : [],
        report: report || null,
        globalMarket: globalMarket || null,
      });
      res.json({ answer, timestamp: new Date().toISOString() });
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const extractSessionId = (req: express.Request): string | undefined => {
    const headerVal = req.headers['x-github-session'];
    if (typeof headerVal === 'string' && headerVal.trim()) {
      return headerVal.trim();
    }
    return parseCookieValue(req.headers.cookie, 'gh_session');
  };

  // GitHub OAuth, Token Login & Auto-Upload Routes
  app.get('/api/github/status', async (req, res) => {
    try {
      const configured = isGitHubOAuthConfigured();
      const callbackUrl = `${getAppBaseUrl()}/auth/github/callback`;
      const sessionId = extractSessionId(req);
      const session = getGitHubSession(sessionId);
      const files = await collectProjectFiles(process.cwd());

      if (!session) {
        res.json({
          oauthConfigured: configured,
          connected: false,
          callbackUrl,
          fileCount: files.length,
          filesPreview: files.map((f) => f.repoPath),
        });
        return;
      }

      const repos = await listUserRepos(session.accessToken).catch(() => []);
      res.json({
        oauthConfigured: configured,
        connected: true,
        user: session.user,
        repos,
        callbackUrl,
        fileCount: files.length,
        filesPreview: files.map((f) => f.repoPath),
      });
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.post('/api/github/connect-token', async (req, res) => {
    try {
      const { token } = req.body || {};
      if (!token || typeof token !== 'string') {
        res.status(400).json({ error: 'لطفاً توکن دسترسی گیت‌هاب را وارد کنید.' });
        return;
      }
      const { sessionId, user, scopes } = await connectWithGitHubToken(token);
      res.cookie('gh_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.json({ ok: true, sessionId, user, scopes });
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'خطا در بررسی توکن گیت‌هاب';
      res.status(400).json({ error: msg });
    }
  });

  app.get('/api/auth/github/url', (_req, res) => {
    if (!isGitHubOAuthConfigured()) {
      res.json({
        configured: false,
        callbackUrl: `${getAppBaseUrl()}/auth/github/callback`,
      });
      return;
    }
    try {
      const { url, callbackUrl } = createGitHubAuthUrl();
      res.json({ configured: true, url, callbackUrl });
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  const handleGitHubCallback = async (req: express.Request, res: express.Response) => {
    const code = typeof req.query.code === 'string' ? req.query.code : '';
    const state = typeof req.query.state === 'string' ? req.query.state : undefined;
    const errorDesc = typeof req.query.error_description === 'string' ? req.query.error_description : '';

    if (errorDesc || !code) {
      const safeErr = (errorDesc || 'دسترسی گیت‌هاب لغو شد.').replace(/</g, '&lt;');
      res.status(400).send(`<!doctype html><html lang="fa" dir="rtl"><body style="background:#060913;color:#f87171;font-family:sans-serif;padding:24px;text-align:center;">
        <p>${safeErr}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(errorDesc || 'دسترسی گیت‌هاب تایید نشد.')} }, '*');
          }
          setTimeout(() => window.close(), 1500);
        </script>
      </body></html>`);
      return;
    }

    try {
      const { sessionId, user } = await exchangeGitHubCode(code, state);
      res.cookie('gh_session', sessionId, {
        httpOnly: true,
        secure: true,
        sameSite: 'none',
        maxAge: 24 * 60 * 60 * 1000,
      });
      res.send(`<!doctype html><html lang="fa" dir="rtl"><body style="background:#060913;color:#34d399;font-family:sans-serif;padding:24px;text-align:center;">
        <p>اتصال به گیت‌هاب با موفقیت انجام شد. در حال بازگشت...</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS', provider: 'github', sessionId: ${JSON.stringify(sessionId)}, user: ${JSON.stringify(user)} }, '*');
            window.close();
          } else {
            window.location.href = '/';
          }
        </script>
      </body></html>`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'خطا در احراز هویت گیت‌هاب';
      res.status(500).send(`<!doctype html><html lang="fa" dir="rtl"><body style="background:#060913;color:#f87171;font-family:sans-serif;padding:24px;text-align:center;">
        <p>${message.replace(/</g, '&lt;')}</p>
        <script>
          if (window.opener) {
            window.opener.postMessage({ type: 'OAUTH_AUTH_ERROR', error: ${JSON.stringify(message)} }, '*');
          }
        </script>
      </body></html>`);
    }
  };

  app.get(['/auth/github/callback', '/auth/github/callback/'], handleGitHubCallback);

  app.post('/api/github/logout', (req, res) => {
    const sessionId = extractSessionId(req);
    deleteGitHubSession(sessionId);
    res.clearCookie('gh_session', {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
    });
    res.json({ ok: true });
  });

  app.post('/api/github/upload', async (req, res) => {
    try {
      const sessionId = extractSessionId(req);
      const session = getGitHubSession(sessionId);
      if (!session) {
        res.status(401).json({ error: 'ابتدا از طریق توکن گیت‌هاب یا OAuth وارد حساب خود شوید.' });
        return;
      }
      const { repoMode, repoName, isPrivate, branch, commitMessage } = req.body || {};
      if (!repoName || typeof repoName !== 'string') {
        res.status(400).json({ error: 'لطفاً نام مخزن (Repository) را وارد یا انتخاب کنید.' });
        return;
      }

      const result = await uploadProjectToGitHub({
        token: session.accessToken,
        owner: session.user.login,
        repoMode: repoMode === 'existing' ? 'existing' : 'new',
        repoName,
        isPrivate: Boolean(isPrivate),
        branch: typeof branch === 'string' ? branch : undefined,
        commitMessage: typeof commitMessage === 'string' ? commitMessage : undefined,
      });

      res.json(result);
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  app.get('/api/github/download-bundle', async (_req, res) => {
    try {
      const files = await collectProjectFiles(process.cwd());
      const zipBuffer = createZipArchive(files);
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', 'attachment; filename="crypto-scope-ai-cloudflare.zip"');
      res.setHeader('Content-Length', String(zipBuffer.length));
      res.send(zipBuffer);
    } catch (err) {
      const formatted = formatServerError(err);
      res.status(formatted.status).json({ error: formatted.message });
    }
  });

  if (!isProd) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`CRYPTO SCOPE AI server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
