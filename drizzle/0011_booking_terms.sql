ALTER TABLE `vendor_bookings` ADD `refund_percent` tinyint unsigned;--> statement-breakpoint
ALTER TABLE `vendors` ADD `cancellation_policy` enum('flexible','moderate','strict') DEFAULT 'moderate' NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `deposit_percent` tinyint unsigned DEFAULT 30 NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `balance_due_days` smallint unsigned DEFAULT 14 NOT NULL;