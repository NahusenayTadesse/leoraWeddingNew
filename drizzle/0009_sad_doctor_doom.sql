CREATE TABLE `sub_sub_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`parent_id` int,
	CONSTRAINT `sub_sub_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `sub_sub_categories_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
ALTER TABLE `category_services` ADD `sub_sub_id` int;--> statement-breakpoint
ALTER TABLE `sub_sub_categories` ADD CONSTRAINT `sub_sub_categories_parent_id_sub_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `sub_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_services` ADD CONSTRAINT `category_services_sub_sub_id_sub_sub_categories_id_fk` FOREIGN KEY (`sub_sub_id`) REFERENCES `sub_sub_categories`(`id`) ON DELETE cascade ON UPDATE no action;