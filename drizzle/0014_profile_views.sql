CREATE TABLE `vendor_profile_views` (
	`vendor_id` int NOT NULL,
	`day` date NOT NULL,
	`views` int unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `vendor_profile_views_vendor_id_day_pk` PRIMARY KEY(`vendor_id`,`day`)
);
--> statement-breakpoint
ALTER TABLE `vendor_profile_views` ADD CONSTRAINT `vendor_profile_views_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;