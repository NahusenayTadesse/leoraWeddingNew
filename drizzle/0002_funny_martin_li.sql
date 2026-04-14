ALTER TABLE `vendors` ADD `phone` varchar(20) NOT NULL;--> statement-breakpoint
ALTER TABLE `vendors` ADD `vendor_category` int;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_vendor_category_vendor_categories_id_fk` FOREIGN KEY (`vendor_category`) REFERENCES `vendor_categories`(`id`) ON DELETE no action ON UPDATE no action;