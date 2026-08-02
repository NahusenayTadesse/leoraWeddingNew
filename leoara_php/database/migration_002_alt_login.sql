-- ============================================================================
-- MIGRATION: add phone OTP + Google Sign-In support to an EXISTING database
-- ============================================================================
-- Only run this if you already imported the earlier version of schema.sql
-- and have real data you don't want to lose. If you're setting up fresh,
-- just import schema.sql — it already includes everything below.
--
-- Run via phpMyAdmin > SQL tab, or:
--   mysql -u DBUSER -p DBNAME < database/migration_002_alt_login.sql
-- ============================================================================

ALTER TABLE users
  MODIFY COLUMN email VARCHAR(190) NULL,
  MODIFY COLUMN password_hash VARCHAR(255) NULL,
  ADD COLUMN phone VARCHAR(20) NULL AFTER email,
  ADD COLUMN google_id VARCHAR(64) NULL AFTER phone,
  ADD COLUMN phone_verified_at DATETIME NULL AFTER email_verified_at,
  ADD UNIQUE KEY uq_users_phone (phone),
  ADD UNIQUE KEY uq_users_google_id (google_id);

CREATE TABLE IF NOT EXISTS phone_otps (
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
