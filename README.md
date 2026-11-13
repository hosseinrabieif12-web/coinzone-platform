# CRYPTO SCOPE AI

پلتفرم هوشمند تحلیل تکنیکال چارت ارزهای دیجیتال، تحلیل اخبار لحظه‌ای و ارزیابی شرایط کلان بازار (فارسی / RTL).

## استقرار آنلاین روی Cloudflare Workers / Pages
1. این مخزن را در **Cloudflare Dashboard > Workers & Pages > Create > Import a repository** متصل کنید.
2. تنظیمات Build:
   - **Build command:** `npm run build`
   - **Deploy command (در حالت Workers):** `npx wrangler deploy`
3. در بخش **Settings > Variables and Secrets** متغیرهای زیر را اضافه کنید:
   - `GEMINI_API_KEY` (الزامی، به عنوان Secret)
   - `CRYPTOPANIC_API_KEY` (اختیاری)
4. فایل `worker.ts` و `wrangler.toml` به صورت خودکار تمام مسیرهای `/api/*` را به صورت آنلاین روی شبکه Edge کلودفلر اجرا می‌کنند.
