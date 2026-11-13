# CRYPTO SCOPE AI

پلتفرم هوشمند تحلیل تکنیکال چارت ارزهای دیجیتال، تحلیل اخبار لحظه‌ای و ارزیابی شرایط کلان بازار (فارسی / RTL).

## استقرار روی Cloudflare Pages
1. این مخزن را در **Cloudflare Dashboard > Workers & Pages > Create > Pages > Connect to Git** متصل کنید.
2. تنظیمات Build:
   - **Build command:** `npm run build`
   - **Build output directory:** `dist`
3. در بخش **Settings > Environment variables** متغیرهای زیر را اضافه کنید:
   - `GEMINI_API_KEY` (الزامی، به عنوان Secret)
   - `CRYPTOPANIC_API_KEY` (اختیاری)
4. مسیرهای API به صورت خودکار توسط Cloudflare Pages Functions در پوشه `functions/api/[[path]].ts` اجرا می‌شوند.
