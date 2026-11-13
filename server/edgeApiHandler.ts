import { fetchGlobalMarketData } from './marketService.ts';
import {
  analyzeChartWithAI,
  answerChatQuestion,
  generateNewsDashboard,
} from './geminiService.ts';

export interface CloudflareEdgeEnv {
  GEMINI_API_KEY?: string;
  CRYPTOPANIC_API_KEY?: string;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store',
    },
  });
}

function formatEdgeError(err: unknown): { status: number; message: string } {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes('PERMISSION_DENIED') || msg.includes('API_KEY_INVALID')) {
    return {
      status: 403,
      message: 'کلید Gemini API نامعتبر است یا در متغیرهای محیطی کلودفلر تنظیم نشده است.',
    };
  }
  if (msg.includes('RESOURCE_EXHAUSTED') || msg.includes('429')) {
    return {
      status: 429,
      message: 'محدودیت نرخ درخواست سرویس هوش مصنوعی موقتاً پر شده است. کمی بعد دوباره تلاش کنید.',
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
    message: msg || 'خطای غیرمنتظره در سرور کلودفلر رخ داد.',
  };
}

export async function handleEdgeApiRequest(
  request: Request,
  env: CloudflareEdgeEnv,
  explicitSubPath?: string
): Promise<Response> {
  const url = new URL(request.url);
  const subPath = (explicitSubPath ?? url.pathname.replace(/^\/api\/?/, '')).replace(/^\/+/, '');

  try {
    if (request.method === 'GET' && subPath === 'health') {
      return jsonResponse({
        ok: true,
        runtime: 'cloudflare-edge',
        hasGeminiKey: Boolean(env?.GEMINI_API_KEY),
        timestamp: new Date().toISOString(),
      });
    }

    if (request.method === 'GET' && subPath === 'market/global') {
      const force = url.searchParams.get('refresh') === '1';
      const data = await fetchGlobalMarketData(force);
      return jsonResponse(data);
    }

    if (request.method === 'GET' && subPath === 'news') {
      const asset = url.searchParams.get('asset')?.trim() || 'BTC';
      const force = url.searchParams.get('refresh') === '1';
      const data = await generateNewsDashboard(asset, force, {
        geminiApiKey: env?.GEMINI_API_KEY,
        cryptoPanicApiKey: env?.CRYPTOPANIC_API_KEY,
      });
      return jsonResponse(data);
    }

    if (request.method === 'POST' && subPath === 'analyze-chart') {
      const body = (await request.json().catch(() => ({}))) as any;
      if (!Array.isArray(body?.frames) || body.frames.length === 0) {
        return jsonResponse(
          { error: 'لطفاً حداقل یک تصویر چارت با فرمت PNG یا JPG بارگذاری کنید.' },
          400
        );
      }
      const report = await analyzeChartWithAI({
        frames: body.frames,
        userHints: body.userHints || {},
        env: {
          geminiApiKey: env?.GEMINI_API_KEY,
          cryptoPanicApiKey: env?.CRYPTOPANIC_API_KEY,
        },
      });
      return jsonResponse(report);
    }

    if (request.method === 'POST' && subPath === 'chat') {
      const body = (await request.json().catch(() => ({}))) as any;
      if (!body?.question || typeof body.question !== 'string' || !body.question.trim()) {
        return jsonResponse({ error: 'متن پرسش نمی‌تواند خالی باشد.' }, 400);
      }
      const answer = await answerChatQuestion({
        question: body.question.trim(),
        history: Array.isArray(body.history) ? body.history : [],
        report: body.report || null,
        globalMarket: body.globalMarket || null,
        env: { geminiApiKey: env?.GEMINI_API_KEY },
      });
      return jsonResponse({ answer, timestamp: new Date().toISOString() });
    }

    if (subPath.startsWith('github/') || subPath.startsWith('auth/github')) {
      return jsonResponse(
        {
          error:
            'ابزار آپلود به گیت‌هاب مخصوص محیط توسعه AI Studio است؛ اپلیکیشن در حال حاضر به صورت آنلاین روی کلودفلر اجرا می‌شود.',
        },
        400
      );
    }

    return jsonResponse({ error: 'مسیر API یافت نشد.' }, 404);
  } catch (err) {
    const formatted = formatEdgeError(err);
    return jsonResponse({ error: formatted.message }, formatted.status);
  }
}
