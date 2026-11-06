import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { User, Wallet, Order, AdminLog, Product } from '../types';
import {
  Shield,
  Users,
  ShoppingBag,
  Clock,
  CheckCircle2,
  XCircle,
  Search,
  PlusCircle,
  MinusCircle,
  FileText,
  Package,
  AlertTriangle,
  Lock,
  Github,
  Bot,
} from 'lucide-react';
import { GitHubSyncPanel } from '../components/GitHubSyncPanel';
import { TelegramBotPanel } from '../components/TelegramBotPanel';

export const AdminPage: React.FC = () => {
  const { user, unlockAdmin } = useAuth();
  const [stats, setStats] = useState<{
    totalUsers: number;
    totalCoinsCirculation: number;
    pendingOrders: number;
    approvedOrders: number;
    tf2KeyStock: number;
    tf2KeyPrice: number;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'ORDERS' | 'USERS' | 'INVENTORY' | 'LOGS' | 'GITHUB' | 'TELEGRAM'>('ORDERS');
  const [orders, setOrders] = useState<Order[]>([]);
  const [usersList, setUsersList] = useState<(User & { wallet?: Wallet })[]>([]);
  const [logs, setLogs] = useState<AdminLog[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  // Search
  const [userSearch, setUserSearch] = useState('');

  // Coin Adjustment Modal
  const [adjustTargetUser, setAdjustTargetUser] = useState<(User & { wallet?: Wallet }) | null>(null);
  const [adjustAmount, setAdjustAmount] = useState<number>(100);
  const [adjustReason, setAdjustReason] = useState<string>('جایزه مسابقه یا پاداش ویژه');

  // Inventory Edit
  const [editPrice, setEditPrice] = useState<number>(650);
  const [editStock, setEditStock] = useState<number>(42);

  const fetchAdminData = async () => {
    if (user?.role !== 'admin') {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const [st, ords, usrs, lgs, prods] = await Promise.all([
        api.getAdminStats(),
        api.getAdminOrders(),
        api.getAdminUsers(),
        api.getAdminLogs(),
        api.getProducts(),
      ]);
      setStats(st);
      setOrders(ords.orders);
      setUsersList(usrs.users);
      setLogs(lgs.logs);
      setProducts(prods.products);
      if (st) {
        setEditPrice(st.tf2KeyPrice);
        setEditStock(st.tf2KeyStock);
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, [user]);

  // If user is not admin, show access restricted with quick switch
  if (user?.role !== 'admin') {
    return (
      <div className="max-w-md mx-auto py-16 text-center space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center mx-auto">
          <Lock className="w-8 h-8" />
        </div>
        <h2 className="text-xl font-black text-white">دسترسی به پنل مدیریت محدود است</h2>
        <p className="text-xs text-slate-400 leading-relaxed">
          برای ورود به این بخش باید با حساب مدیر کل (Admin) وارد شوید.
        </p>
        <button
          onClick={async () => {
            sound.playClick();
            await unlockAdmin('123');
          }}
          className="py-3 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
        >
          ورود سریع به عنوان مدیر سیستم (پین‌کد: ۱۲۳)
        </button>
      </div>
    );
  }

  const handleApproveOrder = async (orderId: string) => {
    if (!confirm('آیا پیشنهاد ترِید در استیم ارسال گردیده و از تأیید سفارش اطمینان دارید؟')) return;
    sound.playClick();
    try {
      await api.approveOrder(orderId, 'ترِید با موفقیت در استیم تأیید و ارسال گردید.');
      sound.playWin();
      await fetchAdminData();
    } catch (err: unknown) {
      const e = err as Error;
      sound.playError();
      alert(e.message || 'خطا در تایید سفارش');
    }
  };

  const handleRejectOrder = async (orderId: string) => {
    const reason = prompt('دلیل رد سفارش (وجه فوراً به کیف پول کاربر عودت داده می‌شود):', 'لینک ترید اشتباه بود یا اکانت استیم خصوصی است');
    if (!reason) return;
    sound.playClick();
    try {
      await api.rejectOrder(orderId, reason);
      sound.playCoin();
      await fetchAdminData();
    } catch (err: unknown) {
      const e = err as Error;
      sound.playError();
      alert(e.message || 'خطا در رد سفارش');
    }
  };

  const handleToggleBan = async (userId: string) => {
    sound.playClick();
    try {
      await api.toggleBanUser(userId);
      await fetchAdminData();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'خطا در تغییر وضعیت کاربر');
    }
  };

  const handleAdjustCoins = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustTargetUser) return;
    sound.playClick();
    try {
      await api.adjustUserCoins(adjustTargetUser.id, adjustAmount, adjustReason);
      sound.playWin();
      setAdjustTargetUser(null);
      await fetchAdminData();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'خطا در ویرایش موجودی');
    }
  };

  const handleUpdateProduct = async () => {
    sound.playClick();
    try {
      await api.updateProduct('p_tf2_key', editPrice, editStock);
      sound.playWin();
      alert('مشخصات و قیمت کلید TF2 در فروشگاه با موفقیت بروز شد.');
      await fetchAdminData();
    } catch (err: unknown) {
      const e = err as Error;
      alert(e.message || 'خطا در بروزرسانی محصول');
    }
  };

  const filteredUsers = usersList.filter(
    (u) =>
      u.username.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase())
  );

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-[#12141c] border border-amber-500/30 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <Shield className="w-4 h-4" />
            <span>مرکز کنترل و مدیریت کوین‌زون</span>
          </div>
          <h2 className="text-2xl font-black text-white">پنل مدیریت پیشرفته (Admin Dashboard)</h2>
          <p className="text-xs text-slate-400 mt-1">
            مدیریت کاربران، سفارشات استیم، موجودی انبار کلیدهای TF2 و گزارشات مالی
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('GITHUB');
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md transition-all cursor-pointer glow-purple"
          >
            <Github className="w-3.5 h-3.5" />
            <span>آپلود به گیت‌هاب</span>
          </button>
          <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-xs font-bold text-amber-300">
            <span>دسترسی ادمین</span>
          </div>
        </div>
      </div>

      {/* KPI Stats Cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-[#12141c] border border-white/10 rounded-xl p-4 glass-panel">
            <div className="text-[11px] text-slate-400">کاربران ثبت‌نامی</div>
            <div className="text-xl font-black text-white mt-1 font-mono">{stats.totalUsers}</div>
          </div>
          <div className="bg-[#12141c] border border-white/10 rounded-xl p-4 glass-panel">
            <div className="text-[11px] text-slate-400">سکه در گردش</div>
            <div className="text-xl font-black text-amber-300 mt-1 font-mono">
              {stats.totalCoinsCirculation.toLocaleString('fa-IR')}
            </div>
          </div>
          <div className="bg-[#12141c] border border-amber-500/30 rounded-xl p-4 glass-panel">
            <div className="text-[11px] text-amber-400 font-bold">سفارشات در انتظار</div>
            <div className="text-xl font-black text-amber-300 mt-1 font-mono">{stats.pendingOrders}</div>
          </div>
          <div className="bg-[#12141c] border border-white/10 rounded-xl p-4 glass-panel">
            <div className="text-[11px] text-slate-400">سفارشات تحویل‌شده</div>
            <div className="text-xl font-black text-emerald-400 mt-1 font-mono">{stats.approvedOrders}</div>
          </div>
          <div className="bg-[#12141c] border border-white/10 rounded-xl p-4 glass-panel">
            <div className="text-[11px] text-slate-400">موجودی کلید TF2</div>
            <div className="text-xl font-black text-cyan-300 mt-1 font-mono">{stats.tf2KeyStock}</div>
          </div>
          <div className="bg-[#12141c] border border-white/10 rounded-xl p-4 glass-panel">
            <div className="text-[11px] text-slate-400">قیمت هر کلید TF2</div>
            <div className="text-xl font-black text-purple-300 mt-1 font-mono">{stats.tf2KeyPrice} سکه</div>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1.5 bg-[#12141c] border border-white/10 rounded-2xl glass-panel overflow-x-auto scrollbar-none">
        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('ORDERS');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'ORDERS' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <ShoppingBag className="w-4 h-4" />
          <span>مدیریت سفارشات TF2 ({orders.filter((o) => o.status === 'PENDING_REVIEW').length} در انتظار)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('USERS');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'USERS' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>مدیریت کاربران ({usersList.length})</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('INVENTORY');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'INVENTORY' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <Package className="w-4 h-4" />
          <span>انبار و قیمت‌گذاری</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('LOGS');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'LOGS' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
          }`}
        >
          <FileText className="w-4 h-4" />
          <span>لاگ‌های نظارتی (Audit)</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('GITHUB');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'GITHUB'
              ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-white shadow-md glow-purple'
              : 'text-purple-300 hover:text-white hover:bg-purple-950/30 border border-purple-500/20'
          }`}
        >
          <Github className="w-4 h-4" />
          <span>آپلود خودکار به گیت‌هاب</span>
        </button>

        <button
          onClick={() => {
            sound.playClick();
            setActiveTab('TELEGRAM');
          }}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs sm:text-sm font-bold transition-all cursor-pointer ${
            activeTab === 'TELEGRAM'
              ? 'bg-gradient-to-r from-cyan-600 to-blue-600 text-white shadow-md'
              : 'text-cyan-300 hover:text-white hover:bg-cyan-950/30 border border-cyan-500/20'
          }`}
        >
          <Bot className="w-4 h-4" />
          <span>بات تلگرام و وب‌هوک</span>
        </button>
      </div>

      {/* TAB 1: ORDERS MANAGEMENT */}
      {activeTab === 'ORDERS' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-4">
          <h3 className="text-base font-bold text-white mb-2">لیست سفارشات کاربران</h3>

          {orders.length === 0 ? (
            <div className="text-center py-10 text-xs text-slate-500">سفارشی ثبت نشده است.</div>
          ) : (
            <div className="space-y-4">
              {orders.map((o) => (
                <div
                  key={o.id}
                  className="p-4 bg-white/[0.03] border border-white/10 rounded-xl flex flex-col lg:flex-row items-start lg:items-center justify-between gap-4 text-xs"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white text-sm">{o.productName || 'آیتم'}</span>
                      <span className="font-mono text-amber-300 font-bold">({o.totalCoins} سکه)</span>
                      <span className="text-slate-400">توسط: {o.username || o.userId}</span>
                    </div>

                    <div className="text-slate-400 flex flex-wrap items-center gap-2">
                      <span className="font-mono text-slate-500">شناسه: {o.id}</span>
                      <span>·</span>
                      <span>تاریخ: {new Date(o.createdAt).toLocaleString('fa-IR')}</span>
                    </div>

                    <div className="p-2 bg-black/40 border border-white/5 rounded-lg text-[11px] font-mono text-cyan-300 break-all select-all dir-ltr text-left">
                      Trade URL: {o.steamTradeUrl}
                    </div>

                    {o.adminNotes && (
                      <div className="text-slate-400 text-[11px]">یادداشت مدیر: {o.adminNotes}</div>
                    )}
                  </div>

                  <div className="flex items-center gap-2 w-full lg:w-auto shrink-0">
                    {o.status === 'PENDING_REVIEW' ? (
                      <>
                        <button
                          onClick={() => handleApproveOrder(o.id)}
                          className="flex-1 lg:flex-none py-2 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                          <span>تأیید و تحویل شد</span>
                        </button>
                        <button
                          onClick={() => handleRejectOrder(o.id)}
                          className="flex-1 lg:flex-none py-2 px-4 bg-rose-600/30 hover:bg-rose-600/50 border border-rose-500/40 text-rose-200 font-bold rounded-xl transition-all cursor-pointer flex items-center justify-center gap-1"
                        >
                          <XCircle className="w-4 h-4" />
                          <span>رد و استرداد وجه</span>
                        </button>
                      </>
                    ) : (
                      <span
                        className={`px-3 py-1.5 rounded-xl font-bold ${
                          o.status === 'APPROVED_DELIVERED'
                            ? 'bg-emerald-950/40 text-emerald-300 border border-emerald-500/30'
                            : 'bg-rose-950/40 text-rose-300 border border-rose-500/30'
                        }`}
                      >
                        {o.status === 'APPROVED_DELIVERED' ? 'تحویل شد' : 'رد و مسترد شد'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: USERS MANAGEMENT */}
      {activeTab === 'USERS' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-4">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <h3 className="text-base font-bold text-white">مدیریت کاربران و موجودی</h3>
            <div className="relative w-full sm:w-64">
              <input
                type="text"
                placeholder="جستجو با نام یا ایمیل..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-[#181a24] border border-white/10 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-purple-400"
              />
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-2.5" />
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-right text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 bg-white/[0.02]">
                  <th className="py-3 px-3">کاربر</th>
                  <th className="py-3 px-3">ایمیل</th>
                  <th className="py-3 px-3 text-center">نقش</th>
                  <th className="py-3 px-3 text-center">سطح</th>
                  <th className="py-3 px-3 text-center">موجودی</th>
                  <th className="py-3 px-3 text-center">وضعیت</th>
                  <th className="py-3 px-3 text-left">عملیات ادمین</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {filteredUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-white/[0.02]">
                    <td className="py-3 px-3 font-bold text-white">{u.username}</td>
                    <td className="py-3 px-3 font-mono text-slate-400">{u.email}</td>
                    <td className="py-3 px-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                          u.role === 'admin' ? 'bg-amber-500/20 text-amber-300' : 'bg-white/5 text-slate-400'
                        }`}
                      >
                        {u.role === 'admin' ? 'ادمین' : 'کاربر'}
                      </span>
                    </td>
                    <td className="py-3 px-3 text-center font-bold text-purple-300">سطح {u.level}</td>
                    <td className="py-3 px-3 text-center font-mono font-bold text-amber-300">
                      {u.wallet ? u.wallet.balance : 0} سکه
                    </td>
                    <td className="py-3 px-3 text-center">
                      {u.isBanned ? (
                        <span className="text-rose-400 font-bold">مسدود</span>
                      ) : (
                        <span className="text-emerald-400 font-bold">فعال</span>
                      )}
                    </td>
                    <td className="py-3 px-3 text-left">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => {
                            setAdjustTargetUser(u);
                            setAdjustAmount(100);
                          }}
                          className="px-2.5 py-1 bg-purple-600/20 hover:bg-purple-600/40 border border-purple-500/30 rounded-lg text-purple-300 font-bold text-[11px] cursor-pointer"
                        >
                          تغییر سکه
                        </button>
                        {u.role !== 'admin' && (
                          <button
                            onClick={() => handleToggleBan(u.id)}
                            className={`px-2.5 py-1 border rounded-lg text-[11px] font-bold cursor-pointer ${
                              u.isBanned
                                ? 'bg-emerald-600/20 border-emerald-500/40 text-emerald-300'
                                : 'bg-rose-600/20 border-rose-500/40 text-rose-300'
                            }`}
                          >
                            {u.isBanned ? 'رفع انسداد' : 'مسدودسازی'}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: INVENTORY & SHOP SETTINGS */}
      {activeTab === 'INVENTORY' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-6">
          <h3 className="text-base font-bold text-white">مدیریت انبار و نرخ تبدیل کلید TF2</h3>

          <div className="max-w-md space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">قیمت کلید TF2 (تعداد سکه مورد نیاز)</label>
              <input
                type="number"
                min={10}
                value={editPrice}
                onChange={(e) => setEditPrice(Number(e.target.value))}
                className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1.5">موجودی فیزیکی کلید در انبار ربات استیم</label>
              <input
                type="number"
                min={0}
                value={editStock}
                onChange={(e) => setEditStock(Number(e.target.value))}
                className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-amber-400"
              />
            </div>

            <button
              onClick={handleUpdateProduct}
              className="py-3 px-6 bg-gradient-to-r from-amber-500 to-yellow-500 text-black font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
            >
              ذخیره تغییرات فروشگاه
            </button>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === 'LOGS' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel space-y-4">
          <h3 className="text-base font-bold text-white mb-2">لاگ‌های امنیتی و اقدامات مدیریتی</h3>
          <div className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <div
                key={log.id}
                className="p-3 bg-white/[0.02] border border-white/5 rounded-xl flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-bold text-white flex items-center gap-2">
                    <span className="px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-300 font-mono text-[10px]">
                      {log.actionType}
                    </span>
                    <span>{log.details}</span>
                  </div>
                  <div className="text-[10px] text-slate-500 mt-1">توسط: {log.adminUsername}</div>
                </div>
                <div className="text-[11px] text-slate-400 font-mono">
                  {new Date(log.createdAt).toLocaleString('fa-IR')}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 5: GITHUB AUTO-SYNC */}
      {activeTab === 'GITHUB' && <GitHubSyncPanel />}

      {/* TAB 6: TELEGRAM BOT & WEBHOOK */}
      {activeTab === 'TELEGRAM' && <TelegramBotPanel />}

      {/* Coin Adjustment Modal */}
      {adjustTargetUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="relative w-full max-w-md bg-[#12141c] border border-purple-500/40 rounded-2xl p-6 shadow-2xl glow-purple text-slate-100">
            <h3 className="text-base font-black text-white mb-1">
              تنظیم موجودی سکه کاربر: {adjustTargetUser.username}
            </h3>
            <p className="text-xs text-slate-400 mb-4">
              موجودی فعلی: {adjustTargetUser.wallet ? adjustTargetUser.wallet.balance : 0} سکه
            </p>

            <form onSubmit={handleAdjustCoins} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">مقدار تغییر (مثبت یا منفی)</label>
                <input
                  type="number"
                  required
                  value={adjustAmount}
                  onChange={(e) => setAdjustAmount(Number(e.target.value))}
                  placeholder="مثال: 150 یا -50"
                  className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white font-mono focus:outline-none focus:border-purple-400"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">دلیل تغییر جهت ثبت در لاگ حسابرسی</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  className="w-full bg-[#181a24] border border-white/10 rounded-xl px-4 py-2.5 text-xs text-white focus:outline-none focus:border-purple-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustTargetUser(null)}
                  className="px-4 py-2 text-xs font-bold text-slate-400 hover:text-white cursor-pointer"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="py-2.5 px-6 bg-purple-600 hover:bg-purple-500 text-white font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                >
                  اعمال تغییر موجودی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
