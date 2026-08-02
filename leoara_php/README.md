# Leora Events — Production Deployment Guide

This package has moved from a static HTML prototype to a real PHP + MySQL
application. Personalized features (Dashboard, Budget Estimator) now require
a real account and read/write a real database — there is no sample or mock
data anywhere in the authenticated experience.

**Requirements:** cPanel hosting with PHP 8.0+ and a MySQL 5.7+/MariaDB 10.3+
database. No Composer or Node build step is required to run what's here.

---

## 0. Fixed since last delivery: the blanket 403 error

The earlier `.htaccess` (root and the one inside `config/`, `includes/`,
`database/`) mixed Apache 2.4 syntax (`Require all denied`) with Apache 2.2
syntax (`Order deny,allow` / `Deny from all`) **in the same block**. On a
server that only loads one of those two authorization modules, the other
directive is unrecognized — Apache treats the whole file as broken, which
commonly shows up as a 403 (sometimes 500) across the *entire* site, not
just the folders being protected. This is fixed: every access-control block
is now wrapped in `<IfModule>` so only the directive your server actually
understands gets applied.

If you still see a 403 after re-uploading these files, it's almost always
one of these two things instead:

1. **File/folder permissions got mangled during upload/extraction.**
   Directories need `755` and files need `644` for Apache to serve them.
   Fix via cPanel File Manager (select all → Permissions) or SSH:
   ```
   find /home/USER/public_html -type d -exec chmod 755 {} \;
   find /home/USER/public_html -type f -exec chmod 644 {} \;
   ```
2. **You're deploying into a subfolder**, not the domain root (e.g.
   `public_html/leora/` instead of `public_html/`). The API calls in
   `assets/js/auth.js` and the pages use root-relative paths like
   `/api/auth/login.php`. If your site isn't at the domain root, either
   move it to the root, or point those `fetch()` calls at
   `/leora/api/...` instead (search the codebase for `'/api/'`).

## 1. Login methods — now three ways in

`leora-events-login.html` now offers:
- **Email + password** (unchanged, with verification/reset emails)
- **Sign in with Google** — no password to manage; verified server-side
  against Google's tokeninfo endpoint (no Composer library needed)
- **Phone number + SMS code (OTP)** — good fit for guests who'd rather not
  use email at all

### Enabling Google Sign-In
1. Go to https://console.cloud.google.com/apis/credentials, create an
   **OAuth Client ID** of type "Web application".
2. Under **Authorized JavaScript origins**, add your real domain, e.g.
   `https://yourdomain.com` (and `http://localhost` if testing locally).
3. Copy the Client ID into `.env` as `GOOGLE_CLIENT_ID=...`. No client
   secret is needed — the browser gets a signed token straight from Google
   and `Auth::loginWithGoogleIdToken()` verifies it server-side.
4. If `GOOGLE_CLIENT_ID` is left blank, the Google button simply doesn't
   render — nothing breaks.

### Enabling Phone OTP
Shared hosting has no built-in way to send SMS, so you need a gateway.
`includes/SmsSender.php` ships with two drivers:
- `SMS_DRIVER=log` (default) — writes the code to the PHP error log instead
  of texting it. **Fine for testing, not for production.**
- `SMS_DRIVER=http` — posts to any REST-style gateway. Fill in
  `SMS_API_URL` and `SMS_API_KEY` in `.env`, and adjust the payload shape in
  `SmsSender::sendHttp()` to match your provider (AfroMessage, GeezSMS,
  Twilio, etc. all use slightly different request formats — the method is a
  template, not a finished integration for a specific provider).

### If you already deployed the earlier schema
Run `database/migration_002_alt_login.sql` (via phpMyAdmin's SQL tab, or
`mysql -u USER -p DBNAME < database/migration_002_alt_login.sql`) instead of
re-importing the whole `schema.sql` — it adds the `phone`/`google_id`
columns and the `phone_otps` table without touching your existing data. A
fresh install can just import `schema.sql` as normal; it already includes
everything.

---



- **Database schema** — `database/schema.sql`. Every table from your spec
  (users, profiles, couples, wedding_plans, wedding_events, vendors,
  vendor_categories, vendor_packages, vendor_reviews, saved_vendors,
  budget_categories, budget_items, budget_comparisons, guest_lists,
  seating_plans/tables, tasks, task_categories, notes, notifications,
  messages, files, subscription_plans, subscriptions, payments, coupons,
  activity_logs) with foreign keys, indexes, timestamps and soft deletes.
  The only rows it seeds are reference/taxonomy data (roles, vendor
  categories, default budget categories, task categories, plan catalog) —
  never a fake user, wedding, guest, or vendor.
- **Authentication** — `includes/Auth.php` + `api/auth/*.php`. Real
  registration, bcrypt password hashing, session-based login, "remember me"
  tokens, email verification, password reset, login lockout after repeated
  failures, activity logging.
- **`dashboard.php`** — logged-out visitors see a feature preview with
  Login/Register CTAs and *no* sample data. Logged-in users see their own
  countdown, progress %, budget totals, guest counts, saved vendors, task
  list and wedding-event timeline, queried live from the database.
- **`budget-estimator.php`** — a real standalone page (not a homepage widget)
  with both modes:
  - **Mode 1 (vendor comparison):** Free plan = 2 vendors per comparison and
    3 comparisons total; Golden/Platinum = 5 vendors, unlimited comparisons.
    Enforced server-side in `api/vendors/compare.php`, not just in the UI.
  - **Mode 2 (personal budget planner):** fully private per couple, saved to
    `budget_items`/`budget_categories`, CRUD via `api/budget/*.php`.
- **`checkout.php`** — requires login, validates real coupon codes against
  the `coupons` table, and on completion writes real `payments` and
  `subscriptions` rows tied to the logged-in couple.
- **Guests** — `api/guests/index.php` full CRUD, scoped to the logged-in
  couple only (every query is filtered by `couple_id`).
- **Vendor browsing** — `api/vendors/list.php` is public (no login required),
  matching "Free: browse all vendors."

## 2. What's scaffolded and needs one more step before go-live

- **Payment gateway** — `api/billing/checkout.php` records payments as
  `completed` immediately. There is no live gateway call yet. Wire in
  Telebirr, CBE Birr, or an aggregator (Chapa, SantimPay, Stripe) and flip
  the payment status from `pending` → `completed` in that gateway's
  server-to-server callback instead. The file has a comment block marking
  exactly where.
- **Transactional email** — `includes/Mailer.php` uses PHP's built-in
  `mail()`, which works on most cPanel accounts out of the box but has
  average deliverability. For production-grade delivery, `composer require
  phpmailer/phpmailer` and swap the body of `Mailer::send()` — the SMTP_*
  values are already read from `.env` and ready to use.
- **Remaining pages** (Marketplace, Vendor Portal, Vendor Onboarding,
  Messages, Account Settings, Admin Console, Leora Card) are still the
  earlier static HTML/JS versions. The backend (schema + API endpoints) is
  in place for guests, budget, vendors and billing; wiring these specific
  pages to fetch/save through those APIs the same way `dashboard.php` and
  `budget-estimator.php` do is the natural next slice of work — ask and I'll
  continue converting them in the same pattern.
- **Vendor/admin data entry** — the vendor marketplace has no rows until
  real vendors sign up and get approved (or you add some via phpMyAdmin).
  This is intentional per "no mock data," but it means the comparison tool
  will show an empty state until then.

---

## 3. Deploy to cPanel

### Step 1 — Create the database
1. cPanel → **MySQL Databases** → create a database (e.g. `leora`) and a
   user with a strong password, then add that user to the database with
   **ALL PRIVILEGES**. cPanel will prefix both names, e.g.
   `cpuser_leora` / `cpuser_leorauser`.

### Step 2 — Import the schema
1. cPanel → **phpMyAdmin** → select your new database → **Import** →
   choose `database/schema.sql` → Go.
   (Or via SSH: `mysql -u cpuser_leorauser -p cpuser_leora < database/schema.sql`)

### Step 3 — Upload the files
1. cPanel → **File Manager** → open `public_html` (or your subdomain's
   folder).
2. Upload everything in this package **except** `database/schema.sql` isn't
   needed after import, but it's fine to leave it — the `.htaccess` rules
   already block direct web access to `/database/`, `/config/` and
   `/includes/`.

### Step 4 — Configure environment variables
1. Copy `.env.example` to `.env` (same root folder, next to `.htaccess`).
2. Fill in `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASS` with the values from
   Step 1.
3. Set `APP_URL` to your real domain (e.g. `https://leoraevents.et`) —
   verification and reset-password emails link back to this.
4. Set `APP_KEY` to any random 32+ character string.
5. Confirm `MAIL_FROM_ADDRESS` is an address on your domain.

### Step 5 — Verify PHP version & extensions
cPanel → **MultiPHP Manager** → select PHP **8.0 or newer** for the domain.
The app needs the `pdo_mysql`, `mbstring` and `json` extensions, which are
enabled by default on virtually all cPanel PHP builds.

### Step 6 — Test
1. Visit `yourdomain.com/leora-events-login.html?mode=signup` and register
   an account.
2. Check the inbox for the verification email (check spam — see the Mailer
   note above if it doesn't arrive).
3. Click the verification link, log in, and visit `dashboard.php` — you
   should see your own empty dashboard, not sample data.
4. Add a budget item on `budget-estimator.php` and confirm it appears
   in phpMyAdmin under `budget_items`.

---

## 4. Security notes already baked in

- Every SQL query uses PDO prepared statements — no string-concatenated SQL.
- Passwords are hashed with bcrypt (`password_hash`/`password_verify`).
- Sessions are `httponly`, `samesite=Lax`, and regenerated on login.
- CSRF tokens are required on every state-changing API call
  (`X-CSRF-Token` header, checked in `csrf_guard()`).
- `/config`, `/includes`, `/database` and `.env` are blocked from direct web
  access both via the root `.htaccess` and a `Require all denied` in each
  folder, so even a misconfigured host won't leak credentials.
- Every couple-scoped query filters by `couple_id` derived from the
  session — one user can never read or write another couple's data.
- Login lockout after 5 failed attempts (15-minute cooldown) and generic
  error messages that don't reveal whether an email is registered.

## 5. File map (new since the prototype)

```
.env.example
config/config.php          — .env loader, app constants
config/database.php        — PDO connection
database/schema.sql        — full MySQL schema + reference-data seeds
includes/bootstrap.php     — session start, include this first on any page/API
includes/Auth.php          — register/login/logout/verify/reset + Google + phone OTP
includes/Mailer.php        — verification + reset emails
includes/SmsSender.php     — phone OTP delivery (log driver / http driver template)
includes/helpers.php       — json_response, csrf, current_couple(), etc.
api/auth/*.php             — register, login, logout, me, forgot/reset password, config
api/auth/google.php        — Google Sign-In token verification
api/auth/phone/*.php       — request-otp, verify-otp
database/migration_002_alt_login.sql — adds phone/Google login to an existing DB
api/dashboard/summary.php  — dashboard data (also used by dashboard.php directly)
api/budget/categories.php, items.php
api/vendors/list.php, compare.php
api/guests/index.php
api/billing/validate-coupon.php, checkout.php
assets/js/auth.js          — shared fetch helpers for every page
dashboard.php               — replaces the old leora-events-dashboard.html
budget-estimator.php        — new standalone page
checkout.php                 — replaces the old leora-events-checkout.html
verify-email.php, reset-password.php — email link landing pages
```
