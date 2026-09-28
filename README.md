# GAME TROLL — Unified Platform

نسخه توسعه‌ی یکپارچه Game Troll بر پایه پروژه فعلی ساخته شده است و امکانات سالم قبلی را حفظ می‌کند.

## اجرا در Local

```bash
npm install
cp .env.example .env
npm start
```

برای Local می‌توان `DATABASE_URL` را خالی گذاشت تا SQLite در `DB_PATH` استفاده شود.

## Environment Variables در Render

- `ADMIN_USER` — نام کاربری مدیر
- `ADMIN_EMAIL` — ایمیل مدیر
- `ADMIN_PASSWORD` — رمز اولیه مدیر؛ فقط در Environment Variables
- `SESSION_SECRET` — کلید تصادفی طولانی؛ Secret
- `DATABASE_URL` — اتصال PostgreSQL؛ Secret
- `NODE_ENV=production`

## Render

Branch نسخه آزمایشی: `development`

Health check: `/api/health`

Dockerfile به‌صورت خودکار `npm install --omit=dev` و `node server.js` را اجرا می‌کند.

## Migration / Backup

قبل از هر تغییر Production از PostgreSQL با `pg_dump` بکاپ بگیرید. فایل `migrations/001_unified_platform.sql` مستندکننده‌ی هسته Migration است و `db.js` نیز Migrationهای idempotent را هنگام startup اجرا می‌کند.

نمونه Backup:

```bash
pg_dump "$DATABASE_URL" > backup.sql
```

Restore فقط در محیط تست انجام شود:

```bash
psql "$TEST_DATABASE_URL" < backup.sql
```

Backup را هرگز داخل Repository یا مسیر عمومی سایت قرار ندهید.

## قابلیت‌های اصلی

- حساب کاربری و نقش‌های user/admin
- Hash رمز با bcrypt
- Session Token با انقضا
- Rate Limit، Helmet و اعتبارسنجی Backend
- Games / Packs / News / Tutorials
- Platform و Console مستقل
- Favorites متصل به حساب و Merge مهمان
- Search چندفیلتره API
- Orders متصل به کاربر و کنترل Backend
- Support Tickets و پیام‌های دوطرفه
- Notifications و تنظیمات اعلان
- Ratings و Reviews با Moderation
- مدیریت کاربران و نقش‌ها
- Audit Log
- Site Status
- Upload تصویر محدود به MIME و حجم
- 400/401/403/404/422/429/500 API handling
- حفظ داده‌های قبلی از طریق migrationهای سازگار

## محدودیت‌های نیازمند تنظیم زیرساخت

1. بازیابی رمز عبور: برای ارسال ایمیل واقعی باید SMTP/Provider و Secretهای آن در Render تنظیم و ارسال ایمیل به endpoint reset متصل شود. توکن فعلاً در لاگ سرور برای محیط توسعه ثبت می‌شود.
2. Backup خودکار: برای PostgreSQL تولیدی، Scheduled Job یا سرویس Backup خارجی امن تنظیم شود؛ Secret داخل کد قرار نگیرد.
3. Upload روی Render Free محلی و دائمی نیست؛ برای Production بهتر است Object Storage مانند S3-compatible storage تنظیم شود.
4. پرداخت واقعی به درگاه خارجی نیاز دارد؛ ساختار سفارش Backend آماده است و فعال‌شدن دسترسی فقط پس از وضعیت Backend انجام می‌شود.
