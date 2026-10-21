# Improvements

Updated 2026-10-20. Status of the original suggestions, then what's worth doing next.

## Done

**Money flow:** payment confirmation (Chapa verify + transfer receipts), Chapa for bookings and plans, bank accounts managed in admin, vendor payout requests, couple refund requests and disputes, coupons at checkout, reviews limited to real clients, vendor plans with featured placement, refunds debiting the vendor wallet, reconcile/expiry/reminder jobs.

**Admin:** notifications on vendor approval/rejection/suspension, refunds, disputes, payouts; audit entries for vendor status and plan edits; granular permissions with a Support role; two-step verification required for staff; contact inbox workflow; receipt review queue; vendor detail page; bulk approve/reject; 30-day trends on the overview. (Server-side paging and CSV export were already in place via the admin kit.)

**Reliability:** tests for money paths, CI (lint, type check, tests, build), zero type errors, local-database setup, origin-independent auth in dev, migrations instead of `push` (with a baseline script for existing databases), Docker image and compose file, central error logging with reference ids, security headers and CSP.

**Product:** availability calendar (vendor and public), contracts with e-signatures, vendor quotes couples can accept, events timeline, seating plan, saved vendors with comparison, Amharic (public site and couple area), email verification and password reset, in-app notifications, SEO (sitemap, structured data, link previews), accessibility (Lighthouse 100 on key pages), the Leora Card (three themes, publish on Golden/Platinum, personal guest links with RSVP, QR entry passes and door check-in by camera or list).

**Marketplace (2026-10-21):** vendor money held until delivery (couple confirms, or 3 days after the event with no open dispute; staff can release early from Admin → Bookings); `completed` booking status; vendor cancellation policies (flexible / moderate / strict) with refunds raised automatically on cancellation; deposit % and balance due date per vendor, with reminders; contact details hidden in messages and on listings until a booking is confirmed, and vendors can only message couples who contacted them; directory filters for free date, guest count and budget; staff-granted Verified badge with a stated meaning; vendor replies to reviews; review requests after completion; "usually replies within" badge; 30-day vendor funnel (views, saves, inquiries, bookings).

**Celebration features (2026-10-21):** Ethiopian calendar across displayed dates (the user's choice from any kit date input, the other on hover; both on the invitation and dashboard) using admin-kit's `calendars`; wedding-date hints for Orthodox fasts, Ramadan, peak season and Kiremt (`$lib/weddingSeasons`); money gifts through Chapa from the invitation with couple payouts (`/wedding/gifts`, `/admin/gifts`, `GIFT_FEE_PERCENT`); photo wall with a table QR link and a projector slideshow, blessings and song requests (`/wedding/guestbook`, `/i/<slug>/wall`); live "now / next" on the invitation on the day; one-click traditional wedding week (Shimgilina → Kelekel); milestone badges with sharing; inspiration boards with save-from-vendor and a read-only link for vendors; the AI assistant reads the signed-in couple's own plan.

## Next

1. **Native review of the Amharic**, then extend it to the vendor dashboard (many vendors will prefer it).
2. **Legal pages** reviewed by a lawyer for Ethiopian e-commerce and payments, then translated.
3. **Automatic refunds through Chapa** (refund API) instead of manual returns, and a "refund" outcome on disputes.
4. **Shared rate limiting / job lock** (Redis or a DB table) before running more than one app instance.
5. **Plan rules**: decided to keep listing free for now. `REQUIRE_VENDOR_PLAN=true` (off by default) lists only vendors with an active plan and enforces `max_bookings`; switch it on when plans should be required.
6. **Monitoring**: ship logs to a service (Sentry, Logtail) and alert on payment verify failures.
7. **Telebirr / CBE Birr direct**, if Chapa fees matter at volume.
8. ~~**Couple invitations**~~ Done: partner 1 shares a `/join/<code>` link from Couple details; the partner signs up or signs in and joins (an empty signup workspace is retired, a real one is never merged). New link and remove partner are on the same card.
9. **Mobile pass on admin tables** (they scroll horizontally today).
