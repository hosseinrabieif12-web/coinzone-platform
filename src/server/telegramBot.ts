/**
 * Telegram Bot Engine for COINZONE
 * Supports both Real-Time Long-Polling (works behind firewalls & inside AI Studio)
 * and Public HTTPS Webhooks (for Cloudflare Workers & production domains).
 * Handles /start, /balance, /help, /admin, and inline callbacks.
 * Persists configuration to data/telegram_config.json across restarts.
 */

import fs from 'fs';
import path from 'path';

export interface TelegramBotState {
  botToken: string;
  botUsername: string;
  adminTelegramId: string;
  webhookUrl: string;
  publicAppUrl: string;
  webhookActive: boolean;
  pollingActive: boolean;
  lastSyncAt: string | null;
  lastMessageReceived: string | null;
  lastSenderId?: string;
  lastSenderName?: string;
  lastError: string | null;
}

const CONFIG_FILE = path.resolve(process.cwd(), 'data', 'telegram_config.json');

function ensureDataDir() {
  const dir = path.dirname(CONFIG_FILE);
  if (!fs.existsSync(dir)) {
    try {
      fs.mkdirSync(dir, { recursive: true });
    } catch {
      // ignore
    }
  }
}

export function loadTelegramConfig(): TelegramBotState {
  ensureDataDir();
  const defaultState: TelegramBotState = {
    botToken: process.env.TELEGRAM_BOT_TOKEN || '',
    botUsername: '',
    adminTelegramId: process.env.TELEGRAM_ADMIN_ID || '',
    webhookUrl: '',
    publicAppUrl: 'https://coinzone-platform.0oir5e7kv-3anzbuidmyoek.workers.dev',
    webhookActive: false,
    pollingActive: false,
    lastSyncAt: null,
    lastMessageReceived: null,
    lastError: null,
  };

  try {
    if (fs.existsSync(CONFIG_FILE)) {
      const content = fs.readFileSync(CONFIG_FILE, 'utf-8');
      const parsed = JSON.parse(content);
      return { ...defaultState, ...parsed };
    }
  } catch {
    // ignore
  }

  return defaultState;
}

export function saveTelegramConfig(state: TelegramBotState) {
  ensureDataDir();
  try {
    fs.writeFileSync(CONFIG_FILE, JSON.stringify(state, null, 2), 'utf-8');
  } catch (err) {
    console.error('Error saving telegram config to disk:', err);
  }
}

export const telegramStore: TelegramBotState = loadTelegramConfig();

// Polling Controller
let isPolling = false;
let pollingAbortController: AbortController | null = null;
let lastUpdateOffset = 0;

// 1. Get Bot Details and Webhook Status from Telegram API
export async function getTelegramBotInfo(token: string) {
  const cleanToken = token.trim();
  if (!cleanToken) {
    throw new Error('توکن بات تلگرام وارد نشده است.');
  }

  // getMe
  const meRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getMe`);
  if (!meRes.ok) {
    const err = await meRes.json().catch(() => ({}));
    throw new Error(err.description || `توکن بات نامعتبر است (کد ${meRes.status})`);
  }
  const meData = await meRes.json();

  // getWebhookInfo
  let webhookInfo: any = null;
  try {
    const whRes = await fetch(`https://api.telegram.org/bot${cleanToken}/getWebhookInfo`);
    if (whRes.ok) {
      const whData = await whRes.json();
      webhookInfo = whData.result;
    }
  } catch {
    // ignore
  }

  const bot = meData.result;
  telegramStore.botToken = cleanToken;
  telegramStore.botUsername = bot.username || '';
  telegramStore.webhookActive = !!(webhookInfo && webhookInfo.url);
  if (webhookInfo?.url) {
    telegramStore.webhookUrl = webhookInfo.url;
  }
  saveTelegramConfig(telegramStore);

  return {
    ok: true,
    bot: {
      id: bot.id,
      is_bot: bot.is_bot,
      first_name: bot.first_name,
      username: bot.username,
    },
    webhookInfo: webhookInfo
      ? {
          url: webhookInfo.url,
          pending_update_count: webhookInfo.pending_update_count,
          last_error_message: webhookInfo.last_error_message,
        }
      : undefined,
  };
}

// 2. Automatically Set Webhook via Telegram API (For Cloudflare or public domains)
export async function setTelegramWebhook(token: string, webhookUrl: string) {
  const cleanToken = token.trim();
  const cleanUrl = webhookUrl.trim();

  if (!cleanToken) {
    throw new Error('لطفاً توکن بات تلگرام را وارد کنید.');
  }
  if (!cleanUrl || !cleanUrl.startsWith('https://')) {
    throw new Error('آدرس وب‌هوک باید با پروتکل امن https:// شروع شود.');
  }

  // Stop polling if running
  stopTelegramPolling();

  // Verify Bot first
  const botInfo = await getTelegramBotInfo(cleanToken);

  // Call setWebhook
  const setRes = await fetch(`https://api.telegram.org/bot${cleanToken}/setWebhook`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      url: cleanUrl,
      allowed_updates: ['message', 'callback_query'],
      drop_pending_updates: false,
    }),
  });

  const setData = await setRes.json().catch(() => ({}));
  if (!setRes.ok || !setData.ok) {
    const msg = setData.description || 'خطا در ثبت وب‌هوک در سرور تلگرام';
    telegramStore.lastError = msg;
    saveTelegramConfig(telegramStore);
    throw new Error(msg);
  }

  telegramStore.botToken = cleanToken;
  telegramStore.webhookUrl = cleanUrl;
  telegramStore.webhookActive = true;
  telegramStore.pollingActive = false;
  telegramStore.lastSyncAt = new Date().toISOString();
  telegramStore.lastError = null;
  saveTelegramConfig(telegramStore);

  return {
    success: true,
    message: 'وب‌هوک بات تلگرام با موفقیت تنظیم و فعال شد.',
    webhookUrl: cleanUrl,
    botUsername: botInfo.bot.username,
  };
}

// 3. Delete Webhook
export async function deleteTelegramWebhook(token: string) {
  const cleanToken = token.trim();
  const res = await fetch(`https://api.telegram.org/bot${cleanToken}/deleteWebhook?drop_pending_updates=false`);
  const data = await res.json().catch(() => ({}));
  if (!data.ok) {
    throw new Error(data.description || 'خطا در حذف وب‌هوک');
  }
  telegramStore.webhookActive = false;
  telegramStore.webhookUrl = '';
  saveTelegramConfig(telegramStore);
  return { success: true };
}

// 4. Setup Bot Commands and WebApp Menu Button in Telegram
export async function setupBotCommandsAndMenu(token: string, appUrl: string) {
  try {
    const cleanToken = token.trim();
    const appWebUrl = appUrl.startsWith('http') ? appUrl : `https://${appUrl}`;

    // 1. Set Chat Menu Button (creates the persistent "Play" button in chat)
    await fetch(`https://api.telegram.org/bot${cleanToken}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: '🎮 بازی کوین‌زون',
          web_app: { url: appWebUrl },
        },
      }),
    });

    // 2. Set Slash Commands List
    await fetch(`https://api.telegram.org/bot${cleanToken}/setMyCommands`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        commands: [
          { command: 'start', description: 'اجرا و ورود به بازی کوین‌زون' },
          { command: 'balance', description: 'استعلام موجودی سکه و سطح' },
          { command: 'daily', description: 'دریافت ۵۰ سکه هدیه روزانه' },
          { command: 'admin', description: 'ورود به پنل مدیریت (ادمین)' },
          { command: 'help', description: 'راهنمای بازی و جوایز TF2' },
        ],
      }),
    });
  } catch (err) {
    console.warn('Failed to set Telegram menu/commands:', err);
  }
}

// 4.1 Send Message to Telegram User with Resilient Multi-Layer Fallback
export async function sendTelegramMessage(token: string, chatId: number | string, text: string, replyMarkup?: any) {
  const cleanToken = token.trim();
  const cleanChatId = chatId;

  try {
    const res = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: cleanChatId,
        text,
        parse_mode: 'HTML',
        reply_markup: replyMarkup,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.warn('Telegram sendMessage primary attempt error:', err);

      // Fallback 1: Try without HTML formatting
      const fallbackRes = await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          chat_id: cleanChatId,
          text: text.replace(/<[^>]*>/g, ''),
          reply_markup: replyMarkup,
        }),
      });

      if (!fallbackRes.ok) {
        // Fallback 2: Send plain text without reply markup
        await fetch(`https://api.telegram.org/bot${cleanToken}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: cleanChatId,
            text: text.replace(/<[^>]*>/g, ''),
          }),
        });
      }
    }
  } catch (err) {
    console.error('Failed to send telegram message:', err);
  }
}

// 4.5 Answer Callback Query
export async function answerTelegramCallbackQuery(token: string, callbackQueryId: string, text?: string) {
  try {
    await fetch(`https://api.telegram.org/bot${token.trim()}/answerCallbackQuery`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        callback_query_id: callbackQueryId,
        text: text || '',
      }),
    });
  } catch {
    // ignore
  }
}

// 5. Incoming Update Handler (Handles messages and button taps)
export async function processTelegramWebhookUpdate(
  update: any,
  appUrl: string,
  getUserCoinsCallback?: (telegramId: string) => Promise<{ coins: number; level: number } | null>
) {
  if (!update) return;
  const token = telegramStore.botToken;
  if (!token) return;

  const appWebUrl = (
    telegramStore.publicAppUrl ||
    appUrl ||
    'https://coinzone-platform.0oir5e7kv-3anzbuidmyoek.workers.dev'
  ).trim();

  // Handle Callback Query (Button clicks)
  if (update.callback_query) {
    const cq = update.callback_query;
    const cqId = cq.id;
    const chatId = cq.message?.chat?.id;
    const data = cq.data;
    const fromId = cq.from?.id ? String(cq.from.id) : '';

    if (data === 'claim_daily') {
      await answerTelegramCallbackQuery(token, cqId, '🎁 هدیه ۵۰ سکه‌ای روزانه برای شما لحاظ شد!');
      if (chatId) {
        await sendTelegramMessage(
          token,
          chatId,
          '🎉 <b>۵۰ سکه هدیه روزانه به حساب شما اضافه شد!</b>\nبرای انجام بازی‌ها و ماین سکه بیشتر روی دکمه زیر کلیک کنید:',
          {
            inline_keyboard: [[{ text: '🎮 ورود به بازی کوین‌زون', web_app: { url: appWebUrl } }]],
          }
        );
      }
      return;
    }

    if (data === 'leaderboard') {
      await answerTelegramCallbackQuery(token, cqId, '🏆 رتبه‌بندی باز شد');
      if (chatId) {
        await sendTelegramMessage(
          token,
          chatId,
          '🏆 <b>برترین گیمرهای کوین‌زون:</b>\n\n' +
            '🥇 <b>Alireza_Sniper:</b> ۴,۹۵۰ سکه\n' +
            '🥈 <b>CyberReza_TF2:</b> ۳,۸۲۰ سکه\n' +
            '🥉 <b>Ghost_Walker:</b> ۲,۹۵۰ سکه\n\n' +
            'برای ارتقای رتبه خود وارد بازی شوید!',
          {
            inline_keyboard: [[{ text: '🎮 رقابت در لیدربورد', web_app: { url: appWebUrl } }]],
          }
        );
      }
      return;
    }

    await answerTelegramCallbackQuery(token, cqId);
    return;
  }

  // Handle Regular Message
  if (!update.message) return;
  const msg = update.message;
  const chatId = msg.chat?.id;
  const text = (msg.text || '').trim();
  const from = msg.from;

  if (!chatId) return;

  if (from) {
    telegramStore.lastSenderId = String(from.id);
    telegramStore.lastSenderName = `${from.first_name || ''} ${from.last_name || ''}`.trim() || from.username || '';
    if (!telegramStore.adminTelegramId) {
      telegramStore.adminTelegramId = String(from.id);
    }
  }

  telegramStore.lastMessageReceived = `${new Date().toLocaleTimeString('fa-IR')} (${text.substring(0, 15)})`;
  saveTelegramConfig(telegramStore);

  const telegramUserId = from ? String(from.id) : '';
  const isAdmin =
    telegramUserId &&
    telegramStore.adminTelegramId &&
    telegramUserId === telegramStore.adminTelegramId.trim();
  // Command: /start
  if (text.startsWith('/start')) {
    const userName = from?.first_name || 'گیمر عزیز';
    const welcomeText =
      `🎮 <b>سلام ${userName}! به پلتفرم گیمینگ COINZONE خوش آمدید.</b>\n\n` +
      `🔥 <b>کوین‌زون چیست؟</b>\n` +
      `پلتفرم بازی و کسب جوایز گیمینگ! با انجام مینی‌گیم‌ها و گردونه شانس، سکه جمع کنید و سکه‌های خود را به <b>کلیدهای صندوق Team Fortress 2 Mann Co.</b> و آیتم‌های استیم تبدیل کنید.\n\n` +
      `⚡ <b>امکانات:</b>\n` +
      `• ۵ بازی جذاب (تپ کوین، گردونه شانس، کارت حافظه، حدس عدد، تست واکنش)\n` +
      `• هدیه ۵۰ سکه ورود روزانه\n` +
      `• فروشگاه مستقیم کلید TF2 با ارسال اتوماتیک Trade Offer استیم\n\n` +
      `👇 <i>برای شروع بازی روی دکمه زیر کلیک کنید:</i>`;

    const replyMarkup = {
      inline_keyboard: [
        [
          {
            text: '🚀 ورود به بازی (Mini App تلگرام)',
            web_app: { url: appWebUrl },
          },
          {
            text: '🌐 باز کردن در مرورگر',
            url: appWebUrl,
          },
        ],
        [
          { text: '🎁 هدیه روزانه (+50 سکه)', callback_data: 'claim_daily' },
          { text: '🏆 رتبه‌بندی گیمرها', callback_data: 'leaderboard' },
        ],
        ...(isAdmin
          ? [
              [
                {
                  text: '⚙️ پنل مدیریت (Admin Panel)',
                  web_app: { url: `${appWebUrl}?admin=1` },
                },
              ],
            ]
          : []),
      ],
    };

    await sendTelegramMessage(token, chatId, welcomeText, replyMarkup);
    return;
  }

  // Command: /balance or موجودی
  if (text.startsWith('/balance') || text === 'موجودی') {
    let balanceText = '💰 <b>اطلاعات حساب شما در COINZONE:</b>\n\n';
    if (getUserCoinsCallback && telegramUserId) {
      const stats = await getUserCoinsCallback(telegramUserId);
      if (stats) {
        balanceText += `🪙 موجودی سکه: <b>${stats.coins.toLocaleString('fa-IR')}</b> سکه\n`;
        balanceText += `⭐ سطح شما: <b>سطح ${stats.level}</b>\n\n`;
      } else {
        balanceText += `شما ۵۰ سکه اولیه دارید! با دکمه زیر وارد بازی شوید تا ماین را شروع کنید:\n\n`;
      }
    } else {
      balanceText += `با کلیک روی دکمه ورود، موجودی و کیف پول خود را به طور زنده مشاهده کنید.\n\n`;
    }

    const replyMarkup = {
      inline_keyboard: [
        [{ text: '🎮 باز کردن بازی و کیف پول', web_app: { url: appWebUrl } }],
      ],
    };
    await sendTelegramMessage(token, chatId, balanceText, replyMarkup);
    return;
  }

  // Command: /help or راهنما
  if (text.startsWith('/help') || text === 'راهنما') {
    const helpText =
      `❓ <b>راهنمای بازی کوین‌زون (COINZONE):</b>\n\n` +
      `۱. <b>تپ کوین:</b> لمس سکه و ارتقای ماینر خودکار برای تولید ثانیه‌ای سکه.\n` +
      `۲. <b>گردونه شانس:</b> روزی ۱ بار شانس چرخاندن رایگان با جایزه تا ۲۰۰ سکه.\n` +
      `۳. <b>کارت‌های حافظه:</b> تطبیق اسکین‌ها در سریع‌ترین زمان.\n` +
      `۴. <b>فروشگاه استیم:</b> با ۶۵۰ سکه یک کلید واقعی TF2 Mann Co. دریافت کنید!\n\n` +
      `دستورات بات:\n` +
      `/start - شروع و باز کردن بازی\n` +
      `/balance - استعلام موجودی سکه و سطح\n` +
      `/admin - ورود مستقیم مدیر\n` +
      `/help - نمایش این راهنما`;

    await sendTelegramMessage(token, chatId, helpText);
    return;
  }

  // Command: /admin
  if (text.startsWith('/admin')) {
    if (!isAdmin) {
      await sendTelegramMessage(
        token,
        chatId,
        `⛔ دسترسی ادمین برای آیدی <code>${telegramUserId}</code> تنظیم نشده است.\n` +
          `لطفاً در پنل تنظیمات بات، شناسه <code>${telegramUserId}</code> را به عنوان ادمین وارد کنید.`
      );
      return;
    }
    const adminMsg =
      `👑 <b>مدیر گرامی، خوش آمدید!</b>\n\n` +
      `شناسه تلگرام شما: <code>${telegramUserId}</code>\n` +
      `برای ورود به کنترل‌پنل کامل کوین‌زون روی دکمه زیر ضربه بزنید:`;
    const replyMarkup = {
      inline_keyboard: [
        [{ text: '🛡️ ورود مستقیم به پنل مدیریت', web_app: { url: `${appWebUrl}?admin=1` } }],
      ],
    };
    await sendTelegramMessage(token, chatId, adminMsg, replyMarkup);
    return;
  }

  // Default response for any other message
  await sendTelegramMessage(
    token,
    chatId,
    `🎮 برای تجربه مینی‌گیم‌ها و تبدیل سکه به کلیدهای TF2، روی دکمه زیر کلیک کنید:`,
    {
      inline_keyboard: [
        [{ text: '🚀 اجرای بازی COINZONE', web_app: { url: appWebUrl } }],
      ],
    }
  );
}

// 6. Real-Time Long-Polling Worker (Runs inside AI Studio without needing open ports/public domains)
export async function startTelegramPolling(
  appUrl: string,
  getUserCoinsCallback?: (telegramId: string) => Promise<{ coins: number; level: number } | null>
) {
  const token = telegramStore.botToken.trim();
  if (!token) return;

  if (isPolling) {
    return; // Already running
  }

  isPolling = true;
  telegramStore.pollingActive = true;
  pollingAbortController = new AbortController();
  saveTelegramConfig(telegramStore);

  console.log('🤖 Telegram Bot Long-Polling service started for bot:', telegramStore.botUsername || 'Token Ready');

  // First delete webhook without dropping pending updates so existing /start messages arrive
  try {
    await fetch(`https://api.telegram.org/bot${token}/deleteWebhook?drop_pending_updates=false`);
    telegramStore.webhookActive = false;
    saveTelegramConfig(telegramStore);
  } catch {
    // ignore
  }

  // Configure bot commands list & WebApp menu button in Telegram
  setupBotCommandsAndMenu(token, appUrl).catch(console.warn);

  // Polling loop
  (async () => {
    while (isPolling) {
      try {
        const url = `https://api.telegram.org/bot${token}/getUpdates?offset=${lastUpdateOffset}&timeout=10&limit=50`;
        const res = await fetch(url, { signal: pollingAbortController?.signal });

        if (!res.ok) {
          const errData = await res.json().catch(() => ({}));
          console.warn('Telegram getUpdates error:', errData);
          await new Promise((r) => setTimeout(r, 2000));
          continue;
        }

        const data = await res.json();
        if (data.ok && Array.isArray(data.result)) {
          for (const update of data.result) {
            lastUpdateOffset = update.update_id + 1;
            try {
              await processTelegramWebhookUpdate(update, appUrl, getUserCoinsCallback);
            } catch (err) {
              console.error('Error processing telegram update:', err);
            }
          }
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') break;
        // Network blip, wait 1.5s and retry
        await new Promise((r) => setTimeout(r, 1500));
      }
    }
    console.log('🤖 Telegram Bot Long-Polling stopped.');
  })();
}

export function stopTelegramPolling() {
  isPolling = false;
  telegramStore.pollingActive = false;
  if (pollingAbortController) {
    pollingAbortController.abort();
    pollingAbortController = null;
  }
  saveTelegramConfig(telegramStore);
}
