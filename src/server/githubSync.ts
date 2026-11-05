import fs from 'fs';
import path from 'path';

export interface GitHubConfigData {
  token: string;
  repoOwner: string;
  repoName: string;
  branch: string;
  isPrivate: boolean;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  lastCommitSha: string | null;
  lastRepoUrl: string | null;
}

// In-Memory or persisted settings store
export const githubStore: GitHubConfigData = {
  token: process.env.GITHUB_TOKEN || '',
  repoOwner: '',
  repoName: 'coinzone-platform',
  branch: 'main',
  isPrivate: false,
  autoSyncEnabled: false,
  lastSyncAt: null,
  lastSyncStatus: null,
  lastCommitSha: null,
  lastRepoUrl: null,
};

const IGNORED_DIRS = new Set([
  'node_modules',
  'dist',
  '.git',
  '.vscode',
  '.idea',
  'server.js',
  '.DS_Store',
]);

const IGNORED_EXTS = new Set([
  '.log',
  '.lock',
  '.tmp',
]);

// Helper: Recursively walk project directory
export function getProjectFiles(dir: string, baseDir: string = dir): { relativePath: string; absolutePath: string }[] {
  let results: { relativePath: string; absolutePath: string }[] = [];
  const list = fs.readdirSync(dir);

  for (const file of list) {
    if (IGNORED_DIRS.has(file)) continue;
    const fullPath = path.join(dir, file);
    const stat = fs.statSync(fullPath);

    if (stat.isDirectory()) {
      results = results.concat(getProjectFiles(fullPath, baseDir));
    } else {
      const ext = path.extname(file);
      if (IGNORED_EXTS.has(ext)) continue;
      // Skip large node files or binary logs
      if (stat.size > 8 * 1024 * 1024) continue; // max 8MB per file
      const relativePath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
      results.push({ relativePath, absolutePath: fullPath });
    }
  }

  return results;
}

// 1. Test GitHub Token
export async function testGitHubAuth(token: string) {
  const cleanToken = token.trim();
  const res = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: `Bearer ${cleanToken}`,
      Accept: 'application/vnd.github+json',
      'User-Agent': 'COINZONE-Applet',
    },
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.message || `خطای احراز هویت گیت‌هاب (کد وضعیت ${res.status})`);
  }

  const data = await res.json();
  const scopesHeader = res.headers.get('x-oauth-scopes') || '';
  const scopes = scopesHeader.split(',').map((s) => s.trim()).filter(Boolean);

  const repos = await getUserRepositories(cleanToken);

  return {
    valid: true,
    login: data.login,
    name: data.name || data.login,
    avatarUrl: data.avatar_url,
    publicRepos: data.public_repos,
    scopes,
    repos,
  };
}

// 1.5 Get User's Accessible Repositories
export async function getUserRepositories(token: string) {
  const cleanToken = token.trim();
  try {
    const res = await fetch('https://api.github.com/user/repos?per_page=100&sort=updated&affiliation=owner,collaborator,organization_member', {
      headers: {
        Authorization: `Bearer ${cleanToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'COINZONE-Applet',
      },
    });
    if (!res.ok) return [];
    const repos = await res.json();
    if (!Array.isArray(repos)) return [];
    return repos.map((r: any) => ({
      name: r.name,
      fullName: r.full_name,
      isPrivate: r.private,
      htmlUrl: r.html_url,
      defaultBranch: r.default_branch || 'main',
      updatedAt: r.updated_at,
    }));
  } catch {
    return [];
  }
}

// 2. Upload and Sync Complete Project to GitHub
export async function syncProjectToGitHub(options: {
  token: string;
  repoOwner?: string;
  repoName: string;
  branch?: string;
  isPrivate?: boolean;
  commitMessage?: string;
  projectRootDir: string;
}) {
  const token = options.token.trim();
  const branch = options.branch || 'main';
  const commitMsg = options.commitMessage || `Auto-Sync: COINZONE Platform v1.0 (${new Date().toLocaleString('fa-IR')})`;

  const headers = {
    Authorization: `Bearer ${token}`,
    Accept: 'application/vnd.github+json',
    'User-Agent': 'COINZONE-Applet',
    'Content-Type': 'application/json',
  };

  // Step 1: Verify token & get authenticated username
  const authUser = await testGitHubAuth(token);
  const owner = options.repoOwner?.trim() || authUser.login;
  const repo = options.repoName.trim();

  // Step 2: Check if repository exists; if not, attempt to create it!
  const checkRepoRes = await fetch(`https://api.github.com/repos/${owner}/${repo}`, { headers });
  let repoData: any;

  if (checkRepoRes.status === 404) {
    // Determine whether to create under user or org
    const isOrg = owner.toLowerCase() !== authUser.login.toLowerCase();
    const createUrl = isOrg
      ? `https://api.github.com/orgs/${owner}/repos`
      : 'https://api.github.com/user/repos';

    const createRepoRes = await fetch(createUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        name: repo,
        private: options.isPrivate ?? false,
        description: 'COINZONE Gaming Rewards Platform - Full Stack Counter-Strike aesthetic, 5 games, TF2 Mann Co Key shop, Cloudflare ready',
        auto_init: true,
      }),
    });

    if (!createRepoRes.ok) {
      const err = await createRepoRes.json().catch(() => ({}));
      const errMsg = err.message || createRepoRes.statusText;

      if (errMsg.includes('Resource not accessible') || createRepoRes.status === 403 || createRepoRes.status === 404) {
        throw new Error(
          `مخزن "${repo}" در گیت‌هاب یافت نشد و توکن دسترسی شما اجازه ساخت مستقیم مخزن جدید را ندارد (${errMsg}).\n` +
          `✅ راه حل سریع: ابتدا وارد لینک https://github.com/new شوید و یک مخزن با نام "${repo}" بسازید، سپس مجدداً روی دکمه «آپلود و پوش فوری» کلیک کنید.\n` +
          `(یا در صفحه توکن‌های گیت‌هاب از نوع Tokens (classic) با تیک گزینه repo استفاده کنید).`
        );
      }
      throw new Error(`خطا در ایجاد مخزن در گیت‌هاب: ${errMsg}`);
    }

    repoData = await createRepoRes.json();
    await new Promise((r) => setTimeout(r, 1500));
  } else if (!checkRepoRes.ok) {
    const err = await checkRepoRes.json().catch(() => ({}));
    throw new Error(`خطا در دسترسی به مخزن ${owner}/${repo}: ${err.message || checkRepoRes.statusText}`);
  } else {
    repoData = await checkRepoRes.json();
  }

  // Step 3: Get default branch reference or target branch
  let parentCommitSha: string | null = null;
  const refRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${branch}`, { headers });

  if (refRes.ok) {
    const refData = await refRes.json();
    parentCommitSha = refData.object.sha;
  } else {
    // Try to get default branch (e.g. master or main)
    const defaultBranch = repoData.default_branch || 'main';
    const defRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/ref/heads/${defaultBranch}`, { headers });
    if (defRefRes.ok) {
      const defRefData = await defRefRes.json();
      parentCommitSha = defRefData.object.sha;
    } else {
      // Create initial commit via contents API if empty
      const initFileRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/contents/README.md`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({
          message: 'Initial commit: COINZONE Repository',
          content: Buffer.from('# COINZONE Gaming Rewards Platform\n\nProduction-ready gaming rewards platform with TF2 Mann Co keys.').toString('base64'),
        }),
      });
      if (initFileRes.ok) {
        const initData = await initFileRes.json();
        parentCommitSha = initData.commit.sha;
      }
    }
  }

  // Step 4: Collect all files to push
  const files = getProjectFiles(options.projectRootDir);
  if (files.length === 0) {
    throw new Error('هیچ فایلی برای ارسال به مخزن یافت نشد.');
  }

  // Step 5: Upload Blobs in parallel chunks
  const treeEntries: { path: string; mode: string; type: string; sha: string }[] = [];
  const chunkSize = 5;

  for (let i = 0; i < files.length; i += chunkSize) {
    const chunk = files.slice(i, i + chunkSize);
    await Promise.all(
      chunk.map(async (file) => {
        const fileBuffer = fs.readFileSync(file.absolutePath);
        const base64Content = fileBuffer.toString('base64');

        const blobRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/blobs`, {
          method: 'POST',
          headers,
          body: JSON.stringify({
            content: base64Content,
            encoding: 'base64',
          }),
        });

        if (!blobRes.ok) {
          const err = await blobRes.json().catch(() => ({}));
          throw new Error(`خطا در آپلود فایل ${file.relativePath}: ${err.message || blobRes.statusText}`);
        }

        const blobData = await blobRes.json();
        treeEntries.push({
          path: file.relativePath,
          mode: '100644',
          type: 'blob',
          sha: blobData.sha,
        });
      })
    );
  }

  // Step 6: Create Git Tree
  const treePayload: any = {
    tree: treeEntries,
  };
  // Only provide base_tree if parentCommit exists
  if (parentCommitSha) {
    const parentCommitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits/${parentCommitSha}`, { headers });
    if (parentCommitRes.ok) {
      const pData = await parentCommitRes.json();
      treePayload.base_tree = pData.tree.sha;
    }
  }

  const treeRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/trees`, {
    method: 'POST',
    headers,
    body: JSON.stringify(treePayload),
  });

  if (!treeRes.ok) {
    const err = await treeRes.json().catch(() => ({}));
    throw new Error(`خطا در ساخت درخت گیت: ${err.message || treeRes.statusText}`);
  }
  const treeData = await treeRes.json();

  // Step 7: Create Commit
  const commitPayload: any = {
    message: commitMsg,
    tree: treeData.sha,
    parents: parentCommitSha ? [parentCommitSha] : [],
  };

  const commitRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/commits`, {
    method: 'POST',
    headers,
    body: JSON.stringify(commitPayload),
  });

  if (!commitRes.ok) {
    const err = await commitRes.json().catch(() => ({}));
    throw new Error(`خطا در ایجاد کامیت گیت: ${err.message || commitRes.statusText}`);
  }
  const commitData = await commitRes.json();

  // Step 8: Update or Create Ref
  const updateRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs/heads/${branch}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({
      sha: commitData.sha,
      force: true,
    }),
  });

  if (!updateRefRes.ok) {
    // If ref didn't exist, create it
    const createRefRes = await fetch(`https://api.github.com/repos/${owner}/${repo}/git/refs`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        ref: `refs/heads/${branch}`,
        sha: commitData.sha,
      }),
    });

    if (!createRefRes.ok) {
      const err = await createRefRes.json().catch(() => ({}));
      throw new Error(`خطا در به‌روزرسانی شاخه ${branch}: ${err.message || createRefRes.statusText}`);
    }
  }

  const finalRepoUrl = `https://github.com/${owner}/${repo}`;

  // Update store
  githubStore.token = token;
  githubStore.repoOwner = owner;
  githubStore.repoName = repo;
  githubStore.branch = branch;
  githubStore.lastSyncAt = new Date().toISOString();
  githubStore.lastSyncStatus = 'SUCCESS';
  githubStore.lastCommitSha = commitData.sha;
  githubStore.lastRepoUrl = finalRepoUrl;

  return {
    success: true,
    repoUrl: finalRepoUrl,
    commitSha: commitData.sha,
    commitMessage: commitMsg,
    uploadedFilesCount: treeEntries.length,
    timestamp: new Date().toISOString(),
  };
}
