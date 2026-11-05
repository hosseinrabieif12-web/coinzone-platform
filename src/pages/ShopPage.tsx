import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { sound } from '../services/sound';
import { Product, Order } from '../types';
import {
  ShoppingBag,
  ShieldCheck,
  Package,
  ExternalLink,
  CheckCircle2,
  Clock,
  XCircle,
  HelpCircle,
  X,
} from 'lucide-react';

export const ShopPage: React.FC = () => {
  const { user, wallet, updateWallet, setShowAuthModal } = useAuth();
  const [products, setProducts] = useState<Product[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [activeTab, setActiveTab] = useState<'ITEMS' | 'MY_ORDERS'>('ITEMS');
  const [loading, setLoading] = useState<boolean>(true);

  // Purchase Modal State
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [steamTradeUrl, setSteamTradeUrl] = useState<string>('');
  const [tradeUrlHelpOpen, setTradeUrlHelpOpen] = useState<boolean>(false);
  const [orderSubmitting, setOrderSubmitting] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<boolean>(false);

  const fetchShopData = async () => {
    try {
      const [prodRes, ordRes] = await Promise.all([
        api.getProducts().catch(() => ({ products: [] })),
        user ? api.getMyOrders().catch(() => ({ orders: [] })) : Promise.resolve({ orders: [] }),
      ]);
      setProducts(prodRes.products);
      setOrders(ordRes.orders);
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShopData();
  }, [user]);

  const handleOpenPurchase = (product: Product) => {
    sound.playClick();
    if (!user) {
      setShowAuthModal(true);
      return;
    }
    setSelectedProduct(product);
    setQuantity(1);
    setOrderSuccess(false);
    // prefill trade url from previous order if available
    if (orders.length > 0 && orders[0].steamTradeUrl) {
      setSteamTradeUrl(orders[0].steamTradeUrl);
    }
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProduct || !user || !wallet) return;

    if (!steamTradeUrl.includes('steamcommunity.com/tradeoffer/new/')) {
      sound.playError();
      alert('فرمت لینک ترید استیم نامعتبر است. لطفاً لینک کامل Trade Offer استیم خود را وارد کنید.');
      return;
    }

    const totalCost = selectedProduct.coinPrice * quantity;
    if (wallet.balance < totalCost) {
      sound.playError();
      alert(`موجودی شما کافی نیست. شما به ${totalCost} سکه نیاز دارید اما موجودی شما ${wallet.balance} سکه است.`);
      return;
    }

    setOrderSubmitting(true);
    sound.playClick();

    try {
      const res = await api.createOrder(selectedProduct.id, quantity, steamTradeUrl);
      sound.playCoin();
      sound.playWin();
      updateWallet(res.wallet);
      setOrderSuccess(true);
      await fetchShopData();
    } catch (err: unknown) {
      const e = err as Error;
      sound.playError();
      alert(e.message || 'خطا در ثبت سفارش');
    } finally {
      setOrderSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12">
      {/* Header */}
      <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold text-amber-400 mb-1">
            <ShoppingBag className="w-4 h-4" />
            <span>فروشگاه جوایز استیم و TF2</span>
          </div>
          <h2 className="text-2xl font-black text-white">فروشگاه کلید Team Fortress 2</h2>
          <p className="text-xs text-slate-400 mt-1">
            سکه‌های به‌دست‌آمده از بازی‌ها را به کلید صندوق Mann Co. و بلیط‌های MvM تبدیل کنید.
          </p>
        </div>

        {/* Tab switch */}
        <div className="flex items-center gap-1 p-1 bg-black/40 border border-white/10 rounded-xl">
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('ITEMS');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer ${
              activeTab === 'ITEMS' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            آیتم‌های موجود
          </button>
          <button
            onClick={() => {
              sound.playClick();
              setActiveTab('MY_ORDERS');
            }}
            className={`px-4 py-2 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
              activeTab === 'MY_ORDERS' ? 'bg-amber-500 text-black shadow-md' : 'text-slate-400 hover:text-white'
            }`}
          >
            <span>سفارشات من</span>
            {orders.length > 0 && (
              <span className="px-1.5 py-0.2 rounded-full bg-black/30 text-[10px] font-mono">
                {orders.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Security Guarantee Notice */}
      <div className="p-4 bg-purple-950/20 border border-purple-500/30 rounded-2xl flex items-start gap-3 text-xs leading-relaxed">
        <ShieldCheck className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div className="text-slate-300">
          <span className="font-bold text-white">ضمانت امنیت استیم:</span> پلتفرم کوین‌زون تحت هیچ شرایطی از شما نام کاربری،
          رمز عبور یا دسترسی به اکانت استیم درخواست نمی‌کند. تحویل تمامی آیتم‌ها به شکل استاندارد و از طریق ارسال پیشنهاد مبادله
          (Steam Trade Offer) به لینک ترید شما توسط ربات‌های معتبر انجام می‌شود.
        </div>
      </div>

      {/* TAB 1: ITEMS */}
      {activeTab === 'ITEMS' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {products.map((p) => {
            const canAfford = wallet ? wallet.balance >= p.coinPrice : false;
            return (
              <div
                key={p.id}
                className="bg-[#12141c] border border-white/10 hover:border-amber-500/40 rounded-2xl p-6 glass-panel flex flex-col justify-between transition-all group"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <span className="text-[10px] font-bold px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30">
                      تحویل آنی از طریق استیم
                    </span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Package className="w-3.5 h-3.5 text-cyan-400" />
                      <span>موجودی: {p.stockQuantity} عدد</span>
                    </span>
                  </div>

                  <div className="relative rounded-xl overflow-hidden aspect-video sm:aspect-[4/3] mb-4 bg-black/60 border border-white/10">
                    <img
                      src={p.imageUrl}
                      alt={p.name}
                      className="w-full h-full object-cover transform group-hover:scale-105 transition-transform duration-500"
                    />
                  </div>

                  <h3 className="text-lg font-black text-white group-hover:text-amber-300 transition-colors">
                    {p.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 leading-relaxed">{p.description}</p>
                </div>

                <div className="mt-6 pt-4 border-t border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-[10px] text-slate-400">قیمت نهایی</div>
                    <div className="text-2xl font-black text-amber-300 flex items-baseline gap-1">
                      <span>{p.coinPrice.toLocaleString('fa-IR')}</span>
                      <span className="text-xs text-slate-400 font-normal">سکه</span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleOpenPurchase(p)}
                    className="py-2.5 px-6 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow-lg shadow-amber-500/20 transition-all cursor-pointer transform active:scale-95"
                  >
                    سفارش و تحویل
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: MY ORDERS */}
      {activeTab === 'MY_ORDERS' && (
        <div className="bg-[#12141c] border border-white/10 rounded-2xl p-6 glass-panel">
          <h3 className="text-base font-black text-white mb-4">تاریخچه سفارشات شما</h3>

          {orders.length === 0 ? (
            <div className="text-center py-12 text-xs text-slate-500">
              شما تاکنون سفارشی ثبت نکرده‌اید. با بازی کردن و کسب سکه، اولین کلید TF2 خود را دریافت کنید!
            </div>
          ) : (
            <div className="space-y-4">
              {orders.map((order) => {
                const isPending = order.status === 'PENDING_REVIEW';
                const isDelivered = order.status === 'APPROVED_DELIVERED';
                const isRejected = order.status === 'REJECTED_REFUNDED';

                return (
                  <div
                    key={order.id}
                    className="p-4 bg-white/[0.03] border border-white/10 rounded-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4"
                  >
                    <div className="flex items-center gap-3">
                      {order.productImage ? (
                        <img
                          src={order.productImage}
                          alt="آیتم"
                          className="w-12 h-12 object-cover rounded-lg border border-white/10"
                        />
                      ) : (
                        <div className="w-12 h-12 rounded-lg bg-purple-600/20 text-purple-400 flex items-center justify-center font-bold">
                          TF2
                        </div>
                      )}
                      <div>
                        <div className="text-sm font-bold text-white">{order.productName || 'آیتم گیمینگ'}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          تعداد: {order.quantity} عدد · هزینه: {order.totalCoins} سکه
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1">
                          شناسه سفارش: {order.id}
                        </div>
                      </div>
                    </div>

                    <div className="flex flex-col md:items-end gap-1.5 w-full md:w-auto">
                      {isPending && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-amber-500/20 border border-amber-500/30 text-amber-300 text-xs font-bold">
                          <Clock className="w-3.5 h-3.5" />
                          <span>در انتظار تأیید و ارسال در استیم</span>
                        </span>
                      )}
                      {isDelivered && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-bold">
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          <span>تأیید و ارسال شد</span>
                        </span>
                      )}
                      {isRejected && (
                        <span className="inline-flex items-center gap-1 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs font-bold">
                          <XCircle className="w-3.5 h-3.5" />
                          <span>رد شد (سکه‌ها مسترد گردید)</span>
                        </span>
                      )}

                      {order.adminNotes && (
                        <div className="text-[11px] text-slate-400 text-right">
                          توضیحات مدیر: {order.adminNotes}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* PURCHASE MODAL */}
      {selectedProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fadeIn">
          <div className="relative w-full max-w-lg bg-[#12141c] border border-amber-500/40 rounded-2xl p-6 md:p-8 shadow-2xl glow-gold text-slate-100 overflow-hidden">
            <button
              onClick={() => {
                sound.playClick();
                setSelectedProduct(null);
              }}
              className="absolute top-4 left-4 p-2 text-slate-400 hover:text-white rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            {orderSuccess ? (
              <div className="text-center py-6 space-y-4">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <h3 className="text-2xl font-black text-white">سفارش شما با موفقیت ثبت شد!</h3>
                <p className="text-xs text-slate-300 leading-relaxed max-w-sm mx-auto">
                  سکه‌های مورد نیاز از حساب شما به حالت رزرو درآمدند. مدیران سیستم پس از بررسی لینک ترید، پیشنهاد مبادله (Trade
                  Offer) را در استیم ارسال می‌کنند.
                </p>
                <div className="pt-4">
                  <button
                    onClick={() => {
                      sound.playClick();
                      setSelectedProduct(null);
                      setActiveTab('MY_ORDERS');
                    }}
                    className="py-3 px-8 bg-amber-500 hover:bg-amber-400 text-black font-black text-xs rounded-xl shadow-lg transition-all cursor-pointer"
                  >
                    مشاهده وضعیت سفارش در تب سفارشات
                  </button>
                </div>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-3 mb-6">
                  <img
                    src={selectedProduct.imageUrl}
                    alt={selectedProduct.name}
                    className="w-14 h-14 object-cover rounded-xl border border-white/10"
                  />
                  <div>
                    <h3 className="text-base font-black text-white">{selectedProduct.name}</h3>
                    <div className="text-xs text-amber-300 font-bold mt-0.5">
                      قیمت: {selectedProduct.coinPrice} سکه
                    </div>
                  </div>
                </div>

                <form onSubmit={handlePlaceOrder} className="space-y-4">
                  {/* Quantity */}
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1.5">تعداد سفارش</label>
                    <div className="flex items-center gap-3">
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-white font-bold flex items-center justify-center cursor-pointer hover:bg-white/10"
                      >
                        -
                      </button>
                      <span className="font-mono font-bold text-lg text-white w-10 text-center">{quantity}</span>
                      <button
                        type="button"
                        onClick={() => setQuantity((q) => Math.min(selectedProduct.stockQuantity, q + 1))}
                        className="w-10 h-10 rounded-xl bg-white/[0.05] border border-white/10 text-white font-bold flex items-center justify-center cursor-pointer hover:bg-white/10"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Steam Trade URL */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-bold text-slate-300">لینک ترید استیم (Steam Trade URL)</label>
                      <button
                        type="button"
                        onClick={() => setTradeUrlHelpOpen(!tradeUrlHelpOpen)}
                        className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer"
                      >
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>راهنمای دریافت لینک</span>
                      </button>
                    </div>

                    <input
                      type="url"
                      required
                      placeholder="https://steamcommunity.com/tradeoffer/new/?partner=...&token=..."
                      value={steamTradeUrl}
                      onChange={(e) => setSteamTradeUrl(e.target.value)}
                      className="w-full bg-[#181a24] border border-white/10 focus:border-amber-400 focus:outline-none rounded-xl px-4 py-2.5 text-xs text-white font-mono placeholder-slate-600 transition-all dir-ltr text-left"
                    />

                    {tradeUrlHelpOpen && (
                      <div className="mt-2 p-3 bg-cyan-950/40 border border-cyan-500/30 rounded-xl text-[11px] text-cyan-200 leading-relaxed">
                        برای یافتن Trade URL خود در استیم: <br />
                        ۱. به اینونتوری استیم خود بروید (Inventory) <br />
                        ۲. روی دکمه Trade Offers کلیک کنید <br />
                        ۳. از منوی سمت راست گزینه Who can send me Trade Offers? را انتخاب کنید <br />
                        ۴. در انتهای صفحه بخش Third-Party Sites لینک Trade URL را کپی کنید.
                      </div>
                    )}
                  </div>

                  {/* Cost Summary */}
                  <div className="p-3.5 bg-black/40 border border-white/10 rounded-xl space-y-1.5 text-xs">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>موجودی فعلی شما:</span>
                      <span className="font-bold text-white">{wallet ? wallet.balance : 0} سکه</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>مجموع مبلغ سفارش:</span>
                      <span className="font-bold text-amber-300">{selectedProduct.coinPrice * quantity} سکه</span>
                    </div>
                    <div className="flex items-center justify-between border-t border-white/5 pt-1.5 font-bold">
                      <span>باقیمانده پس از رزرو:</span>
                      <span
                        className={
                          (wallet?.balance || 0) - selectedProduct.coinPrice * quantity >= 0
                            ? 'text-emerald-400'
                            : 'text-rose-400'
                        }
                      >
                        {(wallet?.balance || 0) - selectedProduct.coinPrice * quantity} سکه
                      </span>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={orderSubmitting || (wallet?.balance || 0) < selectedProduct.coinPrice * quantity}
                    className="w-full py-3.5 bg-gradient-to-r from-amber-500 via-amber-400 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-sm rounded-xl shadow-lg shadow-amber-500/30 transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    {orderSubmitting ? (
                      <span className="w-5 h-5 border-2 border-black border-t-transparent rounded-full animate-spin" />
                    ) : (
                      <span>تأیید و ثبت نهایی سفارش</span>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
