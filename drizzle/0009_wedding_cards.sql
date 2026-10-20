CREATE TABLE `wedding_cards` (
	`id` int AUTO_INCREMENT NOT NULL,
	`couple_id` int NOT NULL,
	`theme` enum('habesha','royal','garden') NOT NULL DEFAULT 'habesha',
	`headline` varchar(150),
	`message` text,
	`cover_image` varchar(255),
	`rsvp_deadline` date,
	`map_url` varchar(500),
	`published` boolean NOT NULL DEFAULT false,
	`published_at` timestamp(3),
	`created_at` timestamp(3) NOT NULL DEFAULT (now()),
	`updated_at` timestamp(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3) on update CURRENT_TIMESTAMP(3),
	CONSTRAINT `wedding_cards_id` PRIMARY KEY(`id`),
	CONSTRAINT `wedding_cards_couple_id_unique` UNIQUE(`couple_id`)
);
--> statement-breakpoint
ALTER TABLE `guest_lists` ADD `invite_token` varchar(32);--> statement-breakpoint
ALTER TABLE `guest_lists` ADD `rsvp_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `guest_lists` ADD `rsvp_party_size` tinyint unsigned;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD `rsvp_note` varchar(500);--> statement-breakpoint
ALTER TABLE `guest_lists` ADD `checked_in_at` timestamp(3);--> statement-breakpoint
ALTER TABLE `guest_lists` ADD `checked_in_by` varchar(36);--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_invite_token_uq` UNIQUE(`invite_token`);--> statement-breakpoint
ALTER TABLE `wedding_cards` ADD CONSTRAINT `wedding_cards_couple_id_couples_id_fk` FOREIGN KEY (`couple_id`) REFERENCES `couples`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE `guest_lists` ADD CONSTRAINT `guest_lists_checked_in_by_user_id_fk` FOREIGN KEY (`checked_in_by`) REFERENCES `user`(`id`) ON DELETE set null ON UPDATE no action;