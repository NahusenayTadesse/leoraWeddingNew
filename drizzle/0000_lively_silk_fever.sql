CREATE TABLE `contact_messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(100) NOT NULL,
	`phone` varchar(20),
	`subject` varchar(255) NOT NULL,
	`message` text NOT NULL,
	`created_at` timestamp NOT NULL DEFAULT (now()),
	CONSTRAINT `contact_messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `home_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`image_url` varchar(255) NOT NULL,
	CONSTRAINT `home_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `testimonials` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(255) NOT NULL,
	`position` varchar(255),
	`message` text NOT NULL,
	`avatar` varchar(255),
	CONSTRAINT `testimonials_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `youtube_url` (
	`id` int AUTO_INCREMENT NOT NULL,
	`video_url` varchar(255) NOT NULL,
	CONSTRAINT `youtube_url_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `account` (
	`id` varchar(36) NOT NULL,
	`account_id` text NOT NULL,
	`provider_id` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`access_token` text,
	`refresh_token` text,
	`id_token` text,
	`access_token_expires_at` datetime,
	`refresh_token_expires_at` datetime,
	`scope` text,
	`password` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	CONSTRAINT `account_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` varchar(36) NOT NULL,
	`expires_at` datetime NOT NULL,
	`token` varchar(255) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`ip_address` text,
	`user_agent` text,
	`user_id` varchar(36) NOT NULL,
	`impersonated_by` text,
	CONSTRAINT `session_id` PRIMARY KEY(`id`),
	CONSTRAINT `session_token_unique` UNIQUE(`token`)
);
--> statement-breakpoint
CREATE TABLE `user` (
	`id` varchar(36) NOT NULL,
	`name` varchar(255) NOT NULL,
	`email` varchar(255) NOT NULL,
	`email_verified` boolean NOT NULL DEFAULT false,
	`image` text,
	`role_id` int,
	`role` text,
	`banned` boolean,
	`ban_reason` text,
	`ban_expires` datetime,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	CONSTRAINT `user_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_email_unique` UNIQUE(`email`)
);
--> statement-breakpoint
CREATE TABLE `verification` (
	`id` varchar(36) NOT NULL,
	`identifier` varchar(255) NOT NULL,
	`value` text NOT NULL,
	`expires_at` datetime NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	CONSTRAINT `verification_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `roles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(32) NOT NULL,
	`description` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	CONSTRAINT `roles_id` PRIMARY KEY(`id`),
	CONSTRAINT `roles_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	CONSTRAINT `permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `permissions_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `role_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`role_id` int NOT NULL,
	`permission_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `role_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `role_permissions_role_permission_uq` UNIQUE(`role_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `special_permissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`permission_id` int NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `special_permissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `special_permissions_user_permission_uq` UNIQUE(`user_id`,`permission_id`)
);
--> statement-breakpoint
CREATE TABLE `user_profiles` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`first_name` varchar(80) NOT NULL,
	`last_name` varchar(80),
	`phone` varchar(30),
	`avatar_url` varchar(255),
	`city` varchar(100),
	`country` varchar(100) NOT NULL DEFAULT 'Ethiopia',
	`date_of_birth` date,
	`gender` enum('female','male','other','prefer_not_to_say'),
	`bio` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `user_profiles_id` PRIMARY KEY(`id`),
	CONSTRAINT `user_profiles_user_uq` UNIQUE(`user_id`,`alive_key`)
);
--> statement-breakpoint
CREATE TABLE `couples` (
	`id` int AUTO_INCREMENT NOT NULL,
	`partner1_user_id` varchar(36),
	`partner2_user_id` varchar(36),
	`invite_code` varchar(20) NOT NULL,
	`wedding_hashtag` varchar(60),
	`slug` varchar(255),
	`groom_name` varchar(255),
	`bride_name` varchar(255),
	`phone` varchar(20),
	`phone2` varchar(20),
	`email` varchar(255),
	`verified` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `couples_id` PRIMARY KEY(`id`),
	CONSTRAINT `couples_invite_code_uq` UNIQUE(`invite_code`,`alive_key`),
	CONSTRAINT `couples_slug_uq` UNIQUE(`slug`,`alive_key`),
	CONSTRAINT `couples_partner1_uq` UNIQUE(`partner1_user_id`,`alive_key`),
	CONSTRAINT `couples_partner2_uq` UNIQUE(`partner2_user_id`,`alive_key`)
);
--> statement-breakpoint
CREATE TABLE `guest_lists` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`full_name` varchar(150) NOT NULL,
	`email` varchar(190),
	`phone` varchar(30),
	`side` enum('bride','groom','both') NOT NULL DEFAULT 'both',
	`group_name` varchar(100),
	`rsvp_status` enum('pending','confirmed','declined') NOT NULL DEFAULT 'pending',
	`plus_ones` tinyint unsigned NOT NULL DEFAULT 0,
	`meal_preference` varchar(100),
	`seating_table_id` int,
	`notes` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `guest_lists_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`user_id` varchar(36),
	`title` varchar(200),
	`body` text NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `notes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seating_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`name` varchar(150) NOT NULL DEFAULT 'Reception Seating',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `seating_plans_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `seating_tables` (
	`id` int AUTO_INCREMENT NOT NULL,
	`seating_plan_id` int NOT NULL,
	`table_name` varchar(50) NOT NULL,
	`capacity` tinyint unsigned NOT NULL DEFAULT 8,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `seating_tables_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`icon` varchar(10),
	`sort_order` smallint unsigned NOT NULL DEFAULT 0,
	`is_system` boolean NOT NULL DEFAULT true,
	CONSTRAINT `task_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `task_templates` (
	`id` int AUTO_INCREMENT NOT NULL,
	`task_category_id` int,
	`title` varchar(200) NOT NULL,
	`description` text,
	`days_before_wedding` int,
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`sort_order` smallint unsigned NOT NULL DEFAULT 0,
	CONSTRAINT `task_templates_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `tasks` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`task_category_id` int,
	`assigned_to` varchar(36),
	`title` varchar(200) NOT NULL,
	`description` text,
	`due_date` date,
	`status` enum('todo','in_progress','done') NOT NULL DEFAULT 'todo',
	`priority` enum('low','medium','high') NOT NULL DEFAULT 'medium',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `tasks_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wedding_events` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`event_type` enum('engagement','shimgelegna','gebez_enshoshela','ceremony','melse','kilikil','reception','other') NOT NULL,
	`event_name` varchar(150) NOT NULL,
	`event_date` datetime,
	`venue_name` varchar(150),
	`venue_address` varchar(255),
	`city` varchar(100),
	`sort_order` smallint unsigned NOT NULL DEFAULT 0,
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `wedding_events_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wedding_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`wedding_date` date,
	`guest_count_estimate` int,
	`venue_tier` enum('traditional','outdoor','luxury'),
	`total_budget` decimal(12,2),
	`theme` varchar(100),
	`status` enum('planning','confirmed','completed','cancelled') NOT NULL DEFAULT 'planning',
	`wedding_style` varchar(100),
	`city` varchar(100),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `wedding_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `wedding_plans_couple_uq` UNIQUE(`couple_id`,`alive_key`)
);
--> statement-breakpoint
CREATE TABLE `budget_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int,
	`name` varchar(100) NOT NULL,
	`description` varchar(255),
	`icon` varchar(10),
	`sort_order` smallint unsigned NOT NULL DEFAULT 0,
	`is_system` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `budget_categories_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_comparisons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`name` varchar(150) NOT NULL DEFAULT 'Untitled comparison',
	`vendor_ids` json NOT NULL,
	`result_summary` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `budget_comparisons_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `budget_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`budget_category_id` int,
	`vendor_id` int,
	`name` varchar(150) NOT NULL,
	`estimated_cost` decimal(12,2) NOT NULL DEFAULT '0',
	`actual_cost` decimal(12,2) NOT NULL DEFAULT '0',
	`status` enum('planned','booked','paid') NOT NULL DEFAULT 'planned',
	`due_date` date,
	`notes` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `budget_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `category_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sub_category_id` int,
	`sub_sub_id` int,
	`service_id` int,
	CONSTRAINT `category_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `discounts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`amount` decimal(10,2),
	`product_id` int,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `discounts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `order_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_order_id` int NOT NULL,
	`product_id` int,
	`quantity` int NOT NULL,
	`amount` varchar(255) NOT NULL,
	`price` decimal(10,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `order_items_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`total_amount` decimal(10,2),
	`status` enum('pending','paid','failed') NOT NULL DEFAULT 'pending',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `prices` (
	`id` int AUTO_INCREMENT NOT NULL,
	`service_id` int,
	`price` decimal(10,2) NOT NULL,
	`amount` varchar(255) NOT NULL,
	CONSTRAINT `prices_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `saved_vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`notes` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `saved_vendors_id` PRIMARY KEY(`id`),
	CONSTRAINT `saved_vendors_couple_vendor_uq` UNIQUE(`couple_id`,`vendor_id`)
);
--> statement-breakpoint
CREATE TABLE `service_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `service_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `service_categories_name_uq` UNIQUE(`name`,`alive_key`)
);
--> statement-breakpoint
CREATE TABLE `service_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`product_id` int,
	`image_url` varchar(255) NOT NULL,
	CONSTRAINT `service_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `sub_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`parent_id` int,
	CONSTRAINT `sub_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `sub_categories_parent_name_uq` UNIQUE(`parent_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `sub_sub_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`description` varchar(255),
	`parent_id` int,
	CONSTRAINT `sub_sub_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `sub_sub_categories_parent_name_uq` UNIQUE(`parent_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `vendor_availability` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`available_date` date NOT NULL,
	`is_available` boolean NOT NULL DEFAULT true,
	CONSTRAINT `vendor_availability_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_availability_vendor_date_uq` UNIQUE(`vendor_id`,`available_date`)
);
--> statement-breakpoint
CREATE TABLE `vendor_bookings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wedding_plan_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`service_id` int,
	`status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending',
	`agreed_price` decimal(10,2),
	`event_date` date,
	`cancellation_reason` text,
	`cancelled_by` enum('couple','vendor','admin'),
	`cancelled_at` timestamp(3),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `vendor_bookings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_categories` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(80) NOT NULL,
	`slug` varchar(90) NOT NULL,
	`icon` varchar(10),
	`description` varchar(255),
	`sort_order` smallint unsigned NOT NULL DEFAULT 0,
	`listable` boolean NOT NULL DEFAULT true,
	CONSTRAINT `vendor_categories_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_categories_slug_unique` UNIQUE(`slug`)
);
--> statement-breakpoint
CREATE TABLE `vendor_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`commission_type` enum('percentage','fixed') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	CONSTRAINT `vendor_commissions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_orders` (
	`id` int AUTO_INCREMENT NOT NULL,
	`order_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`subtotal` decimal(10,2),
	`status` enum('pending','delivered','cancelled') NOT NULL DEFAULT 'pending',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `vendor_orders_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_packages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`name` varchar(150) NOT NULL,
	`price` decimal(12,2) NOT NULL,
	`description` text,
	`inclusions` json,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `vendor_packages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`payout_method` enum('bank_transfer','mobile_money','cash'),
	`status` enum('requested','processing','completed','rejected') NOT NULL DEFAULT 'requested',
	`reference` varchar(150),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_promotions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`type` enum('featured','homepage','category_boost'),
	`starts_at` date,
	`ends_at` date,
	CONSTRAINT `vendor_promotions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_quotes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`proposed_price` decimal(12,2),
	`notes` text,
	`status` enum('sent','accepted','rejected') NOT NULL DEFAULT 'sent',
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `vendor_quotes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_reviews` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`couple_id` int NOT NULL,
	`rating` tinyint unsigned NOT NULL,
	`title` varchar(150),
	`comment` text,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `vendor_reviews_id` PRIMARY KEY(`id`),
	CONSTRAINT `vendor_reviews_vendor_couple_uq` UNIQUE(`vendor_id`,`couple_id`,`alive_key`),
	CONSTRAINT `vendor_reviews_rating_ck` CHECK(rating between 1 and 5)
);
--> statement-breakpoint
CREATE TABLE `vendor_services` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`title` varchar(150) NOT NULL,
	`featured_image` varchar(255),
	`description` text,
	`category_id` int,
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `vendor_services_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`plan_id` int NOT NULL,
	`starts_at` date,
	`ends_at` date,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	CONSTRAINT `vendor_subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `vendor_wallets` (
	`vendor_id` int NOT NULL,
	`balance` decimal(14,2) NOT NULL DEFAULT '0.00',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `vendor_wallets_vendor_id` PRIMARY KEY(`vendor_id`)
);
--> statement-breakpoint
CREATE TABLE `vendors` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36),
	`category_id` int NOT NULL,
	`business_name` varchar(150) NOT NULL,
	`description` text,
	`city` varchar(100),
	`address` varchar(255),
	`address_id` int,
	`phone` varchar(30),
	`email` varchar(190),
	`website` varchar(255),
	`price_min` decimal(12,2),
	`price_max` decimal(12,2),
	`rating_avg` decimal(3,2) NOT NULL DEFAULT '0.00',
	`review_count` int unsigned NOT NULL DEFAULT 0,
	`is_featured` boolean NOT NULL DEFAULT false,
	`is_verified` boolean NOT NULL DEFAULT false,
	`status` enum('pending','approved','rejected','suspended') NOT NULL DEFAULT 'pending',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `vendors_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `booking_payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`wedding_plan_id` int,
	`booking_id` int,
	`payer_id` varchar(36),
	`payee_vendor_id` int,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`payment_method` enum('cash','bank_transfer','mobile_money','card') NOT NULL,
	`payment_type` enum('advance','full','balance') NOT NULL,
	`status` enum('pending','confirmed','failed','refunded') NOT NULL DEFAULT 'pending',
	`transaction_reference` varchar(150),
	`paid_at` timestamp(3),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `booking_payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `booking_payments_transaction_ref_uq` UNIQUE(`transaction_reference`)
);
--> statement-breakpoint
CREATE TABLE `commission_settings` (
	`id` int AUTO_INCREMENT NOT NULL,
	`commission_type` enum('percentage','fixed') NOT NULL,
	`value` decimal(10,2) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `commission_settings_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `contracts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`document_url` text,
	`signed_by_couple` boolean NOT NULL DEFAULT false,
	`signed_by_vendor` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `contracts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `coupons` (
	`id` int AUTO_INCREMENT NOT NULL,
	`code` varchar(40) NOT NULL,
	`type` enum('percent','flat') NOT NULL,
	`value` decimal(12,2) NOT NULL,
	`max_uses` int unsigned,
	`uses_count` int unsigned NOT NULL DEFAULT 0,
	`expires_at` datetime,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `coupons_id` PRIMARY KEY(`id`),
	CONSTRAINT `coupons_code_uq` UNIQUE(`code`,`alive_key`)
);
--> statement-breakpoint
CREATE TABLE `disputes` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_id` int NOT NULL,
	`raised_by` enum('couple','vendor'),
	`reason` text NOT NULL,
	`status` enum('open','under_review','resolved','refunded') NOT NULL DEFAULT 'open',
	`resolution_notes` text,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `disputes_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `payment_commissions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_payment_id` int NOT NULL,
	`vendor_id` int NOT NULL,
	`gross_amount` decimal(12,2) NOT NULL,
	`commission_amount` decimal(12,2) NOT NULL,
	`net_amount` decimal(12,2) NOT NULL,
	CONSTRAINT `payment_commissions_id` PRIMARY KEY(`id`),
	CONSTRAINT `payment_commissions_payment_uq` UNIQUE(`booking_payment_id`)
);
--> statement-breakpoint
CREATE TABLE `payments` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int,
	`subscription_id` int,
	`amount` decimal(12,2) NOT NULL,
	`currency` varchar(10) NOT NULL DEFAULT 'ETB',
	`payment_method` enum('telebirr','cbe_birr','chapa','bank_transfer','card','cash'),
	`coupon_id` int,
	`discount_amount` decimal(12,2) NOT NULL DEFAULT '0',
	`status` enum('pending','completed','failed','refunded') NOT NULL DEFAULT 'pending',
	`transaction_ref` varchar(100),
	`paid_at` timestamp(3),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `payments_id` PRIMARY KEY(`id`),
	CONSTRAINT `payments_transaction_ref_uq` UNIQUE(`transaction_ref`)
);
--> statement-breakpoint
CREATE TABLE `refunds` (
	`id` int AUTO_INCREMENT NOT NULL,
	`booking_payment_id` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`reason` text,
	`status` enum('pending','approved','rejected') NOT NULL DEFAULT 'pending',
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `refunds_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `subscription_plans` (
	`id` int AUTO_INCREMENT NOT NULL,
	`slug` varchar(30) NOT NULL,
	`name` varchar(60) NOT NULL,
	`price` decimal(12,2) NOT NULL DEFAULT '0',
	`billing_cycle` enum('one_time','monthly','yearly') NOT NULL DEFAULT 'one_time',
	`features` json,
	`audience` enum('couple','vendor') NOT NULL DEFAULT 'couple',
	`max_bookings` int,
	`featured_listing` boolean NOT NULL DEFAULT false,
	`priority_support` boolean NOT NULL DEFAULT false,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	`alive_key` datetime GENERATED ALWAYS AS ((coalesce(`deleted_at`, TIMESTAMP'1970-01-01 00:00:00'))) STORED,
	CONSTRAINT `subscription_plans_id` PRIMARY KEY(`id`),
	CONSTRAINT `subscription_plans_slug_uq` UNIQUE(`slug`,`alive_key`)
);
--> statement-breakpoint
CREATE TABLE `subscriptions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`subscription_plan_id` int NOT NULL,
	`status` enum('active','expired','cancelled') NOT NULL DEFAULT 'active',
	`started_at` timestamp(3) NOT NULL DEFAULT (now()),
	`expires_at` datetime,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `subscriptions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wallet_transactions` (
	`id` int AUTO_INCREMENT NOT NULL,
	`vendor_id` int NOT NULL,
	`booking_payment_id` int,
	`amount` decimal(12,2) NOT NULL,
	`transaction_type` enum('credit','debit','commission','payout') NOT NULL,
	`description` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `wallet_transactions_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `activity_logs` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36),
	`action` varchar(100) NOT NULL,
	`entity_type` varchar(60),
	`entity_id` int unsigned,
	`ip_address` varchar(45),
	`user_agent` varchar(255),
	`meta` json,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `activity_logs_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `files` (
	`id` int AUTO_INCREMENT NOT NULL,
	`uploader_id` varchar(36),
	`couple_id` int,
	`vendor_id` int,
	`file_name` varchar(255) NOT NULL,
	`file_path` varchar(500) NOT NULL,
	`file_type` varchar(50),
	`file_size` int unsigned,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `files_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `messages` (
	`id` int AUTO_INCREMENT NOT NULL,
	`sender_id` varchar(36) NOT NULL,
	`receiver_id` varchar(36) NOT NULL,
	`couple_id` int,
	`vendor_id` int,
	`body` text NOT NULL,
	`is_read` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `messages_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `notifications` (
	`id` int AUTO_INCREMENT NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`type` varchar(50) NOT NULL,
	`title` varchar(200) NOT NULL,
	`body` varchar(255),
	`is_read` boolean NOT NULL DEFAULT false,
	`data` json,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `notifications_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `address` (
	`id` int AUTO_INCREMENT NOT NULL,
	`subcity_id` int NOT NULL,
	`street` varchar(100),
	`kebele` varchar(100),
	`building_number` varchar(10),
	`floor` int NOT NULL DEFAULT 0,
	`house_number` int NOT NULL DEFAULT 0,
	`google_maps_url` varchar(255),
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `address_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `city` (
	`id` int AUTO_INCREMENT NOT NULL,
	`region_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `city_id` PRIMARY KEY(`id`),
	CONSTRAINT `city_region_name_uq` UNIQUE(`region_id`,`name`)
);
--> statement-breakpoint
CREATE TABLE `region` (
	`id` int AUTO_INCREMENT NOT NULL,
	`name` varchar(50) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `region_id` PRIMARY KEY(`id`),
	CONSTRAINT `region_name_unique` UNIQUE(`name`)
);
--> statement-breakpoint
CREATE TABLE `subcity` (
	`sc_id` int AUTO_INCREMENT NOT NULL,
	`city_id` int NOT NULL,
	`name` varchar(50) NOT NULL,
	`is_active` boolean NOT NULL DEFAULT true,
	`created_by` varchar(36),
	`updated_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	`deleted_at` datetime,
	`deleted_by` varchar(36),
	CONSTRAINT `subcity_sc_id` PRIMARY KEY(`sc_id`),
	CONSTRAINT `subcity_city_name_uq` UNIQUE(`city_id`,`name`)
);
--> statement-breakpoint
ALTER TABLE `account` ADD CONSTRAINT `account_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `session` ADD CONSTRAINT `session_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user` ADD CONSTRAINT `user_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_role_id_roles_id_fk` FOREIGN KEY (`role_id`) REFERENCES `roles`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `role_permissions` ADD CONSTRAINT `role_permissions_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `special_permissions` ADD CONSTRAINT `special_permissions_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `special_permissions` ADD CONSTRAINT `special_permissions_permission_id_permissions_id_fk` FOREIGN KEY (`permission_id`) REFERENCES `permissions`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `special_permissions` ADD CONSTRAINT `special_permissions_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `special_permissions` ADD CONSTRAINT `special_permissions_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `special_permissions` ADD CONSTRAINT `special_permissions_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `user_profiles` ADD CONSTRAINT `user_profiles_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couples` ADD CONSTRAINT `couples_partner1_user_id_user_id_fk` FOREIGN KEY (`partner1_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couples` ADD CONSTRAINT `couples_partner2_user_id_user_id_fk` FOREIGN KEY (`partner2_user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couples` ADD CONSTRAINT `couples_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couples` ADD CONSTRAINT `couples_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `couples` ADD CONSTRAINT `couples_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_seating_table_id_seating_tables_id_fk` FOREIGN KEY (`seating_table_id`) REFERENCES `seating_tables`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notes` ADD CONSTRAINT `notes_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_plans` ADD CONSTRAINT `seating_plans_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_plans` ADD CONSTRAINT `seating_plans_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_plans` ADD CONSTRAINT `seating_plans_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_plans` ADD CONSTRAINT `seating_plans_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_tables` ADD CONSTRAINT `seating_tables_seating_plan_id_seating_plans_id_fk` FOREIGN KEY (`seating_plan_id`) REFERENCES `seating_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_tables` ADD CONSTRAINT `seating_tables_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_tables` ADD CONSTRAINT `seating_tables_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `seating_tables` ADD CONSTRAINT `seating_tables_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `task_templates` ADD CONSTRAINT `task_templates_task_category_id_task_categories_id_fk` FOREIGN KEY (`task_category_id`) REFERENCES `task_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_task_category_id_task_categories_id_fk` FOREIGN KEY (`task_category_id`) REFERENCES `task_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_assigned_to_user_id_fk` FOREIGN KEY (`assigned_to`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `tasks` ADD CONSTRAINT `tasks_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_events` ADD CONSTRAINT `wedding_events_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_events` ADD CONSTRAINT `wedding_events_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_events` ADD CONSTRAINT `wedding_events_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_events` ADD CONSTRAINT `wedding_events_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_plans` ADD CONSTRAINT `wedding_plans_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_plans` ADD CONSTRAINT `wedding_plans_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_plans` ADD CONSTRAINT `wedding_plans_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_plans` ADD CONSTRAINT `wedding_plans_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_categories` ADD CONSTRAINT `budget_categories_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_categories` ADD CONSTRAINT `budget_categories_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_categories` ADD CONSTRAINT `budget_categories_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_categories` ADD CONSTRAINT `budget_categories_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_comparisons` ADD CONSTRAINT `budget_comparisons_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_comparisons` ADD CONSTRAINT `budget_comparisons_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_comparisons` ADD CONSTRAINT `budget_comparisons_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_comparisons` ADD CONSTRAINT `budget_comparisons_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_budget_category_id_budget_categories_id_fk` FOREIGN KEY (`budget_category_id`) REFERENCES `budget_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `budget_items` ADD CONSTRAINT `budget_items_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_services` ADD CONSTRAINT `category_services_sub_category_id_sub_categories_id_fk` FOREIGN KEY (`sub_category_id`) REFERENCES `sub_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_services` ADD CONSTRAINT `category_services_sub_sub_id_sub_sub_categories_id_fk` FOREIGN KEY (`sub_sub_id`) REFERENCES `sub_sub_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `category_services` ADD CONSTRAINT `category_services_service_id_vendor_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `vendor_services`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_product_id_vendor_services_id_fk` FOREIGN KEY (`product_id`) REFERENCES `vendor_services`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `discounts` ADD CONSTRAINT `discounts_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_vendor_order_id_vendor_orders_id_fk` FOREIGN KEY (`vendor_order_id`) REFERENCES `vendor_orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_product_id_vendor_services_id_fk` FOREIGN KEY (`product_id`) REFERENCES `vendor_services`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `order_items` ADD CONSTRAINT `order_items_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `orders` ADD CONSTRAINT `orders_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `prices` ADD CONSTRAINT `prices_service_id_vendor_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `vendor_services`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_vendors` ADD CONSTRAINT `saved_vendors_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `saved_vendors` ADD CONSTRAINT `saved_vendors_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_categories` ADD CONSTRAINT `service_categories_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `service_images` ADD CONSTRAINT `service_images_product_id_vendor_services_id_fk` FOREIGN KEY (`product_id`) REFERENCES `vendor_services`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sub_categories` ADD CONSTRAINT `sub_categories_parent_id_service_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `service_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `sub_sub_categories` ADD CONSTRAINT `sub_sub_categories_parent_id_sub_categories_id_fk` FOREIGN KEY (`parent_id`) REFERENCES `sub_categories`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_availability` ADD CONSTRAINT `vendor_availability_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD CONSTRAINT `vendor_bookings_wedding_plan_id_wedding_plans_id_fk` FOREIGN KEY (`wedding_plan_id`) REFERENCES `wedding_plans`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD CONSTRAINT `vendor_bookings_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD CONSTRAINT `vendor_bookings_service_id_vendor_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `vendor_services`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD CONSTRAINT `vendor_bookings_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD CONSTRAINT `vendor_bookings_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_bookings` ADD CONSTRAINT `vendor_bookings_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_commissions` ADD CONSTRAINT `vendor_commissions_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_order_id_orders_id_fk` FOREIGN KEY (`order_id`) REFERENCES `orders`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_orders` ADD CONSTRAINT `vendor_orders_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_packages` ADD CONSTRAINT `vendor_packages_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_packages` ADD CONSTRAINT `vendor_packages_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_packages` ADD CONSTRAINT `vendor_packages_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_packages` ADD CONSTRAINT `vendor_packages_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_payouts` ADD CONSTRAINT `vendor_payouts_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_promotions` ADD CONSTRAINT `vendor_promotions_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_quotes` ADD CONSTRAINT `vendor_quotes_booking_id_vendor_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `vendor_bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_quotes` ADD CONSTRAINT `vendor_quotes_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_reviews` ADD CONSTRAINT `vendor_reviews_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_reviews` ADD CONSTRAINT `vendor_reviews_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_reviews` ADD CONSTRAINT `vendor_reviews_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_reviews` ADD CONSTRAINT `vendor_reviews_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_reviews` ADD CONSTRAINT `vendor_reviews_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_category_id_service_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `service_categories`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_services` ADD CONSTRAINT `vendor_services_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_subscriptions` ADD CONSTRAINT `vendor_subscriptions_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_subscriptions` ADD CONSTRAINT `vendor_subscriptions_plan_id_subscription_plans_id_fk` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_wallets` ADD CONSTRAINT `vendor_wallets_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_wallets` ADD CONSTRAINT `vendor_wallets_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_wallets` ADD CONSTRAINT `vendor_wallets_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendor_wallets` ADD CONSTRAINT `vendor_wallets_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_category_id_vendor_categories_id_fk` FOREIGN KEY (`category_id`) REFERENCES `vendor_categories`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_address_id_address_id_fk` FOREIGN KEY (`address_id`) REFERENCES `address`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `vendors` ADD CONSTRAINT `vendors_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_wedding_plan_id_wedding_plans_id_fk` FOREIGN KEY (`wedding_plan_id`) REFERENCES `wedding_plans`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_booking_id_vendor_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `vendor_bookings`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_payer_id_user_id_fk` FOREIGN KEY (`payer_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_payee_vendor_id_vendors_id_fk` FOREIGN KEY (`payee_vendor_id`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `booking_payments` ADD CONSTRAINT `booking_payments_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commission_settings` ADD CONSTRAINT `commission_settings_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commission_settings` ADD CONSTRAINT `commission_settings_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `commission_settings` ADD CONSTRAINT `commission_settings_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_booking_id_vendor_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `vendor_bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `contracts` ADD CONSTRAINT `contracts_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `coupons` ADD CONSTRAINT `coupons_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `disputes` ADD CONSTRAINT `disputes_booking_id_vendor_bookings_id_fk` FOREIGN KEY (`booking_id`) REFERENCES `vendor_bookings`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_commissions` ADD CONSTRAINT `payment_commissions_booking_payment_id_booking_payments_id_fk` FOREIGN KEY (`booking_payment_id`) REFERENCES `booking_payments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payment_commissions` ADD CONSTRAINT `payment_commissions_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_subscription_id_subscriptions_id_fk` FOREIGN KEY (`subscription_id`) REFERENCES `subscriptions`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_coupon_id_coupons_id_fk` FOREIGN KEY (`coupon_id`) REFERENCES `coupons`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `payments` ADD CONSTRAINT `payments_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_booking_payment_id_booking_payments_id_fk` FOREIGN KEY (`booking_payment_id`) REFERENCES `booking_payments`(`id`) ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `refunds` ADD CONSTRAINT `refunds_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD CONSTRAINT `subscription_plans_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD CONSTRAINT `subscription_plans_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscription_plans` ADD CONSTRAINT `subscription_plans_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_subscription_plan_id_subscription_plans_id_fk` FOREIGN KEY (`subscription_plan_id`) REFERENCES `subscription_plans`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subscriptions` ADD CONSTRAINT `subscriptions_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wallet_transactions` ADD CONSTRAINT `wallet_transactions_booking_payment_id_booking_payments_id_fk` FOREIGN KEY (`booking_payment_id`) REFERENCES `booking_payments`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `activity_logs` ADD CONSTRAINT `activity_logs_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_uploader_id_user_id_fk` FOREIGN KEY (`uploader_id`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `files` ADD CONSTRAINT `files_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_sender_id_user_id_fk` FOREIGN KEY (`sender_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_receiver_id_user_id_fk` FOREIGN KEY (`receiver_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `messages` ADD CONSTRAINT `messages_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `notifications` ADD CONSTRAINT `notifications_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `address` ADD CONSTRAINT `address_subcity_id_subcity_sc_id_fk` FOREIGN KEY (`subcity_id`) REFERENCES `subcity`(`sc_id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `address` ADD CONSTRAINT `address_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `address` ADD CONSTRAINT `address_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `address` ADD CONSTRAINT `address_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city` ADD CONSTRAINT `city_region_id_region_id_fk` FOREIGN KEY (`region_id`) REFERENCES `region`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city` ADD CONSTRAINT `city_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city` ADD CONSTRAINT `city_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `city` ADD CONSTRAINT `city_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `region` ADD CONSTRAINT `region_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `region` ADD CONSTRAINT `region_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `region` ADD CONSTRAINT `region_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subcity` ADD CONSTRAINT `subcity_city_id_city_id_fk` FOREIGN KEY (`city_id`) REFERENCES `city`(`id`) ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subcity` ADD CONSTRAINT `subcity_created_by_user_id_fk` FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subcity` ADD CONSTRAINT `subcity_updated_by_user_id_fk` FOREIGN KEY (`updated_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `subcity` ADD CONSTRAINT `subcity_deleted_by_user_id_fk` FOREIGN KEY (`deleted_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `account_userId_idx` ON `account` (`user_id`);--> statement-breakpoint
CREATE INDEX `session_userId_idx` ON `session` (`user_id`);--> statement-breakpoint
CREATE INDEX `verification_identifier_idx` ON `verification` (`identifier`);--> statement-breakpoint
CREATE INDEX `guest_lists_couple_idx` ON `guest_lists` (`couple_id`);--> statement-breakpoint
CREATE INDEX `guest_lists_rsvp_idx` ON `guest_lists` (`rsvp_status`);--> statement-breakpoint
CREATE INDEX `notes_couple_idx` ON `notes` (`couple_id`);--> statement-breakpoint
CREATE INDEX `seating_plans_couple_idx` ON `seating_plans` (`couple_id`);--> statement-breakpoint
CREATE INDEX `seating_tables_plan_idx` ON `seating_tables` (`seating_plan_id`);--> statement-breakpoint
CREATE INDEX `tasks_couple_idx` ON `tasks` (`couple_id`);--> statement-breakpoint
CREATE INDEX `tasks_status_idx` ON `tasks` (`status`);--> statement-breakpoint
CREATE INDEX `tasks_due_date_idx` ON `tasks` (`due_date`);--> statement-breakpoint
CREATE INDEX `wedding_events_couple_idx` ON `wedding_events` (`couple_id`);--> statement-breakpoint
CREATE INDEX `budget_categories_couple_idx` ON `budget_categories` (`couple_id`);--> statement-breakpoint
CREATE INDEX `budget_comparisons_couple_idx` ON `budget_comparisons` (`couple_id`);--> statement-breakpoint
CREATE INDEX `budget_items_couple_idx` ON `budget_items` (`couple_id`);--> statement-breakpoint
CREATE INDEX `budget_items_category_idx` ON `budget_items` (`budget_category_id`);--> statement-breakpoint
CREATE INDEX `order_items_vendor_order_idx` ON `order_items` (`vendor_order_id`);--> statement-breakpoint
CREATE INDEX `orders_couple_idx` ON `orders` (`couple_id`);--> statement-breakpoint
CREATE INDEX `saved_vendors_vendor_idx` ON `saved_vendors` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_availability_vendor_idx` ON `vendor_availability` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_bookings_vendor_idx` ON `vendor_bookings` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_bookings_vendor_date_idx` ON `vendor_bookings` (`vendor_id`,`event_date`);--> statement-breakpoint
CREATE INDEX `vendor_bookings_wedding_plan_idx` ON `vendor_bookings` (`wedding_plan_id`);--> statement-breakpoint
CREATE INDEX `vendor_commissions_vendor_idx` ON `vendor_commissions` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_orders_order_idx` ON `vendor_orders` (`order_id`);--> statement-breakpoint
CREATE INDEX `vendor_orders_vendor_idx` ON `vendor_orders` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_packages_vendor_idx` ON `vendor_packages` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_payouts_vendor_idx` ON `vendor_payouts` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_promotions_vendor_idx` ON `vendor_promotions` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_quotes_booking_idx` ON `vendor_quotes` (`booking_id`);--> statement-breakpoint
CREATE INDEX `vendor_reviews_vendor_idx` ON `vendor_reviews` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_services_vendor_idx` ON `vendor_services` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendor_subscriptions_vendor_idx` ON `vendor_subscriptions` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `vendors_category_idx` ON `vendors` (`category_id`);--> statement-breakpoint
CREATE INDEX `vendors_status_idx` ON `vendors` (`status`);--> statement-breakpoint
CREATE INDEX `vendors_city_idx` ON `vendors` (`city`);--> statement-breakpoint
CREATE INDEX `booking_payments_wedding_plan_idx` ON `booking_payments` (`wedding_plan_id`);--> statement-breakpoint
CREATE INDEX `booking_payments_booking_idx` ON `booking_payments` (`booking_id`);--> statement-breakpoint
CREATE INDEX `booking_payments_payer_idx` ON `booking_payments` (`payer_id`);--> statement-breakpoint
CREATE INDEX `booking_payments_payee_vendor_idx` ON `booking_payments` (`payee_vendor_id`);--> statement-breakpoint
CREATE INDEX `contracts_booking_idx` ON `contracts` (`booking_id`);--> statement-breakpoint
CREATE INDEX `disputes_booking_idx` ON `disputes` (`booking_id`);--> statement-breakpoint
CREATE INDEX `payment_commissions_vendor_idx` ON `payment_commissions` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `payments_couple_idx` ON `payments` (`couple_id`);--> statement-breakpoint
CREATE INDEX `payments_status_idx` ON `payments` (`status`);--> statement-breakpoint
CREATE INDEX `refunds_booking_payment_idx` ON `refunds` (`booking_payment_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_couple_idx` ON `subscriptions` (`couple_id`);--> statement-breakpoint
CREATE INDEX `subscriptions_status_idx` ON `subscriptions` (`status`);--> statement-breakpoint
CREATE INDEX `wallet_transactions_vendor_idx` ON `wallet_transactions` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_user_idx` ON `activity_logs` (`user_id`);--> statement-breakpoint
CREATE INDEX `activity_logs_action_idx` ON `activity_logs` (`action`);--> statement-breakpoint
CREATE INDEX `activity_logs_created_idx` ON `activity_logs` (`created_at`);--> statement-breakpoint
CREATE INDEX `files_couple_idx` ON `files` (`couple_id`);--> statement-breakpoint
CREATE INDEX `files_vendor_idx` ON `files` (`vendor_id`);--> statement-breakpoint
CREATE INDEX `messages_sender_idx` ON `messages` (`sender_id`);--> statement-breakpoint
CREATE INDEX `messages_receiver_created_idx` ON `messages` (`receiver_id`,`created_at`);--> statement-breakpoint
CREATE INDEX `notifications_user_read_idx` ON `notifications` (`user_id`,`is_read`);