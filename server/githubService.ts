import fs from 'node:fs/promises';
import path from 'node:path';
import crypto from 'node:crypto';
import zlib from 'node:zlib';

export interface CollectedProjectFile {
  repoPath: string;
  content: Buffer;
  isBinary: boolean;
}

export interface GitHubSessionData {
  accessToken: string;
  user: {
    login: string;
    name?: string | null;
    avatar_url?: string;
    html_url?: string;
  };
  createdAt: number;
}

export interface GitHubRepoSummary {
  id: number;
  name: string;
  full_name: string;
  private: boolean;
  default_branch: string;
  html_url: string;
  updated_at: string;
}

const sessionStore = new Map<string, GitHubSessionData>();
const oauthStateStore = new Map<string, number>();

const INCLUDED_ROOT_FILES = new Set([
  'index.html',
  'package.json',
  'package-lock.json',
  'tsconfig.json',
  'vite.config.ts',
  'wrangler.toml',
  'worker.ts',
  'metadata.json',
  '.env.example',
  '.gitignore',
  'server.ts',
  'README.md',
]);

const INCLUDED_DIRS = new Set(['src', 'server', 'functions', 'public']);
const IGNORED_NAMES = new Set(['node_modules', 'dist', '.git', '.env', '.env.local', '.DS_Store', '.aistudio']);
const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.gif', '.ico', '.woff', '.woff2', '.ttf']);

export async function collectProjectFiles(rootDir = process.cwd()): Promise<CollectedProjectFile[]> {
  const results: CollectedProjectFile[] = [];

  async function walk(dir: string, relBase: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (IGNORED_NAMES.has(entry.name)) continue;
      if (entry.name.endsWith('.log')) continue;

      const absPath = path.join(dir, entry.name);
      const relPath = relBase ? `${relBase}/${entry.name}` : entry.name;

      if (entry.isDirectory()) {
        if (relBase === '' && !INCLUDED_DIRS.has(entry.name)) continue;
        await walk(absPath, relPath);
      } else if (entry.isFile()) {
        if (relBase === '' && !INCLUDED_ROOT_FILES.has(entry.name)) continue;
        const ext = path.extname(entry.name).toLowerCase();
        const content = await fs.readFile(absPath);
        results.push({
          repoPath: relPath,
          content,
          isBinary: BINARY_EXTENSIONS.has(ext),
        });
      }
    }
  }

  await walk(rootDir, '');

  // Add helpful Cloudflare Pages README if none exists in root
  const hasReadme = results.some((f) => f.repoPath.toLowerCase() === 'readme.md');
  if (!hasReadme) {
    const readmeText = `# CRYPTO SCOPE AI

پلتفرم هوشمند تحلیل تکنیکال چارت ارزهای دیجیتال، تحلیل اخبار لحظه‌ای و ارزیابی شرایط کلان بازار (فارسی / RTL).

## استقرار آنلاین روی Cloudflare Workers / Pages
1. این مخزن را در **Cloudflare Dashboard > Workers & Pages > Create > Import a repository** متصل کنید.
2. تنظیمات Build:
   - **Build command:** \`npm run build\`
   - **Deploy command (در حالت Workers):** \`npx wrangler deploy\`
3. در بخش **Settings > Variables and Secrets** متغیرهای زیر را اضافه کنید:
   - \`GEMINI_API_KEY\` (الزامی، به عنوان Secret)
   - \`CRYPTOPANIC_API_KEY\` (اختیاری)
4. فایل \`worker.ts\` و \`wrangler.toml\` به صورت خودکار تمام مسیرهای \`/api/*\` را به صورت آنلاین روی شبکه Edge کلودفلر اجرا می‌کنند.
`;
    results.push({
      repoPath: 'README.md',
      content: Buffer.from(readmeText, 'utf8'),
      isBinary: false,
    });
  }

  return results.sort((a, b) => a.repoPath.localeCompare(b.repoPath));
}

// Lightweight zero-dependency ZIP creator (Deflate)
const CRC_TABLE = (() => {
  const table = new Uint32Array(256);
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c >>> 0;
  }
  return table;
})();

function crc32(buf: Buffer): number {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc = CRC_TABLE[(crc ^ buf[i]) & 0xff] ^ (crc >>> 8);
  }
  return (crc ^ 0xffffffff) >>> 0;
}

export function createZipArchive(files: CollectedProjectFile[]): Buffer {
  const localChunks: Buffer[] = [];
  const centralChunks: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const nameBuf = Buffer.from(file.repoPath, 'utf8');
    const crc = crc32(file.content);
    const compressed = zlib.deflateRawSync(file.content);

    const localHeader = Buffer.alloc(30);
    localHeader.writeUInt32LE(0x04034b50, 0); // Local file header signature
    localHeader.writeUInt16LE(20, 4); // Version needed
    localHeader.writeUInt16LE(0x0800, 6); // UTF-8 flag
    localHeader.writeUInt16LE(8, 8); // Deflate compression
    localHeader.writeUInt16LE(0, 10); // Mod time
    localHeader.writeUInt16LE(0x5421, 12); // Mod date
    localHeader.writeUInt32LE(crc, 14);
    localHeader.writeUInt32LE(compressed.length, 18);
    localHeader.writeUInt32LE(file.content.length, 22);
    localHeader.writeUInt16LE(nameBuf.length, 26);
    localHeader.writeUInt16LE(0, 28); // Extra len

    localChunks.push(localHeader, nameBuf, compressed);

    const centralHeader = Buffer.alloc(46);
    centralHeader.writeUInt32LE(0x02014b50, 0); // Central directory signature
    centralHeader.writeUInt16LE(20, 4); // Version made by
    centralHeader.writeUInt16LE(20, 6); // Version needed
    centralHeader.writeUInt16LE(0x0800, 8); // UTF-8 flag
    centralHeader.writeUInt16LE(8, 10); // Compression
    centralHeader.writeUInt16LE(0, 12);
    centralHeader.writeUInt16LE(0x5421, 14);
    centralHeader.writeUInt32LE(crc, 16);
    centralHeader.writeUInt32LE(compressed.length, 20);
    centralHeader.writeUInt32LE(file.content.length, 24);
    centralHeader.writeUInt16LE(nameBuf.length, 28);
    centralHeader.writeUInt16LE(0, 30);
    centralHeader.writeUInt16LE(0, 32);
    centralHeader.writeUInt16LE(0, 34);
    centralHeader.writeUInt16LE(0, 36);
    centralHeader.writeUInt32LE(0, 38);
    centralHeader.writeUInt32LE(offset, 42);

    centralChunks.push(centralHeader, nameBuf);
    offset += localHeader.length + nameBuf.length + compressed.length;
  }

  const centralDir = Buffer.concat(centralChunks);
  const endRecord = Buffer.alloc(22);
  endRecord.writeUInt32LE(0x06054b50, 0);
  endRecord.writeUInt16LE(0, 4);
  endRecord.writeUInt16LE(0, 6);
  endRecord.writeUInt16LE(files.length, 8);
  endRecord.writeUInt16LE(files.length, 10);
  endRecord.writeUInt32LE(centralDir.length, 12);
  endRecord.writeUInt32LE(offset, 16);
  endRecord.writeUInt16LE(0, 20);

  return Buffer.concat([...localChunks, centralDir, endRecord]);
}

export function isGitHubOAuthConfigured(): boolean {
  return Boolean(process.env.GITHUB_CLIENT_ID && process.env.GITHUB_CLIENT_SECRET);
}

export function getAppBaseUrl(): string {
  const raw = process.env.APP_URL || 'http://localhost:3000';
  return raw.replace(/\/$/, '');
}

export function createGitHubAuthUrl(): { url: string; callbackUrl: string } {
  const clientId = process.env.GITHUB_CLIENT_ID;
  if (!clientId) {
    throw new Error('متغیرهای GITHUB_CLIENT_ID و GITHUB_CLIENT_SECRET تنظیم نشده‌اند.');
  }
  const callbackUrl = `${getAppBaseUrl()}/auth/github/callback`;
  const state = crypto.randomBytes(16).toString('hex');
  oauthStateStore.set(state, Date.now() + 10 * 60_000);

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: callbackUrl,
    scope: 'repo read:user',
    state,
  });

  return {
    url: `https://github.com/login/oauth/authorize?${params.toString()}`,
    callbackUrl,
  };
}

export async function exchangeGitHubCode(code: string, state?: string): Promise<{
  sessionId: string;
  user: GitHubSessionData['user'];
}> {
  if (state) {
    const expires = oauthStateStore.get(state);
    if (!expires || expires < Date.now()) {
      throw new Error('نشست تایید امنیتی OAuth منقضی یا نامعتبر است.');
    }
    oauthStateStore.delete(state);
  }

  const clientId = process.env.GITHUB_CLIENT_ID;
  const clientSecret = process.env.GITHUB_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('تنظیمات GitHub OAuth در سرور کامل نیست.');
  }

  const tokenRes = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      Accept: 'application/json',
      'Content-Type': 'application/json',
      'User-Agent': 'CryptoScopeAI',
    },
    body: JSON.stringify({
      client_id: clientId,
      client_secret: clientSecret,
      code,
      redirect_uri: `${getAppBaseUrl()}/auth/github/callback`,
    }),
  });

  const tokenJson = (await tokenRes.json()) as any;
  if (!tokenRes.ok || !tokenJson.access_token) {
    throw new Error(tokenJson.error_description || tokenJson.error || 'خطا در دریافت توکن گیت‌هاب');
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${tokenJson.access_token}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'CryptoScopeAI',
    },
  });
  if (!userRes.ok) {
    throw new Error('خطا در دریافت اطلاعات حساب گیت‌هاب');
  }
  const userJson = (await userRes.json()) as any;

  const sessionId = crypto.randomBytes(24).toString('hex');
  const user: GitHubSessionData['user'] = {
    login: userJson.login,
    name: userJson.name,
    avatar_url: userJson.avatar_url,
    html_url: userJson.html_url,
  };

  sessionStore.set(sessionId, {
    accessToken: tokenJson.access_token,
    user,
    createdAt: Date.now(),
  });

  return { sessionId, user };
}

export async function connectWithGitHubToken(rawToken: string): Promise<{
  sessionId: string;
  user: GitHubSessionData['user'];
  scopes?: string;
}> {
  const token = rawToken.trim();
  if (!token) {
    throw new Error('لطفاً توکن گیت‌هاب (Personal Access Token) را وارد کنید.');
  }

  const userRes = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CryptoScopeAI',
    },
  });

  if (userRes.status === 401) {
    throw new Error('توکن گیت‌هاب نامعتبر یا منقضی شده است.');
  }
  if (!userRes.ok) {
    throw new Error(`خطا در احراز هویت با گیت‌هاب (HTTP ${userRes.status})`);
  }

  const userJson = (await userRes.json()) as any;
  const scopes = userRes.headers.get('x-oauth-scopes') || undefined;

  const sessionId = crypto.randomBytes(24).toString('hex');
  const user: GitHubSessionData['user'] = {
    login: userJson.login,
    name: userJson.name,
    avatar_url: userJson.avatar_url,
    html_url: userJson.html_url,
  };

  sessionStore.set(sessionId, {
    accessToken: token,
    user,
    createdAt: Date.now(),
  });

  return { sessionId, user, scopes };
}

export function getGitHubSession(sessionId?: string): GitHubSessionData | null {
  if (!sessionId) return null;
  return sessionStore.get(sessionId) || null;
}

export function deleteGitHubSession(sessionId?: string): void {
  if (sessionId) sessionStore.delete(sessionId);
}

export function parseCookieValue(cookieHeader: string | undefined, key: string): string | undefined {
  if (!cookieHeader) return undefined;
  const parts = cookieHeader.split(';');
  for (const part of parts) {
    const [k, ...rest] = part.trim().split('=');
    if (k === key) {
      return decodeURIComponent(rest.join('='));
    }
  }
  return undefined;
}

async function ghApi<T>(
  token: string,
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`https://api.github.com${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'CryptoScopeAI',
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  });
  const text = await res.text();
  const data = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const msg = data?.message || `GitHub HTTP ${res.status}`;
    throw new Error(msg);
  }
  return data as T;
}

export async function listUserRepos(token: string): Promise<GitHubRepoSummary[]> {
  return await ghApi<GitHubRepoSummary[]>(
    token,
    '/user/repos?sort=updated&per_page=30&affiliation=owner'
  );
}

export async function uploadProjectToGitHub(params: {
  token: string;
  owner: string;
  repoName: string;
  repoMode: 'new' | 'existing';
  isPrivate: boolean;
  branch?: string;
  commitMessage?: string;
}): Promise<{
  repoFullName: string;
  htmlUrl: string;
  branch: string;
  commitSha: string;
  fileCount: number;
  cloudflareDeployUrl: string;
}> {
  const { token, repoMode, isPrivate } = params;
  const cleanRepo = params.repoName.trim().replace(/[^a-zA-Z0-9._-]/g, '-');
  if (!cleanRepo) {
    throw new Error('نام مخزن (Repository) نامعتبر است.');
  }

  let repoInfo: GitHubRepoSummary;
  let owner = params.owner;

  if (repoMode === 'new') {
    repoInfo = await ghApi<GitHubRepoSummary>(token, '/user/repos', {
      method: 'POST',
      body: JSON.stringify({
        name: cleanRepo,
        description: 'CRYPTO SCOPE AI — تحلیلگر هوشمند چارت رمزارزها (آماده استقرار در Cloudflare Pages)',
        private: isPrivate,
        auto_init: true,
      }),
    });
    owner = repoInfo.full_name.split('/')[0];
    // Brief wait so GitHub finishes creating the initial auto_init commit
    await new Promise((r) => setTimeout(r, 1500));
  } else {
    const targetFull = params.repoName.includes('/')
      ? params.repoName.trim()
      : `${owner}/${cleanRepo}`;
    repoInfo = await ghApi<GitHubRepoSummary>(token, `/repos/${targetFull}`);
    owner = repoInfo.full_name.split('/')[0];
  }

  const branch = params.branch?.trim() || repoInfo.default_branch || 'main';
  const repoSlug = repoInfo.name;

  // Ensure repo has at least one commit if it was an empty existing repo
  let headCommitSha: string;
  let baseTreeSha: string;
  try {
    const refData = await ghApi<any>(
      token,
      `/repos/${owner}/${repoSlug}/git/ref/heads/${encodeURIComponent(branch)}`
    );
    headCommitSha = refData.object.sha;
    const commitData = await ghApi<any>(
      token,
      `/repos/${owner}/${repoSlug}/git/commits/${headCommitSha}`
    );
    baseTreeSha = commitData.tree.sha;
  } catch {
    // Repository is completely empty: initialize with README.md via Contents API
    const initContent = Buffer.from('# CRYPTO SCOPE AI\n', 'utf8').toString('base64');
    await ghApi<any>(token, `/repos/${owner}/${repoSlug}/contents/README.md`, {
      method: 'PUT',
      body: JSON.stringify({
        message: 'Initial commit',
        content: initContent,
        branch,
      }),
    });
    const refData = await ghApi<any>(
      token,
      `/repos/${owner}/${repoSlug}/git/ref/heads/${encodeURIComponent(branch)}`
    );
    headCommitSha = refData.object.sha;
    const commitData = await ghApi<any>(
      token,
      `/repos/${owner}/${repoSlug}/git/commits/${headCommitSha}`
    );
    baseTreeSha = commitData.tree.sha;
  }

  const files = await collectProjectFiles(process.cwd());

  // Upload blobs in controlled batches to respect GitHub rate limits
  const treeItems: { path: string; mode: '100644'; type: 'blob'; sha: string }[] = [];
  const batchSize = 6;
  for (let i = 0; i < files.length; i += batchSize) {
    const chunk = files.slice(i, i + batchSize);
    const created = await Promise.all(
      chunk.map(async (f) => {
        const blob = await ghApi<{ sha: string }>(token, `/repos/${owner}/${repoSlug}/git/blobs`, {
          method: 'POST',
          body: JSON.stringify({
            content: f.content.toString('base64'),
            encoding: 'base64',
          }),
        });
        return {
          path: f.repoPath,
          mode: '100644' as const,
          type: 'blob' as const,
          sha: blob.sha,
        };
      })
    );
    treeItems.push(...created);
  }

  const newTree = await ghApi<{ sha: string }>(token, `/repos/${owner}/${repoSlug}/git/trees`, {
    method: 'POST',
    body: JSON.stringify({
      base_tree: baseTreeSha,
      tree: treeItems,
    }),
  });

  const commitMsg =
    params.commitMessage?.trim() ||
    'Deploy CRYPTO SCOPE AI with Cloudflare Pages Functions support';

  const newCommit = await ghApi<{ sha: string }>(
    token,
    `/repos/${owner}/${repoSlug}/git/commits`,
    {
      method: 'POST',
      body: JSON.stringify({
        message: commitMsg,
        tree: newTree.sha,
        parents: [headCommitSha],
      }),
    }
  );

  await ghApi(token, `/repos/${owner}/${repoSlug}/git/refs/heads/${encodeURIComponent(branch)}`, {
    method: 'PATCH',
    body: JSON.stringify({
      sha: newCommit.sha,
      force: false,
    }),
  });

  return {
    repoFullName: repoInfo.full_name,
    htmlUrl: repoInfo.html_url,
    branch,
    commitSha: newCommit.sha,
    fileCount: files.length,
    cloudflareDeployUrl: 'https://dash.cloudflare.com/?to=/:account/pages/new/provider/github',
  };
}
