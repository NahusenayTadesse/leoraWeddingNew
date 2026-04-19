CREATE TABLE `category_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sub_category_id` int,
	`service_id` int,
	CONSTRAINT `category_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`parent_id` int,
	CONSTRAINT `sub_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `sub_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `category_services` ADD CONSTRAINT `category_services_sub_category_id_sub_categories_id_fk` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_services` ADD CONSTRAINT `category_services_service_id_vendor_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `vendor_services`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sub_categories` ADD CONSTRAINT `sub_categories_parent_id_service_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `service_categories`(`id`) ON DELETE cascade ON UPDATE no action;