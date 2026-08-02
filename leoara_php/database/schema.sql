-- ============================================================================
-- LEORA EVENTS — PRODUCTION DATABASE SCHEMA
-- Engine: MySQL 5.7+ / MariaDB 10.3+  (matches standard cPanel MySQL versions)
-- Charset: utf8mb4 (full emoji / Amharic script support)
--
-- HOW TO INSTALL ON CPANEL
--   1. cPanel > MySQL Databases > create a database + user, add user to database
--      with ALL PRIVILEGES. Note the db name/user/pass (cPanel prefixes them,
--      e.g. cpuser_leora, cpuser_leorauser).
--   2. cPanel > phpMyAdmin > select your new database > Import > choose this file.
--      (Or via SSH: mysql -u USER -p DBNAME < schema.sql)
--   3. Copy .env.example to .env and fill in the same credentials.
--
-- This file is idempotent-ish (DROP TABLE IF EXISTS) so it can be re-run on a
-- fresh database during setup. Do NOT re-run on a live database with real data.
-- ============================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- DROP ORDER (children first) — only matters when re-initializing
-- ----------------------------------------------------------------------------
DROP TABLE IF EXISTS phone_otps;
DROP TABLE IF EXISTS activity_logs;
DROP TABLE IF EXISTS payments;
DROP TABLE IF EXISTS subscriptions;
DROP TABLE IF EXISTS coupons;
DROP TABLE IF EXISTS subscription_plans;
DROP TABLE IF EXISTS files;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS tasks;
DROP TABLE IF EXISTS task_categories;
DROP TABLE IF EXISTS guest_lists;
DROP TABLE IF EXISTS seating_tables;
DROP TABLE IF EXISTS seating_plans;
DROP TABLE IF EXISTS budget_comparisons;
DROP TABLE IF EXISTS budget_items;
DROP TABLE IF EXISTS budget_categories;
DROP TABLE IF EXISTS saved_vendors;
DROP TABLE IF EXISTS vendor_reviews;
DROP TABLE IF EXISTS vendor_packages;
DROP TABLE IF EXISTS vendors;
DROP TABLE IF EXISTS vendor_categories;
DROP TABLE IF EXISTS wedding_plans;
DROP TABLE IF EXISTS wedding_events;
DROP TABLE IF EXISTS couples;
DROP TABLE IF EXISTS email_verifications;
DROP TABLE IF EXISTS password_resets;
DROP TABLE IF EXISTS user_roles;
DROP TABLE IF EXISTS roles;
DROP TABLE IF EXISTS user_profiles;
DROP TABLE IF EXISTS users;

-- ============================================================================
-- CORE IDENTITY
-- ============================================================================

CREATE TABLE users (
  id                  BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  email               VARCHAR(190) NULL,
  phone               VARCHAR(20) NULL,
  google_id           VARCHAR(64) NULL,
  password_hash       VARCHAR(255) NULL,
  status              ENUM('pending','active','suspended') NOT NULL DEFAULT 'pending',
  email_verified_at   DATETIME NULL,
  phone_verified_at   DATETIME NULL,
  remember_token      VARCHAR(100) NULL,
  last_login_at       DATETIME NULL,
  last_login_ip       VARCHAR(45) NULL,
  failed_login_count  TINYINT UNSIGNED NOT NULL DEFAULT 0,
  locked_until        DATETIME NULL,
  created_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at          DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at          DATETIME NULL,
  UNIQUE KEY uq_users_email (email),
  UNIQUE KEY uq_users_phone (phone),
  UNIQUE KEY uq_users_google_id (google_id),
  KEY idx_users_status (status),
  KEY idx_users_deleted_at (deleted_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- NOTE: email, phone and password_hash are all nullable because a user may
-- register via email+password, Google Sign-In (email only, no password), or
-- phone OTP (phone only, no email/password). Application code (Auth.php)
-- enforces that at least one identifier is always present at registration —
-- MySQL's UNIQUE KEY already allows multiple NULLs in each of these columns,
-- so this doesn't create false "duplicate" conflicts between passwordless
-- accounts.

CREATE TABLE phone_otps (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  phone       VARCHAR(20) NOT NULL,
  otp_hash    VARCHAR(255) NOT NULL,
  attempts    TINYINT UNSIGNED NOT NULL DEFAULT 0,
  expires_at  DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_phone_otps_phone (phone),
  KEY idx_phone_otps_expires (expires_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE roles (
  id           TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name         VARCHAR(30) NOT NULL,
  description  VARCHAR(255) NULL,
  UNIQUE KEY uq_roles_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reference data (not user content) — safe to seed.
INSERT INTO roles (name, description) VALUES
  ('bride',   'Bride / primary wedding organizer'),
  ('groom',   'Groom / primary wedding organizer'),
  ('planner', 'Independent or in-house wedding planner'),
  ('vendor',  'Business offering wedding services'),
  ('admin',   'Platform administrator');

CREATE TABLE user_roles (
  user_id  BIGINT UNSIGNED NOT NULL,
  role_id  TINYINT UNSIGNED NOT NULL,
  PRIMARY KEY (user_id, role_id),
  CONSTRAINT fk_user_roles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_user_roles_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE user_profiles (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id      BIGINT UNSIGNED NOT NULL,
  first_name   VARCHAR(80) NOT NULL,
  last_name    VARCHAR(80) NULL,
  phone        VARCHAR(30) NULL,
  avatar_url   VARCHAR(255) NULL,
  city         VARCHAR(100) NULL,
  country      VARCHAR(100) NOT NULL DEFAULT 'Ethiopia',
  date_of_birth DATE NULL,
  gender       ENUM('female','male','other','prefer_not_to_say') NULL,
  bio          TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_user_profiles_user (user_id),
  CONSTRAINT fk_user_profiles_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE password_resets (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME NOT NULL,
  used_at     DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_password_resets_user (user_id),
  KEY idx_password_resets_expires (expires_at),
  CONSTRAINT fk_password_resets_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE email_verifications (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  token_hash  VARCHAR(255) NOT NULL,
  expires_at  DATETIME NOT NULL,
  verified_at DATETIME NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_email_verifications_user (user_id),
  CONSTRAINT fk_email_verifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- COUPLES & THE WEDDING ITSELF
-- ============================================================================

CREATE TABLE couples (
  id              BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  partner1_user_id BIGINT UNSIGNED NOT NULL,
  partner2_user_id BIGINT UNSIGNED NULL,
  invite_code      VARCHAR(20) NOT NULL,
  wedding_hashtag  VARCHAR(60) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  UNIQUE KEY uq_couples_invite_code (invite_code),
  KEY idx_couples_partner1 (partner1_user_id),
  KEY idx_couples_partner2 (partner2_user_id),
  CONSTRAINT fk_couples_partner1 FOREIGN KEY (partner1_user_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_couples_partner2 FOREIGN KEY (partner2_user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE wedding_plans (
  id                    BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id             BIGINT UNSIGNED NOT NULL,
  wedding_date          DATE NULL,
  guest_count_estimate  INT UNSIGNED NULL,
  venue_tier            ENUM('traditional','outdoor','luxury') NULL,
  total_budget          DECIMAL(12,2) NULL,
  theme                 VARCHAR(100) NULL,
  status                ENUM('planning','confirmed','completed','cancelled') NOT NULL DEFAULT 'planning',
  created_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at            DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at            DATETIME NULL,
  UNIQUE KEY uq_wedding_plans_couple (couple_id),
  CONSTRAINT fk_wedding_plans_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Multi-event Ethiopian wedding flow: Engagement, Shimgelegna, Gebez/Enshoshela,
-- Ceremony, Melse, Kilikil — modeled as rows so couples can add/reorder/rename.
CREATE TABLE wedding_events (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id    BIGINT UNSIGNED NOT NULL,
  event_type   ENUM('engagement','shimgelegna','gebez_enshoshela','ceremony','melse','kilikil','reception','other') NOT NULL,
  event_name   VARCHAR(150) NOT NULL,
  event_date   DATETIME NULL,
  venue_name   VARCHAR(150) NULL,
  venue_address VARCHAR(255) NULL,
  city         VARCHAR(100) NULL,
  sort_order   SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  notes        TEXT NULL,
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME NULL,
  KEY idx_wedding_events_couple (couple_id),
  CONSTRAINT fk_wedding_events_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- VENDORS & MARKETPLACE
-- ============================================================================

CREATE TABLE vendor_categories (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  slug        VARCHAR(90) NOT NULL,
  icon        VARCHAR(10) NULL,
  description VARCHAR(255) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_vendor_categories_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Reference data (taxonomy), not user/demo content — safe to seed so the
-- marketplace has categories to file real vendors under from day one.
INSERT INTO vendor_categories (name, slug, icon, sort_order) VALUES
  ('Hotel & Venue',      'venue',        '🏨', 1),
  ('Photography & Video','photography',  '📷', 2),
  ('Decor & Florals',    'decor',        '💐', 3),
  ('Catering',           'catering',     '🍽️', 4),
  ('Attire & Beauty',    'attire',       '👗', 5),
  ('Entertainment',      'entertainment','🎶', 6),
  ('Transportation',     'transport',    '🚗', 7),
  ('Leora Card & Invitations', 'invitations', '💌', 8);

CREATE TABLE vendors (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id        BIGINT UNSIGNED NULL,
  category_id    SMALLINT UNSIGNED NOT NULL,
  business_name  VARCHAR(150) NOT NULL,
  description    TEXT NULL,
  city           VARCHAR(100) NULL,
  address        VARCHAR(255) NULL,
  phone          VARCHAR(30) NULL,
  email          VARCHAR(190) NULL,
  website        VARCHAR(255) NULL,
  price_min      DECIMAL(12,2) NULL,
  price_max      DECIMAL(12,2) NULL,
  rating_avg     DECIMAL(3,2) NOT NULL DEFAULT 0.00,
  review_count   INT UNSIGNED NOT NULL DEFAULT 0,
  is_featured    TINYINT(1) NOT NULL DEFAULT 0,
  is_verified    TINYINT(1) NOT NULL DEFAULT 0,
  status         ENUM('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at     DATETIME NULL,
  KEY idx_vendors_category (category_id),
  KEY idx_vendors_status (status),
  KEY idx_vendors_city (city),
  FULLTEXT KEY ftx_vendors_search (business_name, description),
  CONSTRAINT fk_vendors_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
  CONSTRAINT fk_vendors_category FOREIGN KEY (category_id) REFERENCES vendor_categories(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendor_packages (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id   BIGINT UNSIGNED NOT NULL,
  name        VARCHAR(150) NOT NULL,
  price       DECIMAL(12,2) NOT NULL,
  description TEXT NULL,
  inclusions  JSON NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  KEY idx_vendor_packages_vendor (vendor_id),
  CONSTRAINT fk_vendor_packages_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE vendor_reviews (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  vendor_id   BIGINT UNSIGNED NOT NULL,
  couple_id   BIGINT UNSIGNED NOT NULL,
  rating      TINYINT UNSIGNED NOT NULL,
  title       VARCHAR(150) NULL,
  comment     TEXT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  UNIQUE KEY uq_vendor_reviews_vendor_couple (vendor_id, couple_id),
  KEY idx_vendor_reviews_vendor (vendor_id),
  CONSTRAINT fk_vendor_reviews_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE,
  CONSTRAINT fk_vendor_reviews_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT chk_vendor_reviews_rating CHECK (rating BETWEEN 1 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE saved_vendors (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id   BIGINT UNSIGNED NOT NULL,
  vendor_id   BIGINT UNSIGNED NOT NULL,
  notes       VARCHAR(255) NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_saved_vendors (couple_id, vendor_id),
  CONSTRAINT fk_saved_vendors_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_saved_vendors_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- BUDGET (Mode 2 — personalized planner; vendor comparison in Mode 1 uses
-- vendors/vendor_packages above plus budget_comparisons to persist a run)
-- ============================================================================

CREATE TABLE budget_categories (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id   BIGINT UNSIGNED NULL,        -- NULL = system default template
  name        VARCHAR(100) NOT NULL,
  icon        VARCHAR(10) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_system   TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  KEY idx_budget_categories_couple (couple_id),
  CONSTRAINT fk_budget_categories_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- System default categories (reference/template data — cloned per couple on
-- signup by the application layer, not shown as anyone's real budget).
INSERT INTO budget_categories (couple_id, name, icon, sort_order, is_system) VALUES
  (NULL, 'Venue & Catering',  '🏨', 1, 1),
  (NULL, 'Photography & Video', '📷', 2, 1),
  (NULL, 'Decor & Florals',  '💐', 3, 1),
  (NULL, 'Attire & Beauty',  '👗', 4, 1),
  (NULL, 'Entertainment',    '🎶', 5, 1),
  (NULL, 'Invitations & Leora Card', '💌', 6, 1),
  (NULL, 'Transportation',   '🚗', 7, 1),
  (NULL, 'Other',            '📦', 8, 1);

CREATE TABLE budget_items (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id        BIGINT UNSIGNED NOT NULL,
  budget_category_id BIGINT UNSIGNED NOT NULL,
  vendor_id        BIGINT UNSIGNED NULL,
  name             VARCHAR(150) NOT NULL,
  estimated_cost   DECIMAL(12,2) NOT NULL DEFAULT 0,
  actual_cost      DECIMAL(12,2) NOT NULL DEFAULT 0,
  status           ENUM('planned','booked','paid') NOT NULL DEFAULT 'planned',
  due_date         DATE NULL,
  notes            TEXT NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  KEY idx_budget_items_couple (couple_id),
  KEY idx_budget_items_category (budget_category_id),
  CONSTRAINT fk_budget_items_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_budget_items_category FOREIGN KEY (budget_category_id) REFERENCES budget_categories(id) ON DELETE RESTRICT,
  CONSTRAINT fk_budget_items_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Persists a saved "Mode 1" premium vendor comparison run.
CREATE TABLE budget_comparisons (
  id             BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id      BIGINT UNSIGNED NOT NULL,
  name           VARCHAR(150) NOT NULL DEFAULT 'Untitled comparison',
  vendor_ids     JSON NOT NULL,
  result_summary JSON NULL,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_budget_comparisons_couple (couple_id),
  CONSTRAINT fk_budget_comparisons_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- GUESTS & SEATING
-- ============================================================================

CREATE TABLE guest_lists (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id        BIGINT UNSIGNED NOT NULL,
  full_name        VARCHAR(150) NOT NULL,
  email            VARCHAR(190) NULL,
  phone            VARCHAR(30) NULL,
  side             ENUM('bride','groom','both') NOT NULL DEFAULT 'both',
  group_name       VARCHAR(100) NULL,
  rsvp_status      ENUM('pending','confirmed','declined') NOT NULL DEFAULT 'pending',
  plus_ones        TINYINT UNSIGNED NOT NULL DEFAULT 0,
  meal_preference  VARCHAR(100) NULL,
  seating_table_id BIGINT UNSIGNED NULL,
  notes            VARCHAR(255) NULL,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  KEY idx_guest_lists_couple (couple_id),
  KEY idx_guest_lists_rsvp (rsvp_status),
  CONSTRAINT fk_guest_lists_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seating_plans (
  id           BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id    BIGINT UNSIGNED NOT NULL,
  name         VARCHAR(150) NOT NULL DEFAULT 'Reception Seating',
  created_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at   DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at   DATETIME NULL,
  KEY idx_seating_plans_couple (couple_id),
  CONSTRAINT fk_seating_plans_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE seating_tables (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  seating_plan_id  BIGINT UNSIGNED NOT NULL,
  table_name       VARCHAR(50) NOT NULL,
  capacity         TINYINT UNSIGNED NOT NULL DEFAULT 8,
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_seating_tables_plan (seating_plan_id),
  CONSTRAINT fk_seating_tables_plan FOREIGN KEY (seating_plan_id) REFERENCES seating_plans(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

ALTER TABLE guest_lists
  ADD CONSTRAINT fk_guest_lists_table FOREIGN KEY (seating_table_id) REFERENCES seating_tables(id) ON DELETE SET NULL;

-- ============================================================================
-- TASKS & NOTES
-- ============================================================================

CREATE TABLE task_categories (
  id          SMALLINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  name        VARCHAR(80) NOT NULL,
  icon        VARCHAR(10) NULL,
  sort_order  SMALLINT UNSIGNED NOT NULL DEFAULT 0,
  is_system   TINYINT(1) NOT NULL DEFAULT 1
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

INSERT INTO task_categories (name, icon, sort_order) VALUES
  ('Venue & Logistics', '🏨', 1),
  ('Vendors',           '🤝', 2),
  ('Attire & Beauty',   '👗', 3),
  ('Guests & Invitations', '💌', 4),
  ('Legal & Documents', '📄', 5),
  ('Other',             '📦', 6);

CREATE TABLE tasks (
  id               BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id        BIGINT UNSIGNED NOT NULL,
  task_category_id SMALLINT UNSIGNED NULL,
  assigned_to      BIGINT UNSIGNED NULL,
  title            VARCHAR(200) NOT NULL,
  description      TEXT NULL,
  due_date         DATE NULL,
  status           ENUM('todo','in_progress','done') NOT NULL DEFAULT 'todo',
  priority         ENUM('low','medium','high') NOT NULL DEFAULT 'medium',
  created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at       DATETIME NULL,
  KEY idx_tasks_couple (couple_id),
  KEY idx_tasks_status (status),
  KEY idx_tasks_due_date (due_date),
  CONSTRAINT fk_tasks_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_tasks_category FOREIGN KEY (task_category_id) REFERENCES task_categories(id) ON DELETE SET NULL,
  CONSTRAINT fk_tasks_assigned_to FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE notes (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id   BIGINT UNSIGNED NOT NULL,
  user_id     BIGINT UNSIGNED NOT NULL,
  title       VARCHAR(200) NULL,
  body        TEXT NOT NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  KEY idx_notes_couple (couple_id),
  CONSTRAINT fk_notes_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_notes_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- NOTIFICATIONS & MESSAGING
-- ============================================================================

CREATE TABLE notifications (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NOT NULL,
  type        VARCHAR(50) NOT NULL,
  title       VARCHAR(200) NOT NULL,
  body        VARCHAR(255) NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  data        JSON NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_notifications_user (user_id),
  KEY idx_notifications_read (is_read),
  CONSTRAINT fk_notifications_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE messages (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  sender_id   BIGINT UNSIGNED NOT NULL,
  receiver_id BIGINT UNSIGNED NOT NULL,
  couple_id   BIGINT UNSIGNED NULL,
  vendor_id   BIGINT UNSIGNED NULL,
  body        TEXT NOT NULL,
  is_read     TINYINT(1) NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_messages_sender (sender_id),
  KEY idx_messages_receiver (receiver_id),
  CONSTRAINT fk_messages_sender FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_receiver FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_messages_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE SET NULL,
  CONSTRAINT fk_messages_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE files (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  uploader_id BIGINT UNSIGNED NOT NULL,
  couple_id   BIGINT UNSIGNED NULL,
  vendor_id   BIGINT UNSIGNED NULL,
  file_name   VARCHAR(255) NOT NULL,
  file_path   VARCHAR(500) NOT NULL,
  file_type   VARCHAR(50) NULL,
  file_size   INT UNSIGNED NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  deleted_at  DATETIME NULL,
  KEY idx_files_couple (couple_id),
  CONSTRAINT fk_files_uploader FOREIGN KEY (uploader_id) REFERENCES users(id) ON DELETE CASCADE,
  CONSTRAINT fk_files_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_files_vendor FOREIGN KEY (vendor_id) REFERENCES vendors(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- BILLING: PLANS, COUPONS, SUBSCRIPTIONS, PAYMENTS
-- ============================================================================

CREATE TABLE subscription_plans (
  id             TINYINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  slug           VARCHAR(30) NOT NULL,
  name           VARCHAR(60) NOT NULL,
  price          DECIMAL(12,2) NOT NULL DEFAULT 0,
  billing_cycle  ENUM('one_time','monthly','yearly') NOT NULL DEFAULT 'one_time',
  features       JSON NULL,
  is_active       TINYINT(1) NOT NULL DEFAULT 1,
  created_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at     DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_subscription_plans_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- Plan catalog is system configuration, not demo content.
INSERT INTO subscription_plans (slug, name, price, billing_cycle, features) VALUES
  ('free',     'Free',     0.00,     'one_time', JSON_ARRAY('Browse all vendors','3 budget estimator uses','1 free 15-minute consultation')),
  ('golden',   'Golden',   2499.00,  'one_time', JSON_ARRAY('Everything in Free','Unlimited budget estimator','2-hour consultation','Wedding invitation card','Vendor comparison up to 5','Saved shortlists')),
  ('platinum', 'Platinum', 25000.00, 'one_time', JSON_ARRAY('Everything in Golden','Dedicated wedding planner','Vendor negotiation','Custom Leora Card design','Day-of coordination'));

CREATE TABLE coupons (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  code        VARCHAR(40) NOT NULL,
  type        ENUM('percent','flat') NOT NULL,
  value       DECIMAL(12,2) NOT NULL,
  max_uses    INT UNSIGNED NULL,
  uses_count  INT UNSIGNED NOT NULL DEFAULT 0,
  expires_at  DATETIME NULL,
  is_active   TINYINT(1) NOT NULL DEFAULT 1,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_coupons_code (code)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE subscriptions (
  id                   BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id            BIGINT UNSIGNED NOT NULL,
  subscription_plan_id TINYINT UNSIGNED NOT NULL,
  status               ENUM('active','expired','cancelled') NOT NULL DEFAULT 'active',
  started_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at           DATETIME NULL,
  created_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at           DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_subscriptions_couple (couple_id),
  KEY idx_subscriptions_status (status),
  CONSTRAINT fk_subscriptions_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_subscriptions_plan FOREIGN KEY (subscription_plan_id) REFERENCES subscription_plans(id) ON DELETE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

CREATE TABLE payments (
  id                BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  couple_id         BIGINT UNSIGNED NOT NULL,
  subscription_id   BIGINT UNSIGNED NULL,
  amount            DECIMAL(12,2) NOT NULL,
  currency          VARCHAR(6) NOT NULL DEFAULT 'ETB',
  payment_method    VARCHAR(30) NULL,
  coupon_id         BIGINT UNSIGNED NULL,
  discount_amount   DECIMAL(12,2) NOT NULL DEFAULT 0,
  status            ENUM('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
  transaction_ref   VARCHAR(100) NULL,
  paid_at           DATETIME NULL,
  created_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at        DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_payments_couple (couple_id),
  KEY idx_payments_status (status),
  CONSTRAINT fk_payments_couple FOREIGN KEY (couple_id) REFERENCES couples(id) ON DELETE CASCADE,
  CONSTRAINT fk_payments_subscription FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE SET NULL,
  CONSTRAINT fk_payments_coupon FOREIGN KEY (coupon_id) REFERENCES coupons(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

-- ============================================================================
-- ACTIVITY / AUDIT LOG
-- ============================================================================

CREATE TABLE activity_logs (
  id          BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  user_id     BIGINT UNSIGNED NULL,
  action      VARCHAR(100) NOT NULL,
  entity_type VARCHAR(60) NULL,
  entity_id   BIGINT UNSIGNED NULL,
  ip_address  VARCHAR(45) NULL,
  user_agent  VARCHAR(255) NULL,
  meta        JSON NULL,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_activity_logs_user (user_id),
  KEY idx_activity_logs_action (action),
  CONSTRAINT fk_activity_logs_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;

SET FOREIGN_KEY_CHECKS = 1;

-- ============================================================================
-- NOTE ON "NO MOCK DATA": the only rows this script inserts are lookup /
-- taxonomy / plan-catalog data (roles, vendor_categories, budget_categories
-- templates, task_categories, subscription_plans) — configuration the app
-- needs to function, never a fake user, wedding, vendor, guest, or budget.
-- ============================================================================
