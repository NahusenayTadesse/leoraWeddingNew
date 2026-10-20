ALTER TABLE `contracts` MODIFY COLUMN `document_url` varchar(255);--> statement-breakpoint
ALTER TABLE `contracts` ADD `title` varchar(150);--> statement-breakpoint
ALTER TABLE `contracts` ADD `couple_signed_name` varchar(150);--> statement-breakpoint
ALTER TABLE `contracts` ADD `couple_signed_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `contracts` ADD `couple_signed_ip` varchar(45);--> statement-breakpoint
ALTER TABLE `contracts` ADD `vendor_signed_name` varchar(150);--> statement-breakpoint
ALTER TABLE `contracts` ADD `vendor_signed_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `contracts` ADD `vendor_signed_ip` varchar(45);--> statement-breakpoint
CREATE INDEX `contracts_document_idx` ON `contracts` (`document_url`);