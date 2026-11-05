-- Cloudflare D1 Migration: 0001_initial.sql
-- COINZONE Gaming Rewards Platform Schema

-- Drop tables if exist
DROP TABLE IF EXISTS admin_logs;
DROP TABLE IF EXISTS orders;
DROP TABLE IF EXISTS inventory;
DROP TABLE IF EXISTS products;
DROP TABLE IF EXISTS user_missions;
DROP TABLE IF EXISTS missions;
DROP TABLE IF EXISTS wheel_spins;
DROP TABLE IF EXISTS game_sessions;
DROP TABLE IF EXISTS transactions;
DROP TABLE IF EXISTS daily_rewards;
DROP TABLE IF EXISTS wallets;
DROP TABLE IF EXISTS sessions;
DROP TABLE IF EXISTS users;

-- 1. Users Table
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  username TEXT UNIQUE NOT NULL,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'user', -- 'user' or 'admin'
  avatar TEXT NOT NULL DEFAULT 'avatar_1',
  level INTEGER NOT NULL DEFAULT 1,
  xp INTEGER NOT NULL DEFAULT 0,
  is_banned INTEGER NOT NULL DEFAULT 0,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- 2. Sessions Table
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 3. Wallets Table
CREATE TABLE wallets (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  balance INTEGER NOT NULL DEFAULT 50, -- Starting bonus
  earned_total INTEGER NOT NULL DEFAULT 50,
  spent_total INTEGER NOT NULL DEFAULT 0,
  reserved_balance INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 4. Transactions Table
CREATE TABLE transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  wallet_id TEXT NOT NULL,
  type TEXT NOT NULL, -- 'DAILY_REWARD', 'GAME_REWARD', 'MISSION_REWARD', 'PURCHASE_RESERVE', 'PURCHASE_REFUND', 'ADMIN_ADJUST'
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  status TEXT NOT NULL DEFAULT 'COMPLETED', -- 'COMPLETED', 'PENDING', 'REFUNDED'
  description TEXT NOT NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (wallet_id) REFERENCES wallets(id) ON DELETE CASCADE
);

-- 5. Game Sessions Table
CREATE TABLE game_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  game_type TEXT NOT NULL, -- 'tap_coin', 'lucky_wheel', 'memory', 'number_guess', 'reaction_test'
  score INTEGER NOT NULL DEFAULT 0,
  reward_coins INTEGER NOT NULL DEFAULT 0,
  reward_xp INTEGER NOT NULL DEFAULT 0,
  server_validated INTEGER NOT NULL DEFAULT 1,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 6. Wheel Spins Table
CREATE TABLE wheel_spins (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  date_key TEXT NOT NULL, -- YYYY-MM-DD
  prize_coins INTEGER NOT NULL,
  spun_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 7. Missions Table
CREATE TABLE missions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  reward_coins INTEGER NOT NULL,
  reward_xp INTEGER NOT NULL,
  type TEXT NOT NULL, -- 'DAILY', 'WEEKLY'
  goal_type TEXT NOT NULL, -- 'play_games', 'daily_login', 'tap_coin', 'memory_win', 'reaction_score', 'wheel_spin'
  goal_target INTEGER NOT NULL,
  active INTEGER NOT NULL DEFAULT 1
);

-- 8. User Missions Table
CREATE TABLE user_missions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  mission_id TEXT NOT NULL,
  current_progress INTEGER NOT NULL DEFAULT 0,
  completed INTEGER NOT NULL DEFAULT 0,
  claimed INTEGER NOT NULL DEFAULT 0,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (mission_id) REFERENCES missions(id) ON DELETE CASCADE
);

-- 9. Products Table
CREATE TABLE products (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT NOT NULL,
  image_url TEXT NOT NULL,
  coin_price INTEGER NOT NULL,
  stock_quantity INTEGER NOT NULL DEFAULT 0,
  active INTEGER NOT NULL DEFAULT 1,
  category TEXT NOT NULL DEFAULT 'tf2_key'
);

-- 10. Inventory Table
CREATE TABLE inventory (
  id TEXT PRIMARY KEY,
  product_id TEXT NOT NULL,
  item_code_or_identifier TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'AVAILABLE', -- 'AVAILABLE', 'RESERVED', 'DELIVERED'
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 11. Orders Table
CREATE TABLE orders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  product_id TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  total_coins INTEGER NOT NULL,
  steam_trade_url TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING_REVIEW', -- 'PENDING_REVIEW', 'APPROVED_DELIVERED', 'REJECTED_REFUNDED'
  admin_notes TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (product_id) REFERENCES products(id) ON DELETE CASCADE
);

-- 12. Admin Logs Table
CREATE TABLE admin_logs (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  action_type TEXT NOT NULL,
  target_id TEXT NOT NULL,
  details TEXT NOT NULL,
  ip_address TEXT,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (admin_id) REFERENCES users(id) ON DELETE CASCADE
);

-- 13. Daily Rewards Table
CREATE TABLE daily_rewards (
  id TEXT PRIMARY KEY,
  user_id TEXT UNIQUE NOT NULL,
  streak_count INTEGER NOT NULL DEFAULT 0,
  last_claimed_at DATETIME,
  next_available_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Indexes for high-performance lookups
CREATE INDEX idx_sessions_user ON sessions(user_id);
CREATE INDEX idx_transactions_user ON transactions(user_id);
CREATE INDEX idx_orders_user ON orders(user_id);
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_wheel_user_date ON wheel_spins(user_id, date_key);
CREATE INDEX idx_user_missions ON user_missions(user_id, mission_id);

-- SEED DATA: Default Missions
INSERT INTO missions (id, title, description, reward_coins, reward_xp, type, goal_type, goal_target, active) VALUES
('m1', 'انجام ۳ مینی‌گیم', 'در هر یک از بخش‌های بازی کوین‌زون شرکت کن و امتیاز ثبت کن.', 30, 45, 'DAILY', 'play_games', 3, 1),
('m2', 'دریافت پاداش روزانه ورود', 'وارد حساب شو و پاداش روزانه تقویم را جمع‌آوری کن.', 15, 25, 'DAILY', 'daily_login', 1, 1),
('m3', 'استخراج ۱۰۰ سکه در تپ‌کوین', 'در بازی تپ‌کوین حداقل ۱۰۰ ضربه یا کوین ثبت کن.', 35, 50, 'DAILY', 'tap_coin', 100, 1),
('m4', 'پیروزی در چالش کارت‌های حافظه', 'یک دور بازی کارت حافظه را با موفقیت تمام کن.', 40, 60, 'DAILY', 'memory_win', 1, 1),
('m5', 'چرخش گردونه شانس', 'یک بار در روز گردونه شانس را بچرخان.', 20, 30, 'DAILY', 'wheel_spin', 1, 1),
('m6', 'واکنش فوق سریع زیر ۲۸۰ میلی‌ثانیه', 'در تست سرعت واکنش رکورد زیر ۲۸۰ms ثبت کن.', 50, 75, 'WEEKLY', 'reaction_score', 1, 1);

-- SEED DATA: TF2 Products
INSERT INTO products (id, name, slug, description, image_url, coin_price, stock_quantity, active, category) VALUES
('p_tf2_key', 'کلید صندوق مان‌کو Team Fortress 2 (Mann Co. Supply Crate Key)', 'tf2-mann-co-key', 'اصلی‌ترین و نقدترین آیتم معاملاتی در دنیای Team Fortress 2 و استیم. تحویل از طریق Steam Trade Offer بدون نیاز به پسورد.', '/src/assets/images/tf2_mann_co_key_1793890450520.jpg', 650, 48, 1, 'tf2_key'),
('p_tf2_ticket', 'بلیط تور ماموریت TF2 Tour of Duty Ticket (MvM)', 'tf2-tour-ticket', 'بلیط ورود به عملیات رسمی Mann vs. Machine و شانس کسب سلاح‌های طلایی استرالیوم (Australium).', '/src/assets/images/tf2_tour_ticket_1793890453482.jpg', 240, 75, 1, 'tf2_ticket');
