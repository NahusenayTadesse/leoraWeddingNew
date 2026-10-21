ALTER TABLE `vendor_bookings` MODIFY COLUMN `status` enum('pending','confirmed','completed','cancelled') NOT NULL DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE `wallet_transactions` MODIFY COLUMN `transaction_type` enum('credit','debit','commission','payout','release') NOT NULL;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD `completed_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `vendor_wallets` ADD `held_balance` decimal(14,2) DEFAULT '0.00' NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `released_at` timestamp(3);--> statement-breakpoint
-- Payments confirmed before the hold existed were already credited to the withdrawable balance;
-- mark them released so the release job leaves them alone.
UPDATE `booking_payments` SET `released_at` = COALESCE(`verified_at`, `paid_at`, `updated_at`) WHERE `status` IN ('confirmed', 'refunded') AND `released_at` IS NULL;
