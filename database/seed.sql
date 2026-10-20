-- ============================================================================
-- LEORA EVENTS — DATA SEED
--
-- Data only. Run this AFTER the tables exist (drizzle-kit migrate/push).
--
--   mariadb -u USER -p DBNAME < database/seed.sql
--   mysql    -u USER -p DBNAME < database/seed.sql
--
-- Safe to re-run: verified idempotent over three consecutive runs. Reference
-- rows use INSERT IGNORE against a unique key; the two role-permission grants
-- use NOT EXISTS because that table has no unique key to ignore against.
-- Re-running never duplicates and never overwrites edits you have made — rename
-- something in the admin UI and this file leaves your version alone.
--
-- Explicit ids are used throughout so foreign keys between sections stay
-- stable no matter what order you run things in.
--
-- WHAT IS IN HERE
--   Sections 1-10  Reference data. The app needs these rows to function —
--                  taxonomies, the plan catalog, locations, commission rate.
--   Demo vendors live in database/demo.sql (development only).
--
-- NOT IN HERE: user accounts. better-auth owns `user`, `account` and
-- `session` — it hashes passwords and generates ids at signup. Hand-written
-- rows there would not be loggable-into. Register through /signup instead,
-- then grant yourself Admin with the query at the bottom of this file.
-- ============================================================================

SET NAMES utf8mb4;
SET @OLD_AUTOCOMMIT = @@AUTOCOMMIT;
SET AUTOCOMMIT = 0;
START TRANSACTION;


-- ============================================================================
-- 1. ROLES
-- The app checks for the exact string 'Admin' (src/routes/login/+page.server.ts
-- and signup/+page.server.ts) — do not rename that row.
-- Note: signup does not assign a role, so new users start with role_id NULL.
-- ============================================================================

INSERT IGNORE INTO roles (id, name, description) VALUES
  (1, 'Admin',   'Platform administrator — full access to the admin console'),
  (2, 'Couple',  'Couple planning their wedding'),
  (3, 'Bride',   'Bride / primary wedding organizer'),
  (4, 'Groom',   'Groom / primary wedding organizer'),
  (5, 'Planner', 'Independent or in-house wedding planner'),
  (6, 'Vendor',  'Business offering wedding services');


-- ============================================================================
-- 2. PERMISSIONS + ROLE GRANTS
-- Managed from the admin UI afterwards; this is a working starting set.
-- ============================================================================

INSERT IGNORE INTO permissions (id, name, description) VALUES
  (1,  'vendor.view',        'View vendor listings in the admin console'),
  (2,  'vendor.approve',     'Approve, reject or suspend a vendor listing'),
  (3,  'vendor.edit',        'Edit any vendor listing'),
  (4,  'service.manage',     'Create and edit service catalog entries'),
  (5,  'order.view',         'View all orders across vendors'),
  (6,  'order.manage',       'Change order and fulfilment status'),
  (7,  'payment.view',       'View payments, commissions and payouts'),
  (8,  'payment.refund',     'Approve refunds'),
  (9,  'payout.manage',      'Process vendor payouts'),
  (10, 'coupon.manage',      'Create and deactivate coupon codes'),
  (11, 'plan.manage',        'Edit the subscription plan catalog'),
  (12, 'user.view',          'View user accounts'),
  (13, 'user.manage',        'Ban, unban and assign roles'),
  (14, 'role.manage',        'Create roles and assign permissions'),
  (15, 'dispute.manage',     'Review and resolve disputes'),
  (16, 'content.manage',     'Edit testimonials, homepage media and categories'),
  (17, 'activity.view',      'Read the activity log');

-- These two use NOT EXISTS rather than INSERT IGNORE. `role_permissions` has
-- no unique key on (role_id, permission_id), so IGNORE has nothing to dedupe
-- against and a second run would grant every permission twice.

-- Admin gets everything.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 1, p.id FROM permissions p
WHERE NOT EXISTS (
  SELECT 1 FROM role_permissions rp WHERE rp.role_id = 1 AND rp.permission_id = p.id
);

-- Vendors get the read-only slice their own portal needs.
INSERT INTO role_permissions (role_id, permission_id)
SELECT 6, p.id FROM permissions p
WHERE p.name IN ('order.view', 'payment.view')
  AND NOT EXISTS (
    SELECT 1 FROM role_permissions rp WHERE rp.role_id = 6 AND rp.permission_id = p.id
  );


-- ============================================================================
-- 3. VENDOR CATEGORIES  (marketplace taxonomy)
-- `slug` is what /vendors?category=… filters on — treat it as a stable key.
-- ============================================================================

INSERT IGNORE INTO vendor_categories (id, name, slug, icon, description, sort_order) VALUES
  (1, 'Hotel & Venue',             'venue',         '🏨', 'Reception halls, hotels and outdoor venues', 1),
  (2, 'Photography & Video',       'photography',   '📷', 'Photographers, videographers and same-day edits', 2),
  (3, 'Decor & Florals',           'decor',         '💐', 'Stage design, florals, lighting and rentals', 3),
  (4, 'Catering',                  'catering',      '🍽️', 'Full-service catering, injera stations and cakes', 4),
  (5, 'Attire & Beauty',           'attire',        '👗', 'Habesha kemis, suits, makeup and hair', 5),
  (6, 'Entertainment',             'entertainment', '🎶', 'DJs, live bands, azmari and traditional dancers', 6),
  (7, 'Transportation',            'transport',     '🚗', 'Bridal cars, guest shuttles and convoys', 7),
  (8, 'Leora Card & Invitations',  'invitations',   '💌', 'Digital invitations, printing and RSVP management', 8);


-- ============================================================================
-- 4. BUDGET CATEGORY TEMPLATES
-- couple_id NULL + is_system = 1 means "every couple sees this".
-- Reads must match `couple_id = :id OR is_system = 1` — see
-- docs/schema-conventions.md.
-- ============================================================================

INSERT IGNORE INTO budget_categories (id, couple_id, name, description, icon, sort_order, is_system) VALUES
  (1, NULL, 'Venue & Catering',           'Hall hire, food, drinks and service staff',      '🏨', 1, 1),
  (2, NULL, 'Photography & Video',        'Coverage, albums, drone and same-day edit',      '📷', 2, 1),
  (3, NULL, 'Decor & Florals',            'Stage, florals, lighting and rentals',           '💐', 3, 1),
  (4, NULL, 'Attire & Beauty',            'Dresses, suits, jewellery, makeup and hair',     '👗', 4, 1),
  (5, NULL, 'Entertainment',              'DJ, band, azmari and traditional dancers',       '🎶', 5, 1),
  (6, NULL, 'Invitations & Leora Card',   'Digital and printed invitations, RSVP',          '💌', 6, 1),
  (7, NULL, 'Transportation',             'Bridal car, guest shuttles and fuel',            '🚗', 7, 1),
  (8, NULL, 'Other',                      'Anything that does not fit the categories above','📦', 8, 1);


-- ============================================================================
-- 5. TASK CATEGORIES
-- ============================================================================

INSERT IGNORE INTO task_categories (id, name, icon, sort_order, is_system) VALUES
  (1, 'Venue & Logistics',     '🏨', 1, 1),
  (2, 'Vendors',               '🤝', 2, 1),
  (3, 'Attire & Beauty',       '👗', 3, 1),
  (4, 'Guests & Invitations',  '💌', 4, 1),
  (5, 'Legal & Documents',     '📄', 5, 1),
  (6, 'Ceremonies & Events',   '🎉', 6, 1),
  (7, 'Other',                 '📦', 7, 1);


-- ============================================================================
-- 6. TASK TEMPLATES  (the default planning checklist)
-- `days_before_wedding` is counted back from wedding_plans.wedding_date when
-- these are cloned into a couple's `tasks`.
-- ============================================================================

INSERT IGNORE INTO task_templates (id, task_category_id, title, description, days_before_wedding, priority, sort_order) VALUES
  (1,  1, 'Agree a total budget',                'Decide the overall number before booking anything.',             365, 'high',   1),
  (2,  4, 'Draft the guest list',                'A rough headcount drives venue size and catering cost.',          360, 'high',   2),
  (3,  6, 'Set the engagement date',             'Confirm the date with both families.',                            330, 'high',   3),
  (4,  1, 'Shortlist and visit venues',          'Visit at least three before deciding.',                           300, 'high',   4),
  (5,  1, 'Book the ceremony venue',             'Secure the date with a deposit.',                                 270, 'high',   5),
  (6,  2, 'Book the photographer and videographer', 'Good ones are taken 6-9 months out.',                          270, 'high',   6),
  (7,  2, 'Book catering',                       'Confirm menu style and per-guest cost.',                          240, 'high',   7),
  (8,  6, 'Plan Shimgelegna',                    'Agree the elders'' visit with both families.',                    240, 'medium', 8),
  (9,  3, 'Order the wedding dress',             'Allow time for fittings and alterations.',                        210, 'high',   9),
  (10, 3, 'Order the habesha kemis and suits',   'Include the bridal party in the order.',                          180, 'medium', 10),
  (11, 2, 'Book decor and florals',              'Share the colour palette and stage concept.',                     180, 'medium', 11),
  (12, 2, 'Book entertainment',                  'DJ, band or azmari for each event.',                              150, 'medium', 12),
  (13, 4, 'Finalise the guest list',             'Lock the headcount before invitations go out.',                   150, 'high',   13),
  (14, 4, 'Send invitations',                    'Send the Leora Card and track RSVPs.',                            120, 'high',   14),
  (15, 5, 'Prepare marriage documents',          'ID, residence and civil registration paperwork.',                 120, 'high',   15),
  (16, 7, 'Book transportation',                 'Bridal car plus guest shuttles.',                                  90, 'medium', 16),
  (17, 6, 'Plan Gebez / Enshoshela',             'Confirm venue, catering and timing.',                              90, 'medium', 17),
  (18, 3, 'Book makeup and hair trial',          'Trial before committing to the wedding-day look.',                 75, 'medium', 18),
  (19, 4, 'Chase outstanding RSVPs',             'Follow up with guests who have not replied.',                      60, 'medium', 19),
  (20, 1, 'Confirm final headcount with caterer','Most caterers need this 3-4 weeks out.',                           30, 'high',   20),
  (21, 6, 'Plan Melse',                          'Second-day celebration: venue, outfits and catering.',             30, 'medium', 21),
  (22, 1, 'Build the seating plan',              'Assign guests to tables.',                                         21, 'medium', 22),
  (23, 2, 'Confirm timings with every vendor',   'Share the run sheet and arrival times.',                           14, 'high',   23),
  (24, 3, 'Final dress fitting',                 'Last alterations before the day.',                                 14, 'high',   24),
  (25, 6, 'Plan Kilikil',                        'Confirm the final celebration details.',                            7, 'low',    25),
  (26, 1, 'Pay remaining vendor balances',       'Settle anything still outstanding.',                                 7, 'high',   26),
  (27, 7, 'Confirm transport pickup times',      'Share addresses and timings with drivers.',                          3, 'high',   27);


-- ============================================================================
-- 7. SUBSCRIPTION PLANS
--
-- Couple tiers (free/golden/platinum) and vendor tiers (growth/featured).
-- The PHP pricing page linked to `growth` and `featured`, which did not exist
-- in its plan table, so checkout silently fell back to Golden at the wrong
-- price. Both slugs are real rows here.
--
-- `audience` is what /pricing filters on — couple plans and vendor plans sit
-- at overlapping prices, so nothing else separates them reliably.
-- max_bookings / featured_listing / priority_support are vendor-tier fields
-- and stay NULL/0 on the couple plans.
-- ============================================================================

INSERT IGNORE INTO subscription_plans
  (id, slug, name, audience, price, billing_cycle, features, max_bookings, featured_listing, priority_support) VALUES
  (1, 'free', 'Free', 'couple', 0.00, 'one_time',
      JSON_ARRAY('Browse all vendors',
                 '3 budget estimator uses',
                 'Compare up to 2 vendors',
                 '1 free 15-minute consultation'),
      NULL, 0, 0),
  (2, 'golden', 'Golden', 'couple', 2499.00, 'one_time',
      JSON_ARRAY('Everything in Free',
                 'Unlimited budget estimator',
                 'Compare up to 5 vendors',
                 '2-hour consultation',
                 'Wedding invitation card',
                 'Saved shortlists'),
      NULL, 0, 0),
  (3, 'platinum', 'Platinum', 'couple', 25000.00, 'one_time',
      JSON_ARRAY('Everything in Golden',
                 'Dedicated wedding planner',
                 'Vendor negotiation',
                 'Custom Leora Card design',
                 'Day-of coordination'),
      NULL, 0, 0),
  (4, 'growth', 'Growth', 'vendor', 1500.00, 'monthly',
      JSON_ARRAY('Listed in the marketplace',
                 'Up to 20 bookings a month',
                 'Booking and payment dashboard',
                 'Customer messaging'),
      20, 0, 0),
  (5, 'featured', 'Featured', 'vendor', 4500.00, 'monthly',
      JSON_ARRAY('Everything in Growth',
                 'Unlimited bookings',
                 'Featured placement in search',
                 'Homepage rotation',
                 'Priority support'),
      NULL, 1, 1);


-- ============================================================================
-- 8. SERVICE CATALOG  (what a vendor actually sells)
-- ============================================================================

INSERT IGNORE INTO service_categories (id, name, description) VALUES
  (1, 'Venue',          'Spaces hired for a ceremony or reception'),
  (2, 'Catering',       'Food and drink service'),
  (3, 'Photography',    'Photo and video coverage'),
  (4, 'Decor',          'Styling, florals and lighting'),
  (5, 'Attire',         'Clothing, jewellery and beauty'),
  (6, 'Entertainment',  'Music, dance and hosting'),
  (7, 'Transport',      'Vehicles and guest transfers'),
  (8, 'Stationery',     'Invitations, signage and printing');

INSERT IGNORE INTO sub_categories (id, name, description, parent_id) VALUES
  (1,  'Hotel Ballroom',      'Indoor hotel reception halls',            1),
  (2,  'Garden & Outdoor',    'Open-air venues and gardens',             1),
  (3,  'Cultural Hall',       'Traditional halls and community venues',  1),
  (4,  'Full Service',        'End-to-end catering with staff',          2),
  (5,  'Buffet',              'Self-service buffet setups',              2),
  (6,  'Cakes & Desserts',    'Wedding cakes and dessert tables',        2),
  (7,  'Photo Coverage',      'Stills photography',                      3),
  (8,  'Video Coverage',      'Cinematography and same-day edits',       3),
  (9,  'Floral Design',       'Bouquets, centrepieces and arches',       4),
  (10, 'Stage & Lighting',    'Stage build, draping and lighting',       4),
  (11, 'Bridal Wear',         'Dresses and habesha kemis',               5),
  (12, 'Groom Wear',          'Suits and traditional menswear',          5),
  (13, 'Hair & Makeup',       'Bridal beauty services',                  5),
  (14, 'DJ',                  'DJ and sound systems',                    6),
  (15, 'Live Band',           'Bands and solo performers',               6),
  (16, 'Traditional',         'Azmari, eskista and cultural troupes',    6),
  (17, 'Bridal Car',          'Decorated cars for the couple',           7),
  (18, 'Guest Shuttle',       'Buses and vans for guests',               7),
  (19, 'Digital Invitations', 'Leora Card and digital RSVP',             8),
  (20, 'Printed Invitations', 'Printed cards, menus and signage',        8);

INSERT IGNORE INTO sub_sub_categories (id, name, description, parent_id) VALUES
  (1,  'Under 200 guests',    'Small ballroom capacity',              1),
  (2,  '200-500 guests',      'Mid-size ballroom capacity',           1),
  (3,  'Over 500 guests',     'Large ballroom capacity',              1),
  (4,  'Injera Station',      'Live injera and wot service',          4),
  (5,  'International Menu',  'Continental and fusion menus',         4),
  (6,  'Fasting Menu',        'Full tsom / vegan menu',               4),
  (7,  'Half Day',            'Up to 6 hours of coverage',            7),
  (8,  'Full Day',            'Ceremony through reception',           7),
  (9,  'Multi-Event',         'Coverage across several ceremonies',   7),
  (10, 'Same-Day Edit',       'Highlight reel screened on the day',   8),
  (11, 'Fresh Flowers',       'Imported and local fresh florals',     9),
  (12, 'Silk Flowers',        'Reusable silk arrangements',           9);


-- ============================================================================
-- 9. LOCATIONS
-- Names are unique per parent, not globally — the same city name may exist in
-- more than one region.
-- ============================================================================

INSERT IGNORE INTO region (id, name) VALUES
  (1,  'Addis Ababa'),
  (2,  'Oromia'),
  (3,  'Amhara'),
  (4,  'Tigray'),
  (5,  'Sidama'),
  (6,  'South Ethiopia'),
  (7,  'Central Ethiopia'),
  (8,  'South West Ethiopia'),
  (9,  'Afar'),
  (10, 'Somali'),
  (11, 'Benishangul-Gumuz'),
  (12, 'Gambela'),
  (13, 'Harari'),
  (14, 'Dire Dawa');

INSERT IGNORE INTO city (id, region_id, name) VALUES
  (1,  1,  'Addis Ababa'),
  (2,  2,  'Adama'),
  (3,  2,  'Bishoftu'),
  (4,  2,  'Jimma'),
  (5,  2,  'Shashamane'),
  (6,  3,  'Bahir Dar'),
  (7,  3,  'Gondar'),
  (8,  3,  'Dessie'),
  (9,  3,  'Debre Birhan'),
  (10, 4,  'Mekelle'),
  (11, 5,  'Hawassa'),
  (12, 6,  'Arba Minch'),
  (13, 7,  'Hosaena'),
  (14, 7,  'Butajira'),
  (15, 8,  'Bonga'),
  (16, 9,  'Semera'),
  (17, 10, 'Jigjiga'),
  (18, 11, 'Assosa'),
  (19, 12, 'Gambela'),
  (20, 13, 'Harar'),
  (21, 14, 'Dire Dawa');

-- The 11 sub-cities of Addis Ababa, plus a placeholder for each other city so
-- the signup address form always has something selectable.
INSERT IGNORE INTO subcity (sc_id, city_id, name) VALUES
  (1,  1, 'Addis Ketema'),
  (2,  1, 'Akaky Kaliti'),
  (3,  1, 'Arada'),
  (4,  1, 'Bole'),
  (5,  1, 'Gullele'),
  (6,  1, 'Kirkos'),
  (7,  1, 'Kolfe Keranio'),
  (8,  1, 'Lemi Kura'),
  (9,  1, 'Lideta'),
  (10, 1, 'Nifas Silk-Lafto'),
  (11, 1, 'Yeka'),
  (12, 2, 'Adama Central'),
  (13, 3, 'Bishoftu Central'),
  (14, 4, 'Jimma Central'),
  (15, 5, 'Shashamane Central'),
  (16, 6, 'Bahir Dar Central'),
  (17, 7, 'Gondar Central'),
  (18, 8, 'Dessie Central'),
  (19, 9, 'Debre Birhan Central'),
  (20, 10, 'Mekelle Central'),
  (21, 11, 'Hawassa Central'),
  (22, 12, 'Arba Minch Central'),
  (23, 13, 'Hosaena Central'),
  (24, 14, 'Butajira Central'),
  (25, 15, 'Bonga Central'),
  (26, 16, 'Semera Central'),
  (27, 17, 'Jigjiga Central'),
  (28, 18, 'Assosa Central'),
  (29, 19, 'Gambela Central'),
  (30, 20, 'Harar Central'),
  (31, 21, 'Dire Dawa Central');


-- ============================================================================
-- 10. COMMISSION SETTINGS
-- The marketplace needs a rate to compute payment_commissions against.
-- One active row; change the value rather than adding a second.
-- ============================================================================

INSERT IGNORE INTO commission_settings (id, commission_type, value) VALUES
  (1, 'percentage', 10.00);


-- ============================================================================
-- AFTER SEEDING
--
-- 1. Create the first admin (verified, can log in straight away):
--
--      node scripts/create-user.mjs --email you@example.com --role Admin
--
-- 2. The FULLTEXT index for vendor search is created by migration 0002.
--
-- 3. Explicit ids were used above, so AUTO_INCREMENT already sits past them.
--    Nothing further is needed — new rows continue from the highest id.
-- ============================================================================
