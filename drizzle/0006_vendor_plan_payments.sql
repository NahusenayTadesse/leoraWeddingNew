ALTER TABLE `payments` ADD `vendor_id` int;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `payments_vendor_idx` ON `payments` (`vendor_id`);