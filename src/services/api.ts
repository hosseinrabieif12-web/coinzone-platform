import {
  User,
  Wallet,
  Transaction,
  Mission,
  Product,
  Order,
  LeaderboardEntry,
  AdminLog,
  DailyRewardState,
  GitHubConfig,
  GitHubTestResult,
  GitHubSyncResult,
} from '../types';

class ApiService {
  private token: string | null = null;

  constructor() {
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('coinzone_token');
    }
  }

  public setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) {
        localStorage.setItem('coinzone_token', token);
      } else {
        localStorage.removeItem('coinzone_token');
      }
    }
  }

  public getToken(): string | null {
    return this.token;
  }

  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const headers = new Headers(options.headers || {});
    headers.set('Content-Type', 'application/json');
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const res = await fetch(endpoint, {
      ...options,
      headers,
    });

    const data = await res.json().catch(() => ({}));

    if (!res.ok) {
      throw new Error(data.error || 'خطایی در ارتباط با سرور رخ داد.');
    }

    return data as T;
  }

  // Auth
  public async login(loginOrEmail: string, password: string) {
    const res = await this.request<{ token: string; user: User; wallet: Wallet }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ loginOrEmail, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async register(username: string, email: string, password: string) {
    const res = await this.request<{ token: string; user: User; wallet: Wallet }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    this.setToken(res.token);
    return res;
  }

  public async getMe() {
    return this.request<{ user: User; wallet: Wallet }>('/api/auth/me');
  }

  public logout() {
    this.setToken(null);
  }

  public async updateProfile(avatar?: string, username?: string) {
    return this.request<{ user: User }>('/api/user/profile', {
      method: 'POST',
      body: JSON.stringify({ avatar, username }),
    });
  }

  // Wallet
  public async getWallet() {
    return this.request<{ wallet: Wallet; transactions: Transaction[] }>('/api/wallet');
  }

  // Daily Rewards
  public async getDailyRewards() {
    return this.request<DailyRewardState & { streakRewards: number[] }>('/api/daily-rewards');
  }

  public async claimDailyReward() {
    return this.request<{
      success: boolean;
      rewardAmount: number;
      xpReward: number;
      streakCount: number;
      nextAvailableAt: string;
      wallet: Wallet;
      user: User;
    }>('/api/daily-rewards/claim', {
      method: 'POST',
    });
  }

  // Game 1: Tap Coin
  public async syncTapCoin(taps: number, clickPower: number) {
    return this.request<{
      success: boolean;
      earned: number;
      earnedXp: number;
      wallet: Wallet;
      user: User;
    }>('/api/games/tap-coin/sync', {
      method: 'POST',
      body: JSON.stringify({ taps, clickPower }),
    });
  }

  // Game 2: Lucky Wheel
  public async getLuckyWheelStatus() {
    return this.request<{ canSpin: boolean; todayKey: string }>('/api/games/lucky-wheel/status');
  }

  public async spinLuckyWheel() {
    return this.request<{
      prizeCoins: number;
      segmentIndex: number;
      xpReward: number;
      wallet: Wallet;
      user: User;
    }>('/api/games/lucky-wheel/spin', {
      method: 'POST',
    });
  }

  // Game 3: Memory Match
  public async completeMemoryGame(difficulty: string, moves: number, secondsElapsed: number) {
    return this.request<{
      success: boolean;
      rewardCoins: number;
      rewardXp: number;
      wallet: Wallet;
      user: User;
    }>('/api/games/memory/complete', {
      method: 'POST',
      body: JSON.stringify({ difficulty, moves, secondsElapsed }),
    });
  }

  // Game 4: Number Guess
  public async startNumberGuess() {
    return this.request<{ success: boolean; maxAttempts: number; range: { min: number; max: number } }>(
      '/api/games/number-guess/start',
      { method: 'POST' }
    );
  }

  public async makeNumberGuess(guess: number) {
    return this.request<{
      result: 'HIGHER' | 'LOWER' | 'CORRECT' | 'GAME_OVER';
      message?: string;
      rewardCoins?: number;
      rewardXp?: number;
      attemptsLeft?: number;
      attemptsUsed?: number;
      revealedSecret?: number;
      wallet?: Wallet;
      user?: User;
    }>('/api/games/number-guess/guess', {
      method: 'POST',
      body: JSON.stringify({ guess }),
    });
  }

  // Game 5: Reaction Test
  public async submitReactionTest(reactionMs: number) {
    return this.request<{
      success: boolean;
      reactionMs: number;
      tier: string;
      rewardCoins: number;
      rewardXp: number;
      wallet: Wallet;
      user: User;
    }>('/api/games/reaction-test/submit', {
      method: 'POST',
      body: JSON.stringify({ reactionMs }),
    });
  }

  // Missions
  public async getMissions() {
    return this.request<{ missions: Mission[] }>('/api/missions');
  }

  public async claimMission(missionId: string) {
    return this.request<{
      success: boolean;
      rewardCoins: number;
      rewardXp: number;
      wallet: Wallet;
      user: User;
    }>(`/api/missions/${missionId}/claim`, {
      method: 'POST',
    });
  }

  // Shop & Orders
  public async getProducts() {
    return this.request<{ products: Product[] }>('/api/products');
  }

  public async createOrder(productId: string, quantity: number, steamTradeUrl: string) {
    return this.request<{ success: boolean; order: Order; wallet: Wallet }>('/api/orders', {
      method: 'POST',
      body: JSON.stringify({ productId, quantity, steamTradeUrl }),
    });
  }

  public async getMyOrders() {
    return this.request<{ orders: Order[] }>('/api/orders/my');
  }

  // Leaderboard
  public async getLeaderboard() {
    return this.request<{ leaderboard: LeaderboardEntry[]; userRank: number | null }>('/api/leaderboard');
  }

  // Admin APIs
  public async getAdminStats() {
    return this.request<{
      totalUsers: number;
      totalCoinsCirculation: number;
      pendingOrders: number;
      approvedOrders: number;
      tf2KeyStock: number;
      tf2KeyPrice: number;
    }>('/api/admin/stats');
  }

  public async getAdminUsers() {
    return this.request<{ users: (User & { wallet?: Wallet })[] }>('/api/admin/users');
  }

  public async toggleBanUser(userId: string) {
    return this.request<{ success: boolean; isBanned: boolean }>(`/api/admin/users/${userId}/ban`, {
      method: 'POST',
    });
  }

  public async adjustUserCoins(userId: string, amount: number, reason: string) {
    return this.request<{ success: boolean; wallet: Wallet }>(`/api/admin/users/${userId}/adjust-coins`, {
      method: 'POST',
      body: JSON.stringify({ amount, reason }),
    });
  }

  public async getAdminOrders() {
    return this.request<{ orders: Order[] }>('/api/admin/orders');
  }

  public async approveOrder(orderId: string, notes?: string) {
    return this.request<{ success: boolean; order: Order }>(`/api/admin/orders/${orderId}/approve`, {
      method: 'POST',
      body: JSON.stringify({ notes }),
    });
  }

  public async rejectOrder(orderId: string, reason?: string) {
    return this.request<{ success: boolean; order: Order }>(`/api/admin/orders/${orderId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason }),
    });
  }

  public async updateProduct(productId: string, coinPrice?: number, stockQuantity?: number) {
    return this.request<{ success: boolean; product: Product }>(`/api/admin/products/${productId}`, {
      method: 'POST',
      body: JSON.stringify({ coinPrice, stockQuantity }),
    });
  }

  public async getAdminLogs() {
    return this.request<{ logs: AdminLog[] }>('/api/admin/logs');
  }

  // GitHub Auto-Sync APIs
  public async getGitHubConfig() {
    return this.request<GitHubConfig>('/api/admin/github/config');
  }

  public async saveGitHubConfig(config: {
    token?: string;
    repoOwner?: string;
    repoName?: string;
    branch?: string;
    isPrivate?: boolean;
    autoSyncEnabled?: boolean;
  }) {
    return this.request<{ success: boolean } & GitHubConfig>('/api/admin/github/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  public async testGitHubToken(token?: string) {
    return this.request<GitHubTestResult>('/api/admin/github/test', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  public async getMyRepositories(token?: string) {
    return this.request<{ repos: import('../types').GitHubRepoItem[] }>('/api/admin/github/my-repos', {
      method: 'POST',
      body: JSON.stringify({ token }),
    });
  }

  public async uploadToGitHub(options: {
    token?: string;
    repoOwner?: string;
    repoName?: string;
    branch?: string;
    isPrivate?: boolean;
    commitMessage?: string;
    d1DatabaseId?: string;
  }) {
    return this.request<GitHubSyncResult>('/api/admin/github/upload', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }

  // Seamless Session & Admin Unlock
  public async initSession(options: { deviceId?: string; telegramUser?: any; adminKey?: string }) {
    const res = await this.request<{ token: string; user: User; wallet: Wallet }>('/api/auth/session', {
      method: 'POST',
      body: JSON.stringify(options),
    });
    this.setToken(res.token);
    return res;
  }

  public async adminUnlock(key: string) {
    const res = await this.request<{ success: boolean; token?: string; user?: User; wallet?: Wallet }>('/api/auth/admin-unlock', {
      method: 'POST',
      body: JSON.stringify({ key }),
    });
    if (res.token) {
      this.setToken(res.token);
    }
    return res;
  }

  public async adminLock() {
    return this.request<{ success: boolean; user?: User }>('/api/auth/admin-lock', {
      method: 'POST',
    });
  }

  // Telegram Bot & Webhook APIs
  public async getTelegramConfig() {
    return this.request<import('../types').TelegramConfig>('/api/telegram/config');
  }

  public async saveTelegramConfig(config: { botToken?: string; adminTelegramId?: string }) {
    return this.request<{ success: boolean; config: import('../types').TelegramConfig }>('/api/telegram/config', {
      method: 'POST',
      body: JSON.stringify(config),
    });
  }

  public async getTelegramInfo(token?: string) {
    const query = token ? `?token=${encodeURIComponent(token)}` : '';
    return this.request<import('../types').TelegramTestResult>(`/api/telegram/info${query}`);
  }

  public async setTelegramWebhook(options: { botToken?: string; adminTelegramId?: string; webhookUrl?: string }) {
    return this.request<{ success: boolean; message: string; webhookUrl: string; botUsername?: string }>(
      '/api/telegram/webhook/set',
      {
        method: 'POST',
        body: JSON.stringify(options),
      }
    );
  }

  public async deleteTelegramWebhook(botToken?: string) {
    return this.request<{ success: boolean }>('/api/telegram/webhook/delete', {
      method: 'POST',
      body: JSON.stringify({ botToken }),
    });
  }

  public async toggleTelegramPolling(active: boolean, token?: string) {
    return this.request<{ success: boolean; pollingActive: boolean; message: string }>('/api/telegram/polling/toggle', {
      method: 'POST',
      body: JSON.stringify({ active, token }),
    });
  }

  public async sendTelegramTestMessage(options: { botToken?: string; chatId: string }) {
    return this.request<{ success: boolean; message: string }>('/api/telegram/test-message', {
      method: 'POST',
      body: JSON.stringify(options),
    });
  }
}

export const api = new ApiService();
