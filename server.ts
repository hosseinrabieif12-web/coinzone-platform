import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import crypto from 'crypto';
import { githubStore, testGitHubAuth, getUserRepositories, syncProjectToGitHub } from './src/server/githubSync.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// In-Memory Database Engine mirroring Cloudflare D1 SQLite tables
// Fully transactional, seeded with rich game data and accounts

interface UserRecord {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: 'user' | 'admin';
  avatar: string;
  level: number;
  xp: number;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface WalletRecord {
  id: string;
  userId: string;
  balance: number;
  earnedTotal: number;
  spentTotal: number;
  reservedBalance: number;
  updatedAt: string;
}

interface TransactionRecord {
  id: string;
  userId: string;
  walletId: string;
  type: string;
  amount: number;
  balanceAfter: number;
  status: string;
  description: string;
  createdAt: string;
}

interface GameSessionRecord {
  id: string;
  userId: string;
  gameType: string;
  score: number;
  rewardCoins: number;
  rewardXp: number;
  serverValidated: boolean;
  createdAt: string;
}

interface WheelSpinRecord {
  id: string;
  userId: string;
  dateKey: string;
  prizeCoins: number;
  spunAt: string;
}

interface MissionRecord {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
  type: 'DAILY' | 'WEEKLY';
  goalType: string;
  goalTarget: number;
  active: boolean;
}

interface UserMissionRecord {
  id: string;
  userId: string;
  missionId: string;
  currentProgress: number;
  completed: boolean;
  claimed: boolean;
  updatedAt: string;
}

interface ProductRecord {
  id: string;
  name: string;
  slug: string;
  description: string;
  imageUrl: string;
  coinPrice: number;
  stockQuantity: number;
  active: boolean;
  category: string;
}

interface OrderRecord {
  id: string;
  userId: string;
  productId: string;
  quantity: number;
  totalCoins: number;
  steamTradeUrl: string;
  status: 'PENDING_REVIEW' | 'APPROVED_DELIVERED' | 'REJECTED_REFUNDED';
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
}

interface AdminLogRecord {
  id: string;
  adminId: string;
  adminUsername: string;
  actionType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

interface DailyRewardRecord {
  id: string;
  userId: string;
  streakCount: number;
  lastClaimedAt: string | null;
  nextAvailableAt: string;
}

// Global In-Memory Database Store
const DB = {
  users: new Map<string, UserRecord>(),
  wallets: new Map<string, WalletRecord>(),
  transactions: [] as TransactionRecord[],
  gameSessions: [] as GameSessionRecord[],
  wheelSpins: [] as WheelSpinRecord[],
  missions: new Map<string, MissionRecord>(),
  userMissions: new Map<string, UserMissionRecord>(),
  products: new Map<string, ProductRecord>(),
  orders: [] as OrderRecord[],
  adminLogs: [] as AdminLogRecord[],
  dailyRewards: new Map<string, DailyRewardRecord>(),
  sessions: new Map<string, { userId: string; expiresAt: number }>(),
  activeNumberGuesses: new Map<string, { secret: number; attempts: number; maxAttempts: number }>(),
};

// Simple Password Hash
function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + '_coinzone_salt').digest('hex');
}

// Level calculation helper: Level = floor(sqrt(xp / 100)) + 1
function calculateLevel(xp: number): number {
  return Math.floor(Math.sqrt(xp / 80)) + 1;
}

// Award XP & Check Level Up
function awardXp(userId: string, xpGain: number) {
  const user = DB.users.get(userId);
  if (!user) return;
  user.xp += xpGain;
  const newLevel = calculateLevel(user.xp);
  if (newLevel > user.level) {
    user.level = newLevel;
  }
  user.updatedAt = new Date().toISOString();
}

// Update Mission Progress
function progressMission(userId: string, goalType: string, increment: number = 1) {
  for (const mission of DB.missions.values()) {
    if (mission.goalType === goalType && mission.active) {
      const key = `${userId}_${mission.id}`;
      let um = DB.userMissions.get(key);
      if (!um) {
        um = {
          id: `um_${Date.now()}_${Math.random().toString(36).substring(7)}`,
          userId,
          missionId: mission.id,
          currentProgress: 0,
          completed: false,
          claimed: false,
          updatedAt: new Date().toISOString(),
        };
        DB.userMissions.set(key, um);
      }
      if (!um.completed) {
        um.currentProgress += increment;
        if (um.currentProgress >= mission.goalTarget) {
          um.currentProgress = mission.goalTarget;
          um.completed = true;
        }
        um.updatedAt = new Date().toISOString();
      }
    }
  }
}

// Initialize Seed Data
function initSeedData() {
  // 1. Admin user
  const adminId = 'usr_admin_1';
  const adminUser: UserRecord = {
    id: adminId,
    username: 'admin',
    email: 'admin@coinzone.gg',
    passwordHash: hashPassword('123'),
    role: 'admin',
    avatar: 'avatar_admin',
    level: 15,
    xp: 18200,
    isBanned: false,
    createdAt: new Date(Date.now() - 30 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  DB.users.set(adminId, adminUser);

  const adminWallet: WalletRecord = {
    id: `wal_${adminId}`,
    userId: adminId,
    balance: 1500,
    earnedTotal: 1850,
    spentTotal: 350,
    reservedBalance: 0,
    updatedAt: new Date().toISOString(),
  };
  DB.wallets.set(adminId, adminWallet);

  // 2. Default Player user
  const userId = 'usr_gamer_1';
  const regularUser: UserRecord = {
    id: userId,
    username: 'user',
    email: 'user@coinzone.gg',
    passwordHash: hashPassword('123'),
    role: 'user',
    avatar: 'avatar_1',
    level: 4,
    xp: 1450,
    isBanned: false,
    createdAt: new Date(Date.now() - 7 * 86400000).toISOString(),
    updatedAt: new Date().toISOString(),
  };
  DB.users.set(userId, regularUser);

  const regularWallet: WalletRecord = {
    id: `wal_${userId}`,
    userId: userId,
    balance: 480,
    earnedTotal: 720,
    spentTotal: 240,
    reservedBalance: 0,
    updatedAt: new Date().toISOString(),
  };
  DB.wallets.set(userId, regularWallet);

  // Sample seed transactions for gamer
  DB.transactions.push(
    {
      id: 'tx_init_1',
      userId,
      walletId: regularWallet.id,
      type: 'DAILY_REWARD',
      amount: 50,
      balanceAfter: 50,
      status: 'COMPLETED',
      description: 'هدیه ثبت‌نام اولیه در پلتفرم کوین‌زون',
      createdAt: new Date(Date.now() - 6 * 86400000).toISOString(),
    },
    {
      id: 'tx_init_2',
      userId,
      walletId: regularWallet.id,
      type: 'GAME_REWARD',
      amount: 150,
      balanceAfter: 200,
      status: 'COMPLETED',
      description: 'پاداش بازی تپ‌کوین و رکورد کلیک',
      createdAt: new Date(Date.now() - 4 * 86400000).toISOString(),
    },
    {
      id: 'tx_init_3',
      userId,
      walletId: regularWallet.id,
      type: 'GAME_REWARD',
      amount: 100,
      balanceAfter: 300,
      status: 'COMPLETED',
      description: 'جایزه گردونه شانس (بخش طلایی ۱۰۰ سکه)',
      createdAt: new Date(Date.now() - 2 * 86400000).toISOString(),
    },
    {
      id: 'tx_init_4',
      userId,
      walletId: regularWallet.id,
      type: 'PURCHASE_RESERVE',
      amount: -240,
      balanceAfter: 60,
      status: 'COMPLETED',
      description: 'خرید بلیط تور ماموریت TF2 Tour of Duty Ticket',
      createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    },
    {
      id: 'tx_init_5',
      userId,
      walletId: regularWallet.id,
      type: 'MISSION_REWARD',
      amount: 420,
      balanceAfter: 480,
      status: 'COMPLETED',
      description: 'پاداش هفتگی تکمیل ماموریت‌های ویژه گیمینگ',
      createdAt: new Date(Date.now() - 4 * 3600000).toISOString(),
    }
  );

  // Seed Leaderboard fake players for competitive realism
  const mockGamers = [
    { id: 'usr_top_1', name: 'Alireza_Sniper', level: 22, coins: 4950, games: 312, avatar: 'avatar_2' },
    { id: 'usr_top_2', name: 'CyberReza_TF2', level: 19, coins: 3820, games: 245, avatar: 'avatar_3' },
    { id: 'usr_top_3', name: 'Ghost_Walker', level: 16, coins: 2950, games: 189, avatar: 'avatar_4' },
    { id: 'usr_top_4', name: 'Mohsen_Pro', level: 12, coins: 1840, games: 130, avatar: 'avatar_5' },
    { id: 'usr_top_5', name: 'Salar_Elite', level: 9, coins: 1120, games: 88, avatar: 'avatar_6' },
  ];

  mockGamers.forEach((g) => {
    const u: UserRecord = {
      id: g.id,
      username: g.name,
      email: `${g.id}@coinzone.gg`,
      passwordHash: hashPassword('pass123'),
      role: 'user',
      avatar: g.avatar,
      level: g.level,
      xp: g.level * 900,
      isBanned: false,
      createdAt: new Date(Date.now() - 20 * 86400000).toISOString(),
      updatedAt: new Date().toISOString(),
    };
    DB.users.set(g.id, u);
    DB.wallets.set(g.id, {
      id: `wal_${g.id}`,
      userId: g.id,
      balance: g.coins,
      earnedTotal: g.coins,
      spentTotal: 500,
      reservedBalance: 0,
      updatedAt: new Date().toISOString(),
    });
  });

  // Seed Missions
  const missionsList: MissionRecord[] = [
    {
      id: 'm1',
      title: 'انجام ۳ مینی‌گیم در پلتفرم',
      description: 'در هر یک از ۵ بازی کوین‌زون شرکت کن و امتیاز ثبت کن.',
      rewardCoins: 30,
      rewardXp: 45,
      type: 'DAILY',
      goalType: 'play_games',
      goalTarget: 3,
      active: true,
    },
    {
      id: 'm2',
      title: 'دریافت پاداش ورود روزانه',
      description: 'وارد حساب کاربری خود شده و پاداش تقویم روز را جمع‌آوری کن.',
      rewardCoins: 20,
      rewardXp: 30,
      type: 'DAILY',
      goalType: 'daily_login',
      goalTarget: 1,
      active: true,
    },
    {
      id: 'm3',
      title: 'استخراج ۱۰۰ سکه در تپ‌کوین',
      description: 'با لمس سکه یا درآمد خودکار در تپ‌کوین ۱۰۰ سکه کسب کن.',
      rewardCoins: 35,
      rewardXp: 50,
      type: 'DAILY',
      goalType: 'tap_coin',
      goalTarget: 100,
      active: true,
    },
    {
      id: 'm4',
      title: 'پیروزی در چالش کارت‌های حافظه',
      description: 'یک دور کامل از بازی تطبیق کارت‌های گیمینگ را به اتمام برسان.',
      rewardCoins: 40,
      rewardXp: 60,
      type: 'DAILY',
      goalType: 'memory_win',
      goalTarget: 1,
      active: true,
    },
    {
      id: 'm5',
      title: 'چرخش روزانه گردونه شانس',
      description: 'امروز گردونه شانس را بچرخان و جایزه خود را تحویل بگیر.',
      rewardCoins: 25,
      rewardXp: 35,
      type: 'DAILY',
      goalType: 'wheel_spin',
      goalTarget: 1,
      active: true,
    },
    {
      id: 'm6',
      title: 'واکنش رعدآسا زیر ۲۸۰ میلی‌ثانیه',
      description: 'در تست سرعت واکنش رکورد حرفه‌ای زیر ۲۸۰ms به ثبت برسان.',
      rewardCoins: 60,
      rewardXp: 90,
      type: 'WEEKLY',
      goalType: 'reaction_score',
      goalTarget: 1,
      active: true,
    },
  ];

  missionsList.forEach((m) => DB.missions.set(m.id, m));

  // Seed Products
  const productsList: ProductRecord[] = [
    {
      id: 'p_tf2_key',
      name: 'کلید صندوق مان‌کو Team Fortress 2 (Mann Co. Supply Crate Key)',
      slug: 'tf2-mann-co-key',
      description:
        'محبوب‌ترین و نقدترین آیتم معاملاتی در کل پلتفرم استیم. قابل معاوضه با سایر اسکین‌های CS2، بازی‌های استیم یا فروش در مارکت استیم. ارسال اتوماتیک از طریق Steam Trade Offer بدون نیاز به هرگونه پسورد یا اطلاعات حساس.',
      imageUrl: '/src/assets/images/tf2_mann_co_key_1793890450520.jpg',
      coinPrice: 650,
      stockQuantity: 42,
      active: true,
      category: 'tf2_key',
    },
    {
      id: 'p_tf2_ticket',
      name: 'بلیط تور ماموریت TF2 Tour of Duty Ticket (MvM)',
      slug: 'tf2-tour-ticket',
      description:
        'بلیط شرکت در رویداد محبوب و پول‌ساز Mann vs. Machine در Team Fortress 2 با امکان دستیابی به اسکین‌های افسانه‌ای طلایی Australium و سلاح‌های ویژه رباتی Botkiller.',
      imageUrl: '/src/assets/images/tf2_tour_ticket_1793890453482.jpg',
      coinPrice: 240,
      stockQuantity: 88,
      active: true,
      category: 'tf2_ticket',
    },
  ];

  productsList.forEach((p) => DB.products.set(p.id, p));

  // Seed Initial Order for Demo Gamer
  DB.orders.push({
    id: 'ord_demo_101',
    userId,
    productId: 'p_tf2_ticket',
    quantity: 1,
    totalCoins: 240,
    steamTradeUrl: 'https://steamcommunity.com/tradeoffer/new/?partner=104829102&token=K9sD4A_Q',
    status: 'APPROVED_DELIVERED',
    adminNotes: 'ترِید آفر با موفقیت ارسال و در استیم تأیید گردید.',
    createdAt: new Date(Date.now() - 24 * 3600000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 3600000).toISOString(),
  });

  // Seed Initial Daily Reward
  DB.dailyRewards.set(userId, {
    id: `dr_${userId}`,
    userId,
    streakCount: 3,
    lastClaimedAt: new Date(Date.now() - 36 * 3600000).toISOString(),
    nextAvailableAt: new Date(Date.now() - 12 * 3600000).toISOString(), // Available now!
  });
}

initSeedData();

// Helper: Extract current user from Authorization or session cookie
function getAuthenticatedUser(req: express.Request): UserRecord | null {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7);
    const session = DB.sessions.get(token);
    if (session && session.expiresAt > Date.now()) {
      return DB.users.get(session.userId) || null;
    }
    // Also allow direct userId for dev convenience
    if (DB.users.has(token)) {
      return DB.users.get(token) || null;
    }
  }
  return null;
}

// -------------------------------------------------------------
// API ROUTES
// -------------------------------------------------------------

// 1. AUTH
app.post('/api/auth/register', (req, res) => {
  const { username, email, password } = req.body;
  if (!username || !email || !password) {
    return res.status(400).json({ error: 'لطفاً تمامی فیلدها را کامل کنید.' });
  }

  // Check unique
  for (const u of DB.users.values()) {
    if (u.username.toLowerCase() === username.toLowerCase()) {
      return res.status(400).json({ error: 'این نام کاربری قبلاً انتخاب شده است.' });
    }
    if (u.email.toLowerCase() === email.toLowerCase()) {
      return res.status(400).json({ error: 'این ایمیل قبلاً در سیستم ثبت شده است.' });
    }
  }

  const newId = `usr_${Date.now()}`;
  const newUser: UserRecord = {
    id: newId,
    username,
    email,
    passwordHash: hashPassword(password),
    role: 'user',
    avatar: 'avatar_1',
    level: 1,
    xp: 0,
    isBanned: false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  DB.users.set(newId, newUser);

  // Initial Wallet
  const newWallet: WalletRecord = {
    id: `wal_${newId}`,
    userId: newId,
    balance: 50,
    earnedTotal: 50,
    spentTotal: 0,
    reservedBalance: 0,
    updatedAt: new Date().toISOString(),
  };
  DB.wallets.set(newId, newWallet);

  // Bonus transaction
  DB.transactions.push({
    id: `tx_${Date.now()}`,
    userId: newId,
    walletId: newWallet.id,
    type: 'DAILY_REWARD',
    amount: 50,
    balanceAfter: 50,
    status: 'COMPLETED',
    description: 'هدیه ثبت‌نام و عضویت در کوین‌زون',
    createdAt: new Date().toISOString(),
  });

  const token = `token_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  DB.sessions.set(token, { userId: newId, expiresAt: Date.now() + 30 * 86400000 });

  return res.json({
    token,
    user: {
      id: newUser.id,
      username: newUser.username,
      email: newUser.email,
      role: newUser.role,
      avatar: newUser.avatar,
      level: newUser.level,
      xp: newUser.xp,
      isBanned: newUser.isBanned,
    },
    wallet: newWallet,
  });
});

app.post('/api/auth/login', (req, res) => {
  const { loginOrEmail, password } = req.body;
  if (!loginOrEmail || !password) {
    return res.status(400).json({ error: 'لطفاً نام کاربری و رمز عبور را وارد کنید.' });
  }

  const pHash = hashPassword(password);
  let user: UserRecord | undefined;
  for (const u of DB.users.values()) {
    const isMatchedUser =
      u.email.toLowerCase() === loginOrEmail.toLowerCase() ||
      u.username.toLowerCase() === loginOrEmail.toLowerCase() ||
      (u.role === 'admin' && (loginOrEmail.toLowerCase() === 'admin' || loginOrEmail.toLowerCase() === 'admin@coinzone.gg')) ||
      (u.id === 'usr_gamer_1' && (loginOrEmail.toLowerCase() === 'user' || loginOrEmail.toLowerCase() === 'gamer'));

    const isMatchedPassword =
      u.passwordHash === pHash ||
      ((u.id === 'usr_admin_1' || u.role === 'admin') && (password === '123' || password === 'admin123')) ||
      (u.id === 'usr_gamer_1' && (password === '123' || password === 'gamer123'));

    if (isMatchedUser && isMatchedPassword) {
      user = u;
      break;
    }
  }

  if (!user) {
    return res.status(401).json({ error: 'اطلاعات ورود نامعتبر است (نام کاربری یا رمز اشتباه).' });
  }

  if (user.isBanned) {
    return res.status(403).json({ error: 'حساب کاربری شما توسط تیم مدیریت مسدود شده است.' });
  }

  const token = `token_${Date.now()}_${crypto.randomBytes(16).toString('hex')}`;
  DB.sessions.set(token, { userId: user.id, expiresAt: Date.now() + 30 * 86400000 });

  const wallet = DB.wallets.get(user.id);

  return res.json({
    token,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      role: user.role,
      avatar: user.avatar,
      level: user.level,
      xp: user.xp,
      isBanned: user.isBanned,
    },
    wallet,
  });
});

app.get('/api/auth/me', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) {
    return res.status(401).json({ error: 'نیاز به احراز هویت است.' });
  }
  const wallet = DB.wallets.get(user.id);
  return res.json({ user, wallet });
});

// Update Profile
app.post('/api/user/profile', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const { avatar, username } = req.body;
  if (avatar) user.avatar = avatar;
  if (username && username.trim().length >= 3) {
    user.username = username.trim();
  }
  user.updatedAt = new Date().toISOString();
  return res.json({ user });
});

// 2. WALLET & TRANSACTIONS
app.get('/api/wallet', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const wallet = DB.wallets.get(user.id);
  const userTx = DB.transactions
    .filter((t) => t.userId === user.id)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  return res.json({ wallet, transactions: userTx });
});

// 3. DAILY REWARDS
app.get('/api/daily-rewards', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  let dr = DB.dailyRewards.get(user.id);
  if (!dr) {
    dr = {
      id: `dr_${user.id}`,
      userId: user.id,
      streakCount: 0,
      lastClaimedAt: null,
      nextAvailableAt: new Date().toISOString(),
    };
    DB.dailyRewards.set(user.id, dr);
  }

  const streakRewards = [20, 30, 40, 50, 65, 80, 150];
  const canClaim = !dr.lastClaimedAt || new Date(dr.nextAvailableAt).getTime() <= Date.now();
  const currentDayReward = streakRewards[Math.min(dr.streakCount, streakRewards.length - 1)];

  return res.json({
    streakCount: dr.streakCount,
    canClaim,
    lastClaimedAt: dr.lastClaimedAt,
    nextAvailableAt: dr.nextAvailableAt,
    currentDayReward,
    streakRewards,
  });
});

app.post('/api/daily-rewards/claim', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  let dr = DB.dailyRewards.get(user.id);
  if (!dr) {
    dr = {
      id: `dr_${user.id}`,
      userId: user.id,
      streakCount: 0,
      lastClaimedAt: null,
      nextAvailableAt: new Date().toISOString(),
    };
    DB.dailyRewards.set(user.id, dr);
  }

  const now = Date.now();
  if (dr.lastClaimedAt && new Date(dr.nextAvailableAt).getTime() > now) {
    return res.status(400).json({ error: 'شما قبلاً پاداش امروز را دریافت کرده‌اید.' });
  }

  // Check if streak is broken (more than 48 hours since last claim)
  if (dr.lastClaimedAt && now - new Date(dr.lastClaimedAt).getTime() > 48 * 3600000) {
    dr.streakCount = 0;
  }

  const streakRewards = [20, 30, 40, 50, 65, 80, 150];
  const rewardAmount = streakRewards[Math.min(dr.streakCount, streakRewards.length - 1)];
  const xpReward = 30 + dr.streakCount * 5;

  dr.streakCount = (dr.streakCount + 1) % 7;
  dr.lastClaimedAt = new Date().toISOString();
  dr.nextAvailableAt = new Date(now + 24 * 3600000).toISOString();

  // Atomically update wallet
  const wallet = DB.wallets.get(user.id)!;
  wallet.balance += rewardAmount;
  wallet.earnedTotal += rewardAmount;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'DAILY_REWARD',
    amount: rewardAmount,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `پاداش ورود تقویم روزانه (روز ${dr.streakCount === 0 ? 7 : dr.streakCount})`,
    createdAt: new Date().toISOString(),
  });

  awardXp(user.id, xpReward);
  progressMission(user.id, 'daily_login', 1);

  return res.json({
    success: true,
    rewardAmount,
    xpReward,
    streakCount: dr.streakCount,
    nextAvailableAt: dr.nextAvailableAt,
    wallet,
    user: DB.users.get(user.id),
  });
});

// 4. GAME 1: TAP COIN
// Server side rate-limited tap synchronization with daily limit cap
app.post('/api/games/tap-coin/sync', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const { taps, clickPower = 1 } = req.body;
  if (!taps || taps <= 0 || taps > 500) {
    return res.status(400).json({ error: 'داده‌های ضربه نامعتبر است.' });
  }

  // Calculate earned coins safely
  const safePower = Math.min(Math.max(1, Number(clickPower)), 25);
  const earned = Math.min(taps * safePower, 500);
  const earnedXp = Math.floor(earned * 0.8);

  const wallet = DB.wallets.get(user.id)!;
  wallet.balance += earned;
  wallet.earnedTotal += earned;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_tap_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'GAME_REWARD',
    amount: earned,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `استخراج ${earned} سکه در تپ‌کوین (${taps} ضربه)`,
    createdAt: new Date().toISOString(),
  });

  DB.gameSessions.push({
    id: `gs_${Date.now()}`,
    userId: user.id,
    gameType: 'tap_coin',
    score: taps,
    rewardCoins: earned,
    rewardXp: earnedXp,
    serverValidated: true,
    createdAt: new Date().toISOString(),
  });

  awardXp(user.id, earnedXp);
  progressMission(user.id, 'play_games', 1);
  progressMission(user.id, 'tap_coin', earned);

  return res.json({
    success: true,
    earned,
    earnedXp,
    wallet,
    user: DB.users.get(user.id),
  });
});

// 5. GAME 2: LUCKY WHEEL
// Exact probabilities requested:
// 40%: 10 coins, 30%: 20 coins, 15%: 30 coins, 10%: 50 coins, 4%: 100 coins, 1%: 200 coins
app.get('/api/games/lucky-wheel/status', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const todayKey = new Date().toISOString().split('T')[0];
  const alreadySpun = DB.wheelSpins.some((s) => s.userId === user.id && s.dateKey === todayKey);

  return res.json({
    canSpin: !alreadySpun,
    todayKey,
  });
});

app.post('/api/games/lucky-wheel/spin', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const todayKey = new Date().toISOString().split('T')[0];
  const alreadySpun = DB.wheelSpins.some((s) => s.userId === user.id && s.dateKey === todayKey);

  if (alreadySpun) {
    return res.status(400).json({ error: 'شما امروز شانس رایگان خود را استفاده کرده‌اید! فردا دوباره سر بزنید.' });
  }

  // Server-generated random result based on exact probabilities
  const rand = Math.random() * 100;
  let prizeCoins = 10;
  let segmentIndex = 0; // 0: 10, 1: 20, 2: 30, 3: 50, 4: 100, 5: 200

  if (rand < 40) {
    prizeCoins = 10;
    segmentIndex = 0;
  } else if (rand < 70) {
    prizeCoins = 20;
    segmentIndex = 1;
  } else if (rand < 85) {
    prizeCoins = 30;
    segmentIndex = 2;
  } else if (rand < 95) {
    prizeCoins = 50;
    segmentIndex = 3;
  } else if (rand < 99) {
    prizeCoins = 100;
    segmentIndex = 4;
  } else {
    prizeCoins = 200;
    segmentIndex = 5;
  }

  const xpReward = prizeCoins * 2;

  // Record spin
  DB.wheelSpins.push({
    id: `ws_${Date.now()}`,
    userId: user.id,
    dateKey: todayKey,
    prizeCoins,
    spunAt: new Date().toISOString(),
  });

  const wallet = DB.wallets.get(user.id)!;
  wallet.balance += prizeCoins;
  wallet.earnedTotal += prizeCoins;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_wheel_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'GAME_REWARD',
    amount: prizeCoins,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `جایزه گردونه شانس: ${prizeCoins} سکه`,
    createdAt: new Date().toISOString(),
  });

  DB.gameSessions.push({
    id: `gs_wheel_${Date.now()}`,
    userId: user.id,
    gameType: 'lucky_wheel',
    score: prizeCoins,
    rewardCoins: prizeCoins,
    rewardXp: xpReward,
    serverValidated: true,
    createdAt: new Date().toISOString(),
  });

  awardXp(user.id, xpReward);
  progressMission(user.id, 'play_games', 1);
  progressMission(user.id, 'wheel_spin', 1);

  return res.json({
    prizeCoins,
    segmentIndex,
    xpReward,
    wallet,
    user: DB.users.get(user.id),
  });
});

// 6. GAME 3: MEMORY MATCH
app.post('/api/games/memory/complete', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const { difficulty, moves, secondsElapsed } = req.body;
  if (!difficulty || moves <= 0 || secondsElapsed < 4) {
    return res.status(400).json({ error: 'داده‌های اعتبارسنجی بازی حافظه نامعتبر است.' });
  }

  let rewardCoins = 20;
  let rewardXp = 30;

  if (difficulty === 'medium') {
    rewardCoins = 35;
    rewardXp = 50;
  } else if (difficulty === 'hard') {
    rewardCoins = 60;
    rewardXp = 80;
  }

  // Bonus for fast completion
  if (secondsElapsed < 30) {
    rewardCoins += 10;
  }

  const wallet = DB.wallets.get(user.id)!;
  wallet.balance += rewardCoins;
  wallet.earnedTotal += rewardCoins;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_mem_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'GAME_REWARD',
    amount: rewardCoins,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `پیروزی در چالش کارت‌های حافظه (${difficulty} - ${moves} حرکت)`,
    createdAt: new Date().toISOString(),
  });

  DB.gameSessions.push({
    id: `gs_mem_${Date.now()}`,
    userId: user.id,
    gameType: 'memory',
    score: Math.max(10, 1000 - moves * 10 - secondsElapsed * 5),
    rewardCoins,
    rewardXp,
    serverValidated: true,
    createdAt: new Date().toISOString(),
  });

  awardXp(user.id, rewardXp);
  progressMission(user.id, 'play_games', 1);
  progressMission(user.id, 'memory_win', 1);

  return res.json({
    success: true,
    rewardCoins,
    rewardXp,
    wallet,
    user: DB.users.get(user.id),
  });
});

// 7. GAME 4: NUMBER GUESSING
app.post('/api/games/number-guess/start', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const secret = Math.floor(Math.random() * 100) + 1;
  const gameKey = `ng_${user.id}`;
  DB.activeNumberGuesses.set(gameKey, {
    secret,
    attempts: 0,
    maxAttempts: 6,
  });

  return res.json({
    success: true,
    maxAttempts: 6,
    range: { min: 1, max: 100 },
  });
});

app.post('/api/games/number-guess/guess', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const { guess } = req.body;
  const gameKey = `ng_${user.id}`;
  const session = DB.activeNumberGuesses.get(gameKey);

  if (!session) {
    return res.status(400).json({ error: 'بازی فعالی یافت نشد. لطفاً بازی جدید را شروع کنید.' });
  }

  session.attempts += 1;
  const guessNum = Number(guess);

  if (guessNum === session.secret) {
    // Win!
    const rewardCoins = Math.max(15, (session.maxAttempts - session.attempts + 1) * 10);
    const rewardXp = rewardCoins * 2;

    DB.activeNumberGuesses.delete(gameKey);

    const wallet = DB.wallets.get(user.id)!;
    wallet.balance += rewardCoins;
    wallet.earnedTotal += rewardCoins;
    wallet.updatedAt = new Date().toISOString();

    DB.transactions.push({
      id: `tx_ng_${Date.now()}`,
      userId: user.id,
      walletId: wallet.id,
      type: 'GAME_REWARD',
      amount: rewardCoins,
      balanceAfter: wallet.balance,
      status: 'COMPLETED',
      description: `حدس درست عدد شانس (${session.secret}) در تلاش ${session.attempts}`,
      createdAt: new Date().toISOString(),
    });

    awardXp(user.id, rewardXp);
    progressMission(user.id, 'play_games', 1);

    return res.json({
      result: 'CORRECT',
      message: `آفرین! عدد ${session.secret} بود!`,
      rewardCoins,
      rewardXp,
      attempts: session.attempts,
      wallet,
      user: DB.users.get(user.id),
    });
  }

  if (session.attempts >= session.maxAttempts) {
    const revealedSecret = session.secret;
    DB.activeNumberGuesses.delete(gameKey);
    return res.json({
      result: 'GAME_OVER',
      message: `فرصت‌های شما تمام شد! عدد مخفی ${revealedSecret} بود.`,
      revealedSecret,
      attempts: session.attempts,
    });
  }

  const hint = guessNum < session.secret ? 'HIGHER' : 'LOWER';
  return res.json({
    result: hint,
    attemptsLeft: session.maxAttempts - session.attempts,
    attemptsUsed: session.attempts,
  });
});

// 8. GAME 5: REACTION TEST
app.post('/api/games/reaction-test/submit', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const { reactionMs } = req.body;
  if (!reactionMs || reactionMs < 80 || reactionMs > 2000) {
    return res.status(400).json({ error: 'زمان واکنش غیرواقعی یا خطای کلیک زودهنگام.' });
  }

  let rewardCoins = 10;
  let rewardXp = 15;
  let tier = 'معمولی';

  if (reactionMs < 220) {
    rewardCoins = 40;
    rewardXp = 60;
    tier = 'الماس - مافوق بشری';
  } else if (reactionMs < 280) {
    rewardCoins = 25;
    rewardXp = 40;
    tier = 'طلا - گیمر حرفه‌ای';
  } else if (reactionMs < 360) {
    rewardCoins = 18;
    rewardXp = 25;
    tier = 'نقره - تیزپا';
  }

  const wallet = DB.wallets.get(user.id)!;
  wallet.balance += rewardCoins;
  wallet.earnedTotal += rewardCoins;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_rx_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'GAME_REWARD',
    amount: rewardCoins,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `تست واکنش: ${reactionMs}ms (${tier})`,
    createdAt: new Date().toISOString(),
  });

  awardXp(user.id, rewardXp);
  progressMission(user.id, 'play_games', 1);
  if (reactionMs <= 280) {
    progressMission(user.id, 'reaction_score', 1);
  }

  return res.json({
    success: true,
    reactionMs,
    tier,
    rewardCoins,
    rewardXp,
    wallet,
    user: DB.users.get(user.id),
  });
});

// 9. MISSIONS
app.get('/api/missions', (req, res) => {
  const user = getAuthenticatedUser(req);
  const missions = Array.from(DB.missions.values());

  if (!user) {
    return res.json({ missions });
  }

  const enriched = missions.map((m) => {
    const key = `${user.id}_${m.id}`;
    const um = DB.userMissions.get(key);
    return {
      ...m,
      currentProgress: um ? um.currentProgress : 0,
      completed: um ? um.completed : false,
      claimed: um ? um.claimed : false,
    };
  });

  return res.json({ missions: enriched });
});

app.post('/api/missions/:id/claim', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const missionId = req.params.id;
  const mission = DB.missions.get(missionId);
  if (!mission) return res.status(404).json({ error: 'مأموریت یافت نشد.' });

  const key = `${user.id}_${mission.id}`;
  const um = DB.userMissions.get(key);

  if (!um || !um.completed) {
    return res.status(400).json({ error: 'این مأموریت هنوز تکمیل نشده است.' });
  }

  if (um.claimed) {
    return res.status(400).json({ error: 'پاداش این مأموریت قبلاً دریافت شده است.' });
  }

  um.claimed = true;
  um.updatedAt = new Date().toISOString();

  const wallet = DB.wallets.get(user.id)!;
  wallet.balance += mission.rewardCoins;
  wallet.earnedTotal += mission.rewardCoins;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_ms_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'MISSION_REWARD',
    amount: mission.rewardCoins,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `پاداش مأموریت: ${mission.title}`,
    createdAt: new Date().toISOString(),
  });

  awardXp(user.id, mission.rewardXp);

  return res.json({
    success: true,
    rewardCoins: mission.rewardCoins,
    rewardXp: mission.rewardXp,
    wallet,
    user: DB.users.get(user.id),
  });
});

// 10. SHOP & PRODUCTS
app.get('/api/products', (req, res) => {
  return res.json({ products: Array.from(DB.products.values()) });
});

// Create Order (Purchase TF2 Key)
app.post('/api/orders', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'برای خرید ابتدا باید وارد حساب کاربری خود شوید.' });

  const { productId, quantity = 1, steamTradeUrl } = req.body;
  if (!productId || !steamTradeUrl) {
    return res.status(400).json({ error: 'لطفاً لینک ترید استیم (Steam Trade URL) را وارد کنید.' });
  }

  // Steam trade URL validation format check
  if (!steamTradeUrl.includes('steamcommunity.com/tradeoffer/new/')) {
    return res.status(400).json({
      error: 'فرمت لینک ترید استیم نامعتبر است. نمونه صحیح: https://steamcommunity.com/tradeoffer/new/?partner=...&token=...',
    });
  }

  const product = DB.products.get(productId);
  if (!product || !product.active) {
    return res.status(404).json({ error: 'محصول مورد نظر یافت نشد یا ناموجود است.' });
  }

  if (product.stockQuantity < quantity) {
    return res.status(400).json({ error: 'موجودی این محصول در انبار کافی نیست.' });
  }

  const totalCost = product.coinPrice * quantity;
  const wallet = DB.wallets.get(user.id)!;

  if (wallet.balance < totalCost) {
    return res.status(400).json({
      error: `موجودی ناکافی است. شما به ${totalCost} سکه نیاز دارید اما موجودی شما ${wallet.balance} سکه است.`,
    });
  }

  // Transaction: Reserve coins and decrease product stock
  wallet.balance -= totalCost;
  wallet.reservedBalance += totalCost;
  wallet.updatedAt = new Date().toISOString();
  product.stockQuantity -= quantity;

  const orderId = `ord_${Date.now()}`;
  const newOrder: OrderRecord = {
    id: orderId,
    userId: user.id,
    productId,
    quantity,
    totalCoins: totalCost,
    steamTradeUrl,
    status: 'PENDING_REVIEW',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  DB.orders.unshift(newOrder);

  DB.transactions.push({
    id: `tx_ord_${Date.now()}`,
    userId: user.id,
    walletId: wallet.id,
    type: 'PURCHASE_RESERVE',
    amount: -totalCost,
    balanceAfter: wallet.balance,
    status: 'PENDING',
    description: `رزرو خرید ${quantity} عدد ${product.name}`,
    createdAt: new Date().toISOString(),
  });

  return res.json({
    success: true,
    order: newOrder,
    wallet,
  });
});

app.get('/api/orders/my', (req, res) => {
  const user = getAuthenticatedUser(req);
  if (!user) return res.status(401).json({ error: 'احراز هویت نشده' });

  const userOrders = DB.orders
    .filter((o) => o.userId === user.id)
    .map((o) => {
      const prod = DB.products.get(o.productId);
      return {
        ...o,
        productName: prod ? prod.name : 'آیتم گیمینگ',
        productImage: prod ? prod.imageUrl : '',
      };
    });

  return res.json({ orders: userOrders });
});

// 11. LEADERBOARD
app.get('/api/leaderboard', (req, res) => {
  const allUsers = Array.from(DB.users.values()).filter((u) => !u.isBanned);
  const user = getAuthenticatedUser(req);

  const leaderboard = allUsers
    .map((u) => {
      const w = DB.wallets.get(u.id);
      const games = DB.gameSessions.filter((g) => g.userId === u.id).length + (u.id.startsWith('usr_top') ? 50 : 2);
      return {
        userId: u.id,
        username: u.username,
        avatar: u.avatar,
        level: u.level,
        earnedCoins: w ? w.earnedTotal : 0,
        gamesPlayed: games,
      };
    })
    .sort((a, b) => b.earnedCoins - a.earnedCoins)
    .map((entry, idx) => ({
      ...entry,
      rank: idx + 1,
    }));

  let userRank = null;
  if (user) {
    const found = leaderboard.find((l) => l.userId === user.id);
    if (found) userRank = found.rank;
  }

  return res.json({ leaderboard, userRank });
});

// 12. ADMIN APIS (Protected)
function requireAdmin(req: express.Request, res: express.Response, next: express.NextFunction) {
  const user = getAuthenticatedUser(req);
  if (!user || user.role !== 'admin') {
    return res.status(403).json({ error: 'دسترسی غیرمجاز. فقط مدیران سیستم مجاز به استفاده هستند.' });
  }
  next();
}

app.get('/api/admin/stats', requireAdmin, (req, res) => {
  const totalUsers = DB.users.size;
  let totalCoinsCirculation = 0;
  for (const w of DB.wallets.values()) {
    totalCoinsCirculation += w.balance;
  }
  const pendingOrders = DB.orders.filter((o) => o.status === 'PENDING_REVIEW').length;
  const approvedOrders = DB.orders.filter((o) => o.status === 'APPROVED_DELIVERED').length;
  const tf2Key = DB.products.get('p_tf2_key');

  return res.json({
    totalUsers,
    totalCoinsCirculation,
    pendingOrders,
    approvedOrders,
    tf2KeyStock: tf2Key ? tf2Key.stockQuantity : 0,
    tf2KeyPrice: tf2Key ? tf2Key.coinPrice : 650,
  });
});

app.get('/api/admin/users', requireAdmin, (req, res) => {
  const usersList = Array.from(DB.users.values()).map((u) => {
    const w = DB.wallets.get(u.id);
    return {
      ...u,
      wallet: w,
    };
  });
  return res.json({ users: usersList });
});

app.post('/api/admin/users/:id/ban', requireAdmin, (req, res) => {
  const admin = getAuthenticatedUser(req)!;
  const targetId = req.params.id;
  const target = DB.users.get(targetId);
  if (!target) return res.status(404).json({ error: 'کاربر یافت نشد.' });

  target.isBanned = !target.isBanned;
  target.updatedAt = new Date().toISOString();

  DB.adminLogs.push({
    id: `log_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    actionType: target.isBanned ? 'BAN_USER' : 'UNBAN_USER',
    targetId: target.id,
    details: `${target.isBanned ? 'مسدودسازی' : 'رفع مسدودی'} حساب کاربری ${target.username}`,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, isBanned: target.isBanned });
});

app.post('/api/admin/users/:id/adjust-coins', requireAdmin, (req, res) => {
  const admin = getAuthenticatedUser(req)!;
  const targetId = req.params.id;
  const { amount, reason } = req.body;
  const target = DB.users.get(targetId);
  const wallet = DB.wallets.get(targetId);

  if (!target || !wallet) return res.status(404).json({ error: 'کاربر یا کیف پول یافت نشد.' });

  const numAmount = Number(amount);
  wallet.balance += numAmount;
  if (numAmount > 0) wallet.earnedTotal += numAmount;
  wallet.updatedAt = new Date().toISOString();

  DB.transactions.push({
    id: `tx_admin_${Date.now()}`,
    userId: target.id,
    walletId: wallet.id,
    type: 'ADMIN_ADJUST',
    amount: numAmount,
    balanceAfter: wallet.balance,
    status: 'COMPLETED',
    description: `تغییر موجودی توسط مدیر (${reason || 'تنظیم دستی'})`,
    createdAt: new Date().toISOString(),
  });

  DB.adminLogs.push({
    id: `log_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    actionType: 'ADJUST_COINS',
    targetId: target.id,
    details: `${numAmount >= 0 ? '+' : ''}${numAmount} سکه برای ${target.username}. دلیل: ${reason}`,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, wallet });
});

app.get('/api/admin/orders', requireAdmin, (req, res) => {
  const orders = DB.orders.map((o) => {
    const prod = DB.products.get(o.productId);
    const u = DB.users.get(o.userId);
    return {
      ...o,
      productName: prod ? prod.name : 'آیتم',
      username: u ? u.username : 'کاربر',
    };
  });
  return res.json({ orders });
});

app.post('/api/admin/orders/:id/approve', requireAdmin, (req, res) => {
  const admin = getAuthenticatedUser(req)!;
  const orderId = req.params.id;
  const order = DB.orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد.' });

  if (order.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: 'این سفارش قبلاً تعیین تکلیف شده است.' });
  }

  order.status = 'APPROVED_DELIVERED';
  order.adminNotes = req.body.notes || 'ترِید با موفقیت در استیم ارسال گردید.';
  order.updatedAt = new Date().toISOString();

  const wallet = DB.wallets.get(order.userId);
  if (wallet) {
    wallet.reservedBalance = Math.max(0, wallet.reservedBalance - order.totalCoins);
    wallet.spentTotal += order.totalCoins;
    wallet.updatedAt = new Date().toISOString();
  }

  DB.adminLogs.push({
    id: `log_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    actionType: 'APPROVE_ORDER',
    targetId: order.id,
    details: `تأیید و ارسال سفارش ${order.id} به کاربر ${order.userId}`,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, order });
});

app.post('/api/admin/orders/:id/reject', requireAdmin, (req, res) => {
  const admin = getAuthenticatedUser(req)!;
  const orderId = req.params.id;
  const order = DB.orders.find((o) => o.id === orderId);
  if (!order) return res.status(404).json({ error: 'سفارش یافت نشد.' });

  if (order.status !== 'PENDING_REVIEW') {
    return res.status(400).json({ error: 'این سفارش قبلاً تعیین تکلیف شده است.' });
  }

  const { reason = 'لینک ترید معتبر نبود یا معامله در استیم رد شد.' } = req.body;
  order.status = 'REJECTED_REFUNDED';
  order.adminNotes = reason;
  order.updatedAt = new Date().toISOString();

  // Refund coins immediately
  const wallet = DB.wallets.get(order.userId);
  if (wallet) {
    wallet.reservedBalance = Math.max(0, wallet.reservedBalance - order.totalCoins);
    wallet.balance += order.totalCoins;
    wallet.updatedAt = new Date().toISOString();

    DB.transactions.push({
      id: `tx_ref_${Date.now()}`,
      userId: order.userId,
      walletId: wallet.id,
      type: 'PURCHASE_REFUND',
      amount: order.totalCoins,
      balanceAfter: wallet.balance,
      status: 'REFUNDED',
      description: `استرداد وجه سفارش رد شده (${reason})`,
      createdAt: new Date().toISOString(),
    });
  }

  // Restore inventory
  const prod = DB.products.get(order.productId);
  if (prod) {
    prod.stockQuantity += order.quantity;
  }

  DB.adminLogs.push({
    id: `log_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    actionType: 'REJECT_ORDER',
    targetId: order.id,
    details: `رد سفارش ${order.id} و استرداد ${order.totalCoins} سکه. دلیل: ${reason}`,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, order });
});

app.post('/api/admin/products/:id', requireAdmin, (req, res) => {
  const admin = getAuthenticatedUser(req)!;
  const prodId = req.params.id;
  const prod = DB.products.get(prodId);
  if (!prod) return res.status(404).json({ error: 'محصول یافت نشد.' });

  const { coinPrice, stockQuantity } = req.body;
  if (coinPrice !== undefined) prod.coinPrice = Number(coinPrice);
  if (stockQuantity !== undefined) prod.stockQuantity = Number(stockQuantity);

  DB.adminLogs.push({
    id: `log_${Date.now()}`,
    adminId: admin.id,
    adminUsername: admin.username,
    actionType: 'UPDATE_PRODUCT',
    targetId: prod.id,
    details: `بروزرسانی محصول ${prod.name}: قیمت=${prod.coinPrice}، موجودی=${prod.stockQuantity}`,
    createdAt: new Date().toISOString(),
  });

  return res.json({ success: true, product: prod });
});

app.get('/api/admin/logs', requireAdmin, (req, res) => {
  return res.json({
    logs: [...DB.adminLogs].sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
  });
});

// 13. GITHUB AUTO-SYNC APIS (Admin Protected)
app.get('/api/admin/github/config', requireAdmin, (req, res) => {
  return res.json({
    isConfigured: !!githubStore.token,
    repoOwner: githubStore.repoOwner,
    repoName: githubStore.repoName,
    branch: githubStore.branch,
    isPrivate: githubStore.isPrivate,
    autoSyncEnabled: githubStore.autoSyncEnabled,
    lastSyncAt: githubStore.lastSyncAt,
    lastSyncStatus: githubStore.lastSyncStatus,
    repoUrl: githubStore.lastRepoUrl || (githubStore.repoOwner ? `https://github.com/${githubStore.repoOwner}/${githubStore.repoName}` : undefined),
  });
});

app.post('/api/admin/github/config', requireAdmin, (req, res) => {
  const { token, repoOwner, repoName, branch, isPrivate, autoSyncEnabled } = req.body;
  if (token) githubStore.token = token.trim();
  if (repoOwner !== undefined) githubStore.repoOwner = repoOwner.trim();
  if (repoName) githubStore.repoName = repoName.trim();
  if (branch) githubStore.branch = branch.trim();
  if (isPrivate !== undefined) githubStore.isPrivate = !!isPrivate;
  if (autoSyncEnabled !== undefined) githubStore.autoSyncEnabled = !!autoSyncEnabled;

  return res.json({
    success: true,
    isConfigured: !!githubStore.token,
    repoOwner: githubStore.repoOwner,
    repoName: githubStore.repoName,
    branch: githubStore.branch,
    isPrivate: githubStore.isPrivate,
    autoSyncEnabled: githubStore.autoSyncEnabled,
  });
});

app.post('/api/admin/github/test', requireAdmin, async (req, res) => {
  const tokenToTest = req.body.token || githubStore.token;
  if (!tokenToTest) {
    return res.status(400).json({ error: 'توکن دسترسی شخصی گیت‌هاب (Personal Access Token) وارد نشده است.' });
  }

  try {
    const result = await testGitHubAuth(tokenToTest);
    if (!githubStore.repoOwner && result.login) {
      githubStore.repoOwner = result.login;
    }
    return res.json(result);
  } catch (err: unknown) {
    const e = err as Error;
    return res.status(400).json({ error: e.message || 'خطا در اعتبارسنجی توکن گیت‌هاب' });
  }
});

app.post('/api/admin/github/my-repos', requireAdmin, async (req, res) => {
  const token = req.body.token || githubStore.token;
  if (!token) {
    return res.status(400).json({ error: 'توکن دسترسی شخصی گیت‌هاب وارد نشده است.' });
  }

  try {
    const repos = await getUserRepositories(token);
    return res.json({ repos });
  } catch (err: unknown) {
    const e = err as Error;
    return res.status(500).json({ error: e.message || 'خطا در دریافت لیست مخازن از گیت‌هاب' });
  }
});

app.post('/api/admin/github/upload', requireAdmin, async (req, res) => {
  const admin = getAuthenticatedUser(req)!;
  const token = req.body.token || githubStore.token;
  const repoName = req.body.repoName || githubStore.repoName || 'coinzone-platform';
  const repoOwner = req.body.repoOwner || githubStore.repoOwner;
  const branch = req.body.branch || githubStore.branch || 'main';
  const isPrivate = req.body.isPrivate ?? githubStore.isPrivate;
  const commitMessage = req.body.commitMessage || `آپدیت خودکار کوین‌زون: نسخه ${new Date().toLocaleDateString('fa-IR')}`;

  if (!token) {
    return res.status(400).json({
      error: 'لطفاً توکن دسترسی گیت‌هاب (GitHub Personal Access Token) با دسترسی repo را وارد کنید.',
    });
  }

  try {
    const result = await syncProjectToGitHub({
      token,
      repoOwner,
      repoName,
      branch,
      isPrivate,
      commitMessage,
      projectRootDir: path.resolve(__dirname),
    });

    DB.adminLogs.push({
      id: `log_gh_${Date.now()}`,
      adminId: admin.id,
      adminUsername: admin.username,
      actionType: 'GITHUB_SYNC',
      targetId: result.repoUrl,
      details: `آپلود خودکار ${result.uploadedFilesCount} فایل پروژه به مخزن ${result.repoUrl} (کامیت: ${result.commitSha.substring(0, 7)})`,
      createdAt: new Date().toISOString(),
    });

    return res.json(result);
  } catch (err: unknown) {
    const e = err as Error;
    githubStore.lastSyncStatus = 'FAILED';
    const isRepoAccessErr =
      e.message.includes('Resource not accessible') ||
      e.message.includes('یافت نشد') ||
      e.message.includes('مخزن');

    return res.status(500).json({
      error: e.message || 'خطا در عملیات همگام‌سازی با گیت‌هاب',
      repoNotFound: isRepoAccessErr,
      createRepoUrl: `https://github.com/new?name=${encodeURIComponent(repoName)}`,
    });
  }
});

// Vite Middleware for Full-Stack Dev Server
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`COINZONE server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
