# راهنمای استقرار پروژه COINZONE بر روی Cloudflare (Workers + Pages + D1)

این سند راهنمای گام‌به‌گام برای راه‌اندازی و دیپلوی پلتفرم جوایز گیمینگ **COINZONE** بر روی زیرساخت لبه (Edge) شرکت Cloudflare است.

---

## ۱. پیش‌نیازها
- حساب کاربری رایگان یا پرو در [Cloudflare Dashboard](https://dash.cloudflare.com)
- نصب بودن Node.js (نسخه ۱۸ به بالا)
- ابزار خط فرمان Wrangler:
  ```bash
  npm install -g wrangler
  wrangler login
  ```

---

## ۲. ایجاد پایگاه‌داده Cloudflare D1
پایگاه‌داده D1 یک دیتابیس توزیع‌شده با کارایی بالا و منطبق بر موتور SQLite است.

1. اجرای دستور ایجاد دیتابیس:
   ```bash
   wrangler d1 create coinzone-db
   ```
2. خروجی دستور بالا حاوی یک `database_id` است. مقدار آن را در فایل `wrangler.jsonc` در بخش `d1_databases[0].database_id` جایگزین کنید.

3. اجرای مایگریشن اولیه جدول‌ها و داده‌های آغازین (Seed Data):
   - برای محیط لوکال:
     ```bash
     wrangler d1 execute coinzone-db --local --file=./migrations/0001_initial.sql
     ```
   - برای محیط پروداکشن Cloudflare:
     ```bash
     wrangler d1 execute coinzone-db --remote --file=./migrations/0001_initial.sql
     ```

---

## ۳. ایجاد باکت Cloudflare R2 (برای تصاویر و دارایی‌ها)
برای ذخیره‌سازی ابری و بدون هزینه خروجی ترافیک (Zero Egress Fees):
```bash
wrangler r2 bucket create coinzone-assets
```

---

## ۴. استقرار بک‌اند در Cloudflare Workers
فایل `worker/index.ts` به عنوان کنترل‌کننده مرکزی API و ارتباط با دیتابیس D1 طراحی شده است.

برای انتشار Worker روی لبه‌های جهانی کلودفلر:
```bash
wrangler deploy
```

پس از استقرار، دامنه Worker شما شبیه به زیر خواهد بود:
`https://coinzone-backend.<your-subdomain>.workers.dev`

---

## ۵. استقرار فرانت‌اند در Cloudflare Pages
فرانت‌اند با React 19، Tailwind CSS و Vite آماده‌سازی شده است.

1. بیلد نهایی پروژه:
   ```bash
   npm run build
   ```
2. استقرار دایرکتوری `dist`:
   ```bash
   wrangler pages deploy dist --project-name coinzone
   ```
   یا اتصال مستقیم مخزن GitHub به Cloudflare Pages:
   - **Framework preset**: Vite
   - **Build command**: `npm run build`
   - **Build output directory**: `dist`
   - **Environment Variables**:
     - `VITE_API_URL`: آدرس ورکر بک‌اند شما (مثلاً `https://coinzone-backend.<subdomain>.workers.dev`)

---

## ۶. حساب‌های پیش‌فرض و تست سریع
در اجرای محلی یا محیط اولیه، حساب‌های زیر آماده استفاده هستند:

- **مدیر کل سیستم (Admin)**:
  - نام کاربری: `admin` (یا ایمیل `admin@coinzone.gg`)
  - رمز عبور: `123`
  - دسترسی به: تایید/رد سفارشات با ریفاند آنی، شارژ/کسر سکه، مسدودسازی کاربر، تغییر قیمت کلید TF2 و همگام‌سازی گیت‌هاب

- **کاربر معمولی (User)**:
  - نام کاربری: `user` (یا ایمیل `user@coinzone.gg`)
  - رمز عبور: `123`
  - موجودی پیش‌فرض: ۴۸۰ سکه + سطح ۴ گیمر

---

## ۷. همگام‌سازی و آپلود خودکار روی گیت‌هاب (GitHub Auto-Sync)
پلتفرم کوین‌زون دارای ماژول داخلی برای انتقال مستقیم کدها به ریپازیتوری GitHub بدون نیاز به نصب هیچ ابزار اضافی در سیستم کاربر است:

1. ورود به **پنل مدیریت** (با حساب ادمین `admin@coinzone.gg`).
2. کلیک روی تب **آپلود خودکار به گیت‌هاب**.
3. وارد کردن **Personal Access Token** از آدرس [GitHub Settings Tokens](https://github.com/settings/tokens) با دسترسی `repo`.
4. کلیک روی دکمه **آپلود و پوش فوری به گیت‌هاب (Upload Now)**.
   - سیستم به صورت خودکار در صورت عدم وجود ریپازیتوری در گیت‌هاب، آن را می‌سازد.
   - تمام فایل‌های پروژه را به عنوان یک درخت کامیت به شاخه `main` ارسال می‌کند.
   - فایل `.github/workflows/deploy.yml` نیز آپلود شده و پایپ‌لاین CI/CD کلودفلر بلافاصله فعال می‌گردد.
