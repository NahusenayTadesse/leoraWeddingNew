# Bugs and risks found

Found while building the admin console (Oct 2026). Each item says how I know:

- **Observed**: I saw it happen (browser, curl or SQL).
- **Code**: read directly in the source; not run.
- **Unverified**: a suspicion worth checking, not a confirmed bug.

Status: **Fixed** = changed in code (see git history). **Open** = not touched.

---

## Security

### 1. Admin form actions were callable by any signed-in user: Fixed

- **Observed.** `src/routes/admin/+layout.server.ts` calls `requireAdmin`, but SvelteKit does not run layout `load` for form actions. `?/updateStatus` (vendors) and `?/edit` (subscription plans) had no check of their own, so any logged-in user could approve vendors or change plan prices.
- **Fix:** `guardAdmin` in `src/hooks.server.ts` now gates everything under `/admin` (loads, actions, endpoints).
- **Verified:** anonymous POST → login redirect; signed-in non-admin → 403.
- **Follow-up:** any new top-level admin area outside `/admin/*` needs its own guard.

### 2. `user.banned` was never enforced: Fixed

- **Code.** better-auth stores `banned` / `banExpires`, but without its admin plugin nothing acts on them. A "banned" user kept a working session.
- **Fix:** `banned` and `banExpires` declared as `additionalFields` in `src/lib/server/auth.ts`, and `hooks.server.ts` drops the session for banned users.
- **Verified:** banned test user redirected to `/login`; restored after unban.
- **Follow-up fix:** banning now also deletes the user's `session` rows. **Verified:** `get-session` returned a session before the ban and `null` after.

### 3. Dev `.env` points at a remote database: Open

- **Observed.** `DATABASE_URL` targets a remote host (database `wed`); a commented-out line shows a local `newwed` DB. Anyone running `npm run dev` writes to that shared server. Worth confirming it really is a throwaway DB, and giving each developer a local one.

---

## Data integrity

### 4. Booking payments can never become `confirmed`, so no commission, wallet or payout ever exists: Fixed

- **Code + Observed.** `src/routes/wedding/bookings/+page.server.ts` inserts `booking_payments` as `pending` with the message "shows as pending until the vendor confirms it". Nothing in the app confirms them: the vendor dashboard never references `booking_payments`. At baseline the dev DB had 2 booking payments, 0 `payment_commissions`, 0 `vendor_wallets`.
- **Effect:** commission revenue, vendor wallets and payouts, the Reports "commission" and "GMV" figures, and the whole payouts page stay at zero in production use.
- **Fix:** `src/lib/server/bookingPayments.ts` adds `confirmBookingPayment` / `failBookingPayment`. Confirming runs in one transaction under a row lock: sets `confirmed` + `paid_at`, computes the commission (per-vendor `vendor_commissions` override, else `commission_settings`), inserts `payment_commissions`, atomically credits `vendor_wallets`, and writes ledger rows (`credit` for the gross, `commission` for the cut). Exposed on the admin Payments page and on a new vendor page, `/vendor-dashboard/payments`, which only lets a vendor act on payments addressed to them.
- **Verified:** 10,000 → commission 1,000 / net 9,000; 333.33 → 33.33 / 300.00; wallet balance matched the ledger; two simultaneous confirms of one payment credited exactly once; confirming twice is refused; a vendor confirming another vendor's payment is refused; a payout of 5,000 completed against the earned wallet.
- **Not done:** couples still self-report payments (no gateway), so "confirmed" means a human said the money arrived. See `improvements.md` §1.2.

### 5. Cached vendor ratings disagree with `vendor_reviews`: Open

- **Observed.** `database/seed.sql` inserts vendors with `rating_avg`/`review_count` (e.g. 4.80 / 64) but no `vendor_reviews` rows. The first review insert or removal recomputes from real rows, so a vendor shown as 4.8 (64 reviews) drops to the true value. Per `docs/schema-conventions.md`, nothing else keeps these in sync.
- **Also:** no code outside the admin Reviews page writes `vendor_reviews` (`vendorDirectory.ts` only reads it), so there is currently no way for a couple to leave a review.
- **Heads-up:** I overwrote these counters on all vendors while cleaning up test data, then restored vendors 1–10 from `seed.sql`. Vendor 14 is not in the seed and reads 0.00 / 0; I could not confirm its original value.

### 6. Admin vendor list ignores soft deletes: Fixed

- **Code.** `src/routes/admin/vendors/+page.server.ts` selects from `vendors` with no `isNull(vendors.deletedAt)`, contrary to the rule in `docs/schema-conventions.md` ("filter `isNull(deletedAt)` always"). A soft-deleted vendor stayed listed and approvable. **Fix:** the query now filters `isNull(vendors.deletedAt)`; page loads (200) after the change, not tested with an actual soft-deleted row. (The new overview already filtered it.)

### 7. Coupons are never applied at checkout: Open

- **Code.** `grep` finds no use of `coupons`, `couponId` or `usesCount` outside the admin Coupons page. `payments.coupon_id` exists but nothing sets it, and `uses_count` / `max_uses` / `expires_at` are not checked anywhere. Coupons created in the admin do nothing yet.

### 8. Commission settings are never read: Fixed

- **Code.** `commission_settings` was not referenced outside the admin Settings page. It is now read when a payment is confirmed (see #4), so the rate takes effect for payments confirmed from then on.

### 9a. Vendor sidebar links to a page that does not exist: Open

- **Code.** `src/lib/components/vendorSidebar.svelte` has an "Availability" entry pointing at `/vendor-dashboard/availability`, but there is no such route in the repo (`git ls-files` shows none), so the link 404s. The `vendor_availability` table exists, so the page was probably planned. Either build it or remove the link.

---

## Tooling and developer experience

### 9. Type check has about 130 existing errors and about 90 warnings: Open

- **Observed** (`npm run check`, 68 files with problems; none in the files I added). Examples:
  - `src/lib/forms/ServiceCategory.svelte`: `ValidationErrors<{}>` has no `description`.
  - `src/routes/shop/+page.svelte:329`: `vendor: string | null` passed where `string` is required.
- Most warnings are Svelte's `state_referenced_locally` on `data` (`superForm(data.xForm)`, `$derived` candidates). On pages that re-run `load` after an action (`admin/vendors`, `admin/subscriptions`, several `vendor-dashboard` pages), a form seeded from `data` at init will not pick up new server data. Not confirmed to cause a visible bug.
- `src/lib/forms/AuthPanel.svelte` also has an unused CSS selector `.opt`.

### 10. Auth breaks on any port other than 5173: Open

- **Observed.** `ORIGIN` in `.env` is `http://localhost:5173` and `better-auth` uses it as `baseURL`. On port 5199, `POST /api/auth/sign-up/email` returned 404. Running a second project on 5173 (which happened here) silently breaks auth. Deriving the origin from the request in dev, or documenting `ORIGIN=… npm run dev`, would avoid this.

### 11. Blank pages after dev-server restarts: Open (dev only)

- **Observed.** After restarting `vite dev`, the browser sometimes rendered a blank page, with the console showing `Failed to hydrate … reading 'call'` and a rejected HMR websocket. A cache-ignoring reload fixed it every time. This looks like stale cached Vite dependency chunks, not app code. Not a production issue.

### 12. No automated tests: Open

- **Code.** `package.json` has no `test` script and there are no test files. The money-moving actions I added (payout completion, refund approval, review recompute) were checked by hand against a database only.

---

## Limitations of what I built (known, not yet fixed)

- **Month buckets may be off near month boundaries (Unverified).** Charts bucket with MySQL `DATE_FORMAT(col, '%Y-%m')` while labels are built from JS local dates. If the DB session timezone differs from the Node process timezone, a payment near midnight on the 1st can land in the neighbouring month.
- **Revenue is bucketed by `paid_at`.** Completed or confirmed payments with a null `paid_at` are silently excluded from charts.
- **Hard caps, no pagination.** Admin lists load at most 500 rows (users 1000), and search and filters run in the browser. Fine for now, not at scale.
- **Disputes are notes only.** Setting a dispute to `refunded` does not create a refund or touch the payment, and there is no admin button to open a refund yet.
- **Only `pending` bookings can be cancelled from admin.** Confirmed ones are refused on purpose (they may have payments), but there is no alternative path yet.
- **Refund approval is bookkeeping only.** It marks the payment `refunded`; no money moves through Chapa.
- **No confirmation dialog styling.** `ActionForm` uses `window.confirm`.
- **Banned and role changes take effect on the next request**, not instantly for open pages.
- **Light/dark:** overview and payouts checked in both themes; the other new pages share the same components but were not individually screenshotted in light mode.
