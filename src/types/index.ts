export type UserRole = 'user' | 'admin';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  avatar: string;
  level: number;
  xp: number;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Wallet {
  id: string;
  userId: string;
  balance: number;
  earnedTotal: number;
  spentTotal: number;
  reservedBalance: number;
  updatedAt: string;
}

export type TransactionType =
  | 'DAILY_REWARD'
  | 'GAME_REWARD'
  | 'MISSION_REWARD'
  | 'PURCHASE_RESERVE'
  | 'PURCHASE_REFUND'
  | 'ADMIN_ADJUST';

export type TransactionStatus = 'COMPLETED' | 'PENDING' | 'REFUNDED';

export interface Transaction {
  id: string;
  userId: string;
  walletId: string;
  type: TransactionType;
  amount: number;
  balanceAfter: number;
  status: TransactionStatus;
  description: string;
  createdAt: string;
}

export type GameType = 'tap_coin' | 'lucky_wheel' | 'memory' | 'number_guess' | 'reaction_test';

export interface GameSession {
  id: string;
  userId: string;
  gameType: GameType;
  score: number;
  rewardCoins: number;
  rewardXp: number;
  serverValidated: boolean;
  createdAt: string;
}

export interface WheelPrize {
  coins: number;
  probability: number; // percentage
  label: string;
  color: string;
}

export type MissionType = 'DAILY' | 'WEEKLY';

export interface Mission {
  id: string;
  title: string;
  description: string;
  rewardCoins: number;
  rewardXp: number;
  type: MissionType;
  goalType: 'play_games' | 'daily_login' | 'tap_coin' | 'memory_win' | 'reaction_score' | 'wheel_spin';
  goalTarget: number;
  active: boolean;
  // User progress attached
  currentProgress?: number;
  completed?: boolean;
  claimed?: boolean;
}

export interface Product {
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

export type OrderStatus = 'PENDING_REVIEW' | 'APPROVED_DELIVERED' | 'REJECTED_REFUNDED';

export interface Order {
  id: string;
  userId: string;
  productId: string;
  productName?: string;
  productImage?: string;
  quantity: number;
  totalCoins: number;
  steamTradeUrl: string;
  status: OrderStatus;
  adminNotes?: string;
  createdAt: string;
  updatedAt: string;
  username?: string;
}

export interface AdminLog {
  id: string;
  adminId: string;
  adminUsername: string;
  actionType: string;
  targetId: string;
  details: string;
  createdAt: string;
}

export interface DailyRewardState {
  streakCount: number;
  canClaim: boolean;
  lastClaimedAt: string | null;
  nextAvailableAt: string;
  currentDayReward: number;
}

export interface LeaderboardEntry {
  rank: number;
  userId: string;
  username: string;
  avatar: string;
  level: number;
  earnedCoins: number;
  gamesPlayed: number;
}

export interface TapUpgrade {
  id: string;
  name: string;
  description: string;
  cost: number;
  powerIncrease: number;
  type: 'click' | 'passive';
  currentLevel: number;
}

export interface GitHubConfig {
  isConfigured: boolean;
  repoOwner: string;
  repoName: string;
  branch: string;
  isPrivate: boolean;
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastSyncStatus: string | null;
  repoUrl?: string;
}

export interface GitHubRepoItem {
  name: string;
  fullName: string;
  isPrivate: boolean;
  htmlUrl: string;
  defaultBranch: string;
  updatedAt: string;
}

export interface GitHubTestResult {
  valid: boolean;
  login: string;
  name: string;
  avatarUrl: string;
  publicRepos: number;
  scopes: string[];
  repos?: GitHubRepoItem[];
}

export interface GitHubSyncResult {
  success: boolean;
  repoUrl: string;
  commitSha: string;
  commitMessage: string;
  uploadedFilesCount: number;
  timestamp: string;
  error?: string;
  repoNotFound?: boolean;
  createRepoUrl?: string;
}
