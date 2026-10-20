-- ============================================================================
-- LEORA EVENTS — DEMO DATA (development only)
--
-- Sample vendors so the marketplace isn't empty while you build. NEVER load this
-- into production: the businesses are illustrative and their prices are made up.
-- Ratings start at zero — they are cached from vendor_reviews, and invented
-- review counts would be misleading (bugs.md #5).
--
--   mariadb -u USER -p DBNAME < database/seed.sql   # reference data first
--   mariadb -u USER -p DBNAME < database/demo.sql   # then, in dev only, this
-- ============================================================================

-- ============================================================================
-- 11. OPTIONAL — DEMO MARKETPLACE DATA
--
-- Delete this whole section for a production install. It exists so the
-- homepage, /vendors and the comparison tool have something to render while
-- you build; nothing in sections 1-10 depends on it.
--
-- `vendors.user_id` is NULL on all of these: the column is nullable precisely
-- so staff can list a business before it claims an account. These are not
-- linked to any login.
-- ============================================================================

INSERT IGNORE INTO vendors
  (id, user_id, category_id, business_name, description, city, address, phone, email, website,
   price_min, price_max, rating_avg, review_count, is_featured, is_verified, status) VALUES
  (1, NULL, 1, 'Sheraton Addis',
      'Landmark five-star hotel with two ballrooms and garden ceremony space in the heart of Addis.',
      'Addis Ababa', 'Taitu Street, Kirkos', '+251115171717', 'events@sheratonaddis.example', NULL,
      350000.00, 1200000.00, 0.00, 0, 1, 1, 'approved'),
  (2, NULL, 1, 'Haile Resort Hawassa',
      'Lakeside resort with outdoor ceremony lawns and indoor reception hall.',
      'Hawassa', 'Lake Hawassa shore', '+251462201111', 'weddings@haileresort.example', NULL,
      180000.00, 600000.00, 0.00, 0, 0, 1, 'approved'),
  (3, NULL, 2, 'Mesk Studio',
      'Documentary-style wedding photography and cinematography across all Ethiopian ceremonies.',
      'Addis Ababa', 'Bole Medhanialem', '+251911234567', 'hello@meskstudio.example', NULL,
      40000.00, 150000.00, 0.00, 0, 1, 1, 'approved'),
  (4, NULL, 2, 'Lalibela Films',
      'Cinematic same-day edits and drone coverage for Melse and Kilikil.',
      'Bahir Dar', 'Kebele 11', '+251918765432', 'book@lalibelafilms.example', NULL,
      35000.00, 110000.00, 0.00, 0, 0, 1, 'approved'),
  (5, NULL, 3, 'Abyssinia Decor',
      'Stage design, draping and fresh florals with traditional Ethiopian motifs.',
      'Addis Ababa', 'Sarbet, Nifas Silk-Lafto', '+251913456789', 'studio@abyssiniadecor.example', NULL,
      25000.00, 220000.00, 0.00, 0, 0, 1, 'approved'),
  (6, NULL, 4, 'Yod Abyssinia Catering',
      'Full-service traditional catering with live injera stations and fasting menus.',
      'Addis Ababa', 'Bole, Africa Avenue', '+251911998877', 'catering@yodabyssinia.example', NULL,
      450.00, 1400.00, 0.00, 0, 1, 1, 'approved'),
  (7, NULL, 5, 'Meron Bridal',
      'Habesha kemis, bridal gowns and groom suits, made to measure.',
      'Addis Ababa', 'Piassa, Arada', '+251911223344', 'atelier@meronbridal.example', NULL,
      15000.00, 95000.00, 0.00, 0, 0, 1, 'approved'),
  (8, NULL, 6, 'Azmari Nights',
      'Traditional azmari, eskista dancers and live band for every ceremony.',
      'Addis Ababa', 'Kazanchis, Kirkos', '+251912345678', 'bookings@azmarinights.example', NULL,
      20000.00, 85000.00, 0.00, 0, 0, 1, 'approved'),
  (9, NULL, 7, 'Selam Bridal Cars',
      'Decorated bridal cars and guest shuttle buses with drivers.',
      'Adama', 'Adama Central', '+251914567890', 'fleet@selamcars.example', NULL,
      8000.00, 60000.00, 0.00, 0, 0, 0, 'approved'),
  (10, NULL, 8, 'Leora Card Studio',
      'Digital invitations with live RSVP, QR check-in and matching printed stationery.',
      'Addis Ababa', 'Bole, Addis Ababa', '+251915678901', 'studio@leoracard.example', NULL,
      3000.00, 25000.00, 0.00, 0, 1, 1, 'approved');

INSERT IGNORE INTO vendor_packages (id, vendor_id, name, price, description, inclusions) VALUES
  (1,  3, 'Essential Coverage', 40000.00,  'Ceremony only, one photographer.',
       JSON_ARRAY('6 hours coverage', '1 photographer', '150 edited photos', 'Online gallery')),
  (2,  3, 'Signature Coverage', 85000.00,  'Ceremony and reception, photo and video.',
       JSON_ARRAY('10 hours coverage', '2 photographers', '1 videographer', '400 edited photos', 'Highlight film', 'Printed album')),
  (3,  3, 'Multi-Event Coverage', 150000.00, 'Engagement through Kilikil.',
       JSON_ARRAY('4 events covered', '2 photographers', '2 videographers', 'Drone coverage', 'Same-day edit', 'Premium album')),
  (4,  6, 'Traditional Buffet', 650.00,    'Per guest, traditional menu.',
       JSON_ARRAY('Injera and 5 wots', 'Salad station', 'Soft drinks', 'Service staff')),
  (5,  6, 'Premium Mixed Menu', 1200.00,   'Per guest, traditional and continental.',
       JSON_ARRAY('Live injera station', 'Grilled meats', 'Continental mains', 'Dessert table', 'Full bar service')),
  (6,  1, 'Garden Ceremony', 350000.00,    'Outdoor ceremony, up to 300 guests.',
       JSON_ARRAY('Garden hire 6 hours', 'Seating for 300', 'Sound system', 'Bridal suite')),
  (7,  1, 'Grand Ballroom', 900000.00,     'Indoor reception, up to 800 guests.',
       JSON_ARRAY('Ballroom hire 8 hours', 'Seating for 800', 'Stage and lighting', 'Bridal suite', 'Valet parking')),
  (8,  5, 'Classic Stage', 60000.00,       'Stage, draping and florals.',
       JSON_ARRAY('Stage build', 'Fabric draping', 'Fresh florals', 'Uplighting')),
  (9,  8, 'Azmari Evening', 25000.00,      'Traditional entertainment for one event.',
       JSON_ARRAY('2 azmari performers', '4 eskista dancers', '3 hours', 'Sound system')),
  (10, 10, 'Leora Card Standard', 3000.00, 'Digital invitation with RSVP.',
       JSON_ARRAY('Custom design', 'Live countdown', 'RSVP tracking', 'Guest list export'));

-- ============================================================================
-- 8b. VENDOR SERVICES + PRICES — bookable listings shown in the shop grid and
-- on each vendor's profile. `category_id` points at service_categories, not
-- vendor_categories — see docs/schema-conventions.md. Every service uses the
-- same placeholder image (files/service.webp) until vendors upload their own.
-- ============================================================================

INSERT IGNORE INTO vendor_services (id, vendor_id, category_id, title, featured_image, description, currency) VALUES
  (1,  1, 1, 'Garden Ceremony Package',        'service.webp', 'Outdoor ceremony space for up to 300 guests, with seating and sound.', 'ETB'),
  (2,  1, 1, 'Grand Ballroom Reception',       'service.webp', 'Indoor reception for up to 800 guests, with stage and lighting.', 'ETB'),
  (3,  2, 1, 'Lakeside Garden Ceremony',       'service.webp', 'Outdoor ceremony lawn overlooking Lake Hawassa.', 'ETB'),
  (4,  2, 1, 'Full Resort Buyout',             'service.webp', 'Exclusive use of the resort grounds for ceremony and reception.', 'ETB'),
  (5,  3, 3, 'Half-Day Photography Coverage',  'service.webp', 'One photographer, six hours, ceremony only.', 'ETB'),
  (6,  3, 3, 'Full-Day Photo & Video Package', 'service.webp', 'Two photographers and a videographer, ceremony through reception.', 'ETB'),
  (7,  4, 3, 'Same-Day Edit Film',             'service.webp', 'Highlight film ready to screen at the reception.', 'ETB'),
  (8,  4, 3, 'Cinematic Multi-Event Package',  'service.webp', 'Drone coverage across engagement, Melse and Kilikil.', 'ETB'),
  (9,  5, 4, 'Classic Stage Decor',            'service.webp', 'Stage build, fabric draping and fresh florals.', 'ETB'),
  (10, 5, 4, 'Full Venue Transformation',      'service.webp', 'Stage, aisle, guest tables and lounge decor.', 'ETB'),
  (11, 6, 2, 'Traditional Buffet Menu',        'service.webp', 'Injera and five wots, salad station, soft drinks.', 'ETB'),
  (12, 6, 2, 'Premium Mixed Menu',             'service.webp', 'Traditional and continental mains with full bar service.', 'ETB'),
  (13, 7, 5, 'Bridal Habesha Kemis Rental',    'service.webp', 'Traditional bridal kemis with hand embroidery, made to measure.', 'ETB'),
  (14, 7, 5, 'Full Bridal Party Package',      'service.webp', 'Bride, groom and full wedding party outfits.', 'ETB'),
  (15, 8, 6, 'Traditional Azmari Evening',     'service.webp', 'Live azmari performers and eskista dancers, three hours.', 'ETB'),
  (16, 8, 6, 'Full Band & Dancers Package',    'service.webp', 'Live band, azmari set and dancers for the full evening.', 'ETB'),
  (17, 9, 7, 'Decorated Bridal Car',           'service.webp', 'One decorated bridal car with driver for the day.', 'ETB'),
  (18, 10, 8, 'Digital Invitation Package',    'service.webp', 'Digital invitation with live countdown and RSVP tracking.', 'ETB'),
  (19, 14, 3, 'Engagement Shoot Package',      'service.webp', 'One-hour engagement photo session, edited gallery included.', 'ETB'),
  (20, 14, 3, 'Wedding Day Photography',       'service.webp', 'Full wedding day coverage, ceremony through reception.', 'ETB');

INSERT IGNORE INTO prices (id, service_id, price, amount) VALUES
  (1,  1, 350000.00,  'Garden Ceremony'),
  (2,  2, 900000.00,  'Grand Ballroom'),
  (3,  3, 180000.00,  'Lakeside Ceremony'),
  (4,  4, 600000.00,  'Full Buyout'),
  (5,  5, 40000.00,   'Half-Day Coverage'),
  (6,  6, 150000.00,  'Full-Day Coverage'),
  (7,  7, 35000.00,   'Same-Day Edit'),
  (8,  8, 110000.00,  'Multi-Event Package'),
  (9,  9, 25000.00,   'Classic Stage'),
  (10, 10, 220000.00, 'Full Transformation'),
  (11, 11, 450.00,    'Per Guest'),
  (12, 12, 1400.00,   'Per Guest'),
  (13, 13, 15000.00,  'Kemis Rental'),
  (14, 14, 95000.00,  'Full Party Package'),
  (15, 15, 20000.00,  'Azmari Evening'),
  (16, 16, 85000.00,  'Full Evening Package'),
  (17, 17, 8000.00,   'Bridal Car'),
  (18, 18, 3000.00,   'Digital Invitation'),
  (19, 19, 3000.00,   'Engagement Session'),
  (20, 20, 25000.00,  'Wedding Day Coverage');

INSERT IGNORE INTO testimonials (id, name, position, message) VALUES
  (1, 'Hana & Biniam', 'Married in Bahir Dar',
      'We booked our photographer, venue and decorator in one week — all through Leora. It felt like using a real product, not a directory.'),
  (2, 'Ruth & Mikael', 'Married in Addis Ababa',
      'The budget tracker kept us honest. We knew exactly where every birr was going, right up to the Melse.'),
  (3, 'Sara & Yonas', 'Married in Hawassa',
      'Our guests kept asking where we got our invitation card — the countdown and RSVP made it feel so premium.');

-- An example coupon. Remove it if you do not want a live discount code.
INSERT IGNORE INTO coupons (id, code, type, value, max_uses, expires_at) VALUES
  (1, 'LEORA10', 'percent', 10.00, 100, '2027-12-31 23:59:59');




