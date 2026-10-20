CREATE TABLE `bank_accounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`bank_name` varchar(100) NOT NULL,
	`account_name` varchar(150) NOT NULL,
	`account_number` varchar(50) NOT NULL,
	`sort_order` int NOT NULL DEFAULT 0,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `bank_accounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `booking_payments` MODIFY COLUMN `payment_method` enum('cash','bank_transfer','mobile_money','card','chapa') NOT NULL;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `checkout_url` text;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `receipt_file` varchar(255);--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `bank_account_id` int;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `verify_payload` text;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `verified_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `booking_payments` ADD `reviewed_by` varchar(36);--> statement-breakpoint
ALTER TABLE `payments` ADD `subscription_plan_id` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `checkout_url` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `receipt_file` varchar(255);--> statement-breakpoint
ALTER TABLE `payments` ADD `bank_account_id` int;--> statement-breakpoint
ALTER TABLE `payments` ADD `verify_payload` text;--> statement-breakpoint
ALTER TABLE `payments` ADD `verified_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `payments` ADD `reviewed_by` varchar(36);--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `bank_accounts` ADD CONSTRAINT `bank_accounts_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_bank_account_id_bank_accounts_id_fk` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscription_plan_id_subscription_plans_id_fk` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_bank_account_id_bank_accounts_id_fk` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_reviewed_by_user_id_fk` FOREIGN KEY (`reviewed_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `booking_payments_status_idx` ON `booking_payments` (`status`);