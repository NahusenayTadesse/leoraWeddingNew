CREATE TABLE `two_factor` (
	`id` varchar(36) NOT NULL,
	`secret` text NOT NULL,
	`backup_codes` text NOT NULL,
	`user_id` varchar(36) NOT NULL,
	`verified` boolean DEFAULT true,
	`failed_verification_count` int DEFAULT 0,
	`locked_until` timestamp(3),
	CONSTRAINT `two_factor_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
ALTER TABLE `user` ADD `two_factor_enabled` boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE `two_factor` ADD CONSTRAINT `two_factor_user_id_user_id_fk` FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX `two_factor_user_idx` ON `two_factor` (`user_id`);