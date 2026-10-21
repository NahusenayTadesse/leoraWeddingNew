CREATE TABLE `board_items` (
	`id` int AUTO_INCREMENT NOT NULL,
	`board_id` int NOT NULL,
	`image` varchar(500) NOT NULL,
	`vendor_id` int,
	`service_id` int,
	`note` varchar(255),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `board_items_id` PRIMARY KEY(`id`),
	CONSTRAINT `board_items_board_image_uq` UNIQUE(`board_id`,`image`)
);
--> statement-breakpoint
CREATE TABLE `gift_payouts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`amount` decimal(12,2) NOT NULL,
	`destination` varchar(255) NOT NULL,
	`status` enum('requested','completed','rejected') NOT NULL DEFAULT 'requested',
	`reference` varchar(150),
	`requested_by` varchar(36),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `gift_payouts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `guest_posts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`guest_id` int,
	`kind` enum('photo','blessing','song') NOT NULL,
	`author_name` varchar(120) NOT NULL,
	`body` varchar(500),
	`photo` varchar(255),
	`hidden` boolean NOT NULL DEFAULT false,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `guest_posts_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `inspiration_boards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`name` varchar(80) NOT NULL,
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `inspiration_boards_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `wedding_gifts` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`guest_id` int,
	`from_name` varchar(120) NOT NULL,
	`message` varchar(500),
	`amount` decimal(12,2) NOT NULL,
	`status` enum('pending','paid','failed') NOT NULL DEFAULT 'pending',
	`tx_ref` varchar(60) NOT NULL,
	`checkout_url` varchar(500),
	`verify_payload` text,
	`thanked_at` timestamp(3),
	`paid_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	CONSTRAINT `wedding_gifts_id` PRIMARY KEY(`id`),
	CONSTRAINT `wedding_gifts_tx_ref_uq` UNIQUE(`tx_ref`)
);
--> statement-breakpoint
ALTER TABLE `wedding_cards` ADD `gifts_enabled` boolean DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `wedding_cards` ADD `wall_key` varchar(24);--> statement-breakpoint
ALTER TABLE `board_items` ADD CONSTRAINT `board_items_board_id_inspiration_boards_id_fk` FOREIGN KEY (`board_id`) REFERENCES `inspiration_boards`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `board_items` ADD CONSTRAINT `board_items_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `board_items` ADD CONSTRAINT `board_items_service_id_vendor_services_id_fk` FOREIGN KEY (`service_id`) REFERENCES `vendor_services`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gift_payouts` ADD CONSTRAINT `gift_payouts_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `gift_payouts` ADD CONSTRAINT `gift_payouts_requested_by_user_id_fk` FOREIGN KEY (`requested_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_posts` ADD CONSTRAINT `guest_posts_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_posts` ADD CONSTRAINT `guest_posts_guest_id_guest_lists_id_fk` FOREIGN KEY (`guest_id`) REFERENCES `guest_lists`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `inspiration_boards` ADD CONSTRAINT `inspiration_boards_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_gifts` ADD CONSTRAINT `wedding_gifts_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `wedding_gifts` ADD CONSTRAINT `wedding_gifts_guest_id_guest_lists_id_fk` FOREIGN KEY (`guest_id`) REFERENCES `guest_lists`(`id`) ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `board_items_board_idx` ON `board_items` (`board_id`);--> statement-breakpoint
CREATE INDEX `gift_payouts_couple_idx` ON `gift_payouts` (`couple_id`);--> statement-breakpoint
CREATE INDEX `guest_posts_couple_kind_idx` ON `guest_posts` (`couple_id`,`kind`,`created_at`);--> statement-breakpoint
CREATE INDEX `inspiration_boards_couple_idx` ON `inspiration_boards` (`couple_id`);--> statement-breakpoint
CREATE INDEX `wedding_gifts_couple_idx` ON `wedding_gifts` (`couple_id`,`status`);