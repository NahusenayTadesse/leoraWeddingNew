ALTER TABLE `vendor_reviews` ADD `vendor_reply` text;--> statement-breakpoint
ALTER TABLE `vendor_reviews` ADD `replied_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `vendors` ADD `verified_at` timestamp(3);