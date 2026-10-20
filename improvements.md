# Improvements

Updated 2026-10-20. Status of the original suggestions, then what's worth doing next.

## Done

**Money flow:** payment confirmation (Chapa verify + transfer receipts), Chapa for bookings and plans, bank accounts managed in admin, vendor payout requests, couple refund requests and disputes, coupons at checkout, reviews limited to real clients, vendor plans with featured placement, refunds debiting the vendor wallet, reconcile/expiry/reminder jobs.

**Admin:** notifications on vendor approval/rejection/suspension, refunds, disputes, payouts; audit entries for vendor status and plan edits; granular permissions with a Support role; two-step verification required for staff; contact inbox workflow; receipt review queue; vendor detail page; bulk approve/reject; 30-day trends on the overview. (Server-side paging and CSV export were already in place via the admin kit.)

**Reliability:** tests for money paths, CI (lint, type check, tests, build), zero type errors, local-database setup, origin-independent auth in dev, migrations instead of `push` (with a baseline script for existing databases), Docker image and compose file, central error logging with reference ids, security headers and CSP.

**Product:** availability calendar (vendor and public), contracts with e-signatures, vendor quotes couples can accept, events timeline, seating plan, saved vendors with comparison, Amharic (public site and couple area), email verification and password reset, in-app notifications, SEO (sitemap, structured data, link previews), accessibility (Lighthouse 100 on key pages).

## Next

1. **Native review of the Amharic**, then extend it to the vendor dashboard (many vendors will prefer it).
2. **Legal pages** reviewed by a lawyer for Ethiopian e-commerce and payments, then translated.
3. **Automatic refunds through Chapa** (refund API) instead of manual returns, and a "refund" outcome on disputes.
4. **Shared rate limiting / job lock** (Redis or a DB table) before running more than one app instance.
5. **Plan rules**: decide whether vendors need a plan to be listed and enforce `max_bookings` if so.
6. **Monitoring**: ship logs to a service (Sentry, Logtail) and alert on payment verify failures.
7. **Telebirr / CBE Birr direct**, if Chapa fees matter at volume.
8. **Couple invitations**: invite the second partner by link (`couples.partner2_user_id` exists; no UI yet).
9. **Public wedding page / RSVP links** — the Leora Card page promises live RSVP; guests can't respond online yet.
10. **Mobile pass on admin tables** (they scroll horizontally today).
