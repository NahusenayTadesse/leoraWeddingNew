# Bugs and risks

Updated 2026-10-20 after the production-readiness pass (branch `production-readiness`).
**Fixed** = changed in code and verified (manually and/or by the test suite). **Open** = not done.

## From the original list

| #   | Issue                                              | Status                                                                                                                                                          |
| --- | -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Admin actions callable by any user                 | Fixed earlier; now per-permission (see `src/lib/access.ts`)                                                                                                     |
| 2   | `user.banned` not enforced                         | Fixed earlier                                                                                                                                                   |
| 3   | Dev `.env` points at a remote database             | **Open (your call)** — `.env` was left untouched. `.env.example` and the README now point at a local `leora_dev`; tests refuse any database not named `*_test`. |
| 4   | Booking payments never confirmed                   | Fixed — Chapa verify or staff-confirmed transfer receipts; commission, wallet and ledger in one transaction (tested)                                            |
| 5   | Cached ratings disagree with reviews               | Fixed — demo vendors moved to `database/demo.sql` with zero ratings; reviews only from real clients, recomputed in the same transaction                         |
| 6   | Admin vendor list ignored soft deletes             | Fixed earlier                                                                                                                                                   |
| 7   | Coupons never applied                              | Fixed — applied at plan checkout, validated, counted on settlement (tested)                                                                                     |
| 8   | Commission settings never read                     | Fixed earlier                                                                                                                                                   |
| 9a  | Vendor sidebar linked to missing availability page | Fixed — `/vendor-dashboard/availability` exists                                                                                                                 |
| 9   | ~130 type errors / ~90 warnings                    | Fixed — `npm run check` 0/0; ESLint and Prettier clean; CI enforces all three                                                                                   |
| 10  | Auth broke on ports other than 5173                | Fixed — dev uses the request's localhost origin                                                                                                                 |
| 11  | Blank pages after dev restarts                     | Open (dev only, Vite cache)                                                                                                                                     |
| 12  | No automated tests                                 | Fixed — 27 unit + DB tests for money paths, claims, contracts, review eligibility                                                                               |

## Found and fixed during the pass

- Plan checkout: confirm token was editable to activate a pricier plan; pending checkouts marked failed; double activation race; no callback/webhook.
- Paid vendor plans became active at onboarding without payment.
- Vendors could see every couple and add bookings (any price/status) to any wedding.
- Anonymous POSTs reached `/wedding` and vendor-dashboard actions (500s); signed-in areas now gated in hooks.
- Receipts and contracts were reachable through the public `/files` route; now served only to the parties and staff.
- AI chat: vendor search referenced non-existent columns (always failed), rendered replies as raw HTML, prompt had placeholder contact details and dead links, Gemini rejected the `function` role.
- Contact form never worked (field names, missing env import, leaked DB errors).
- About page and parts of contact/accordion content were copied from a bakery site.
- `database/seed.sql` lost its COMMIT (fresh seeds rolled back) — caught by testing a fresh install.
- Partial refunds marked the whole payment refunded; a correlated subquery matched the wrong `id`.
- adapter-node's 512K body limit silently dropped receipt photos (`BODY_SIZE_LIMIT=12M` now documented and set in Docker).
- Broken `/budget` route (500), dead links (`/w/{slug}`, `/venues`, `/dashboard/change-password`), stale service detail state between pages.

## Still open / known limitations

- **Refund money** is returned outside the app (Chapa dashboard or transfer); approval only records it and debits the vendor's wallet share.
- **Dispute → refunded** does not create a refund automatically.
- **Admin can only cancel pending bookings.**
- **Chart month buckets** use the database session time zone (unverified near month boundaries).
- **Rate limits are in memory**, per process — move to Redis/DB if you run several instances.
- **Plan limits** (`max_bookings`) are not enforced, and vendor listings are not gated on having a plan — business decisions left to you.
- **Chapa** was tested end to end in test mode only; check the live key and the webhook signature header against your Chapa account.
- **Translations**: the Amharic was written by me and needs review by a native speaker; the admin console, vendor dashboard and legal pages are English only.
- **The live database** (`91.204.209.7/wed`) was never touched. It needs `scripts/baseline-migrations.mjs` + `npm run db:migrate` (after a backup) before deploying this branch.
