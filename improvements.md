# Suggested improvements

Ordered by what I think matters most. Items marked **(admin)** extend the new admin console; the rest are site-wide. Each item notes where the idea came from in the code. See `bugs.md` for the defects behind several of these.

---

## 1. Finish the marketplace money flow (highest value)

The admin pages for commissions, payouts and refunds are built but have nothing to manage yet, because the rest of the app never fills those tables (see `bugs.md` #4, #7, #8).

1. **Payment confirmation.** Vendor-side and admin-side "confirm payment" that, in one transaction: marks `confirmed`, computes commission from `commission_settings`, writes `payment_commissions`, credits `vendor_wallets`, logs a `wallet_transactions` row.
2. **Real payment gateway for vendor bookings.** Couples currently self-report payments with a free-text reference. Plan checkout already uses Chapa (`src/lib/server/chapa.ts`); reusing it for bookings would make `confirmed` something the gateway decides, not someone typing a reference. The schema comment already says only the gateway callback may complete a payment.
3. **Vendor payout requests.** A "Request payout" button in the vendor dashboard that creates `vendor_payouts`, with the wallet balance shown there (the vendor dashboard already reads `vendor_wallets`).
4. **Couple-initiated refund and dispute forms**, so the admin Refunds and Disputes pages receive real input.
5. **Apply coupons at plan checkout**, validating `is_active`, `expires_at`, `max_uses`, then incrementing `uses_count` atomically and setting `payments.coupon_id` / `discount_amount`.
6. **Let couples review vendors** after a completed booking. `vendor_reviews` exists and the admin can moderate, but no UI writes reviews. Recompute `rating_avg` in the same transaction (see `docs/schema-conventions.md`).

## 2. Admin console follow-ups **(admin)**

- **Notify on decisions.** Email the vendor when approved, rejected or suspended (`src/lib/server/email.ts` exists), and the couple on refund/dispute outcomes. The `notifications` table exists but nothing uses it.
- **Audit coverage.** Vendor approval and plan-price edits (the two older actions) do not write to the activity log; only the new pages do. Route them through `audit()`.
- **Granular admin roles.** `permissions`, `role_permissions` and `special_permissions` are in the schema and seeded (e.g. `payment.view`), but `requireAdmin` only checks the role name `'Admin'`. Using permissions would allow a support role that can reply to messages but not complete payouts.
- **Server-side pagination, sorting and search** for users, bookings, payments and the activity log (currently capped client-side lists).
- **CSV/PDF export on every table**, not just Reports. `papaparse` and `jspdf` are already dependencies, and `Table/data-table.svelte` already exports.
- **Dashboard date-range and comparisons:** period-over-period deltas on KPI tiles, and a conversion funnel (signup → plan created → booking → paid).
- **Vendor drill-down page:** one screen per vendor with bookings, payments, wallet, reviews, disputes, and a status history.
- **Contact messages:** add read / replied / assigned state (the table has none) so the inbox can be worked, not just read.
- **Bulk actions** (approve several vendors, bulk-remove spam reviews).
- **Admin 2FA and session list**, plus rate limiting on `/login`. Admin sign-in currently shares the public login card via a role tab.
- **Replace `window.confirm`** in `ActionForm` with the existing `alert-dialog` component.
- **Revoke sessions on ban** (see `bugs.md` #2).
- **Mobile layout pass** for the admin tables; they scroll horizontally but were not tuned for phones.

## 3. Reliability and quality

- **Tests for money paths.** Payout completion, refund approval, commission calculation, coupon redemption and review recompute are all "wrong money without an error" code. Add Vitest integration tests against a throwaway database, and run `npm run check` in CI.
- **Burn down the type-check backlog** (~130 errors); start with the real nullability issues (e.g. `shop/+page.svelte`) and the `state_referenced_locally` warnings on pages that re-run `load`.
- **Fix or replace the shared dev database** and document a local setup (a `docker compose` MariaDB plus `database/seed.sql`).
- **Make auth origin-independent in dev** (`bugs.md` #10).
- **Soft-delete audit:** sweep queries for missing `isNull(deletedAt)` (`admin/vendors` is one).
- **Idempotent webhooks:** the plan flow already uses a unique `transaction_ref`; give booking payments the same treatment when the gateway is added.
- **Monitoring:** log errors from server actions centrally; today failures go to `console.error`.

## 4. Product ideas for the public site

These come from what the schema already supports but the UI does not use:

- **Vendor promotions and featured listings.** `vendor_promotions`, `is_featured` and plan flags like `featured_listing` exist; a self-serve purchase flow would add revenue.
- **Contracts and e-signature.** `contracts` has `signed_by_couple` / `signed_by_vendor` columns that no page uses.
- **Quotes.** `vendor_quotes` exists for vendor price proposals before booking.
- **Saved vendors and comparison.** `saved_vendors` and a compare view exist in the PHP version (`leoara_php/api/vendors/compare.php`); worth checking parity in the SvelteKit app.
- **Availability calendar** surfaced to couples when booking (`vendor_availability` exists).
- **Seating plans and wedding events** (`seating_plans`, `wedding_events`) as planner features.
- **Amharic / localization:** the schema notes UTF-8 for Amharic, but I did not see language switching in the UI.
- **Performance:** I did not measure the public pages. A Lighthouse pass on the home and marketplace pages would be a cheap way to find out (the chrome-devtools tooling is available here).

## 5. Housekeeping

- **`leoara_php/` duplicates the app** in PHP, including its own admin HTML. Decide whether it is still needed or archive it, so fixes aren't made twice.
- **`.continue/`, `.vscode/mcp.json` and `.mcp.json`** are committed editor/tool configs; check they are meant to be shared.
- **Setup docs:** I did not read the README. Whatever it says, the `ORIGIN` requirement, DB creation (`CHARACTER SET utf8mb4`) and `db:push` + seed steps (currently split between `docs/schema-conventions.md` and `database/seed.sql`) belong in one place.
- **Commit the admin work in reviewable pieces:** guard + auth change, charts/overview, reports, then each management page.
