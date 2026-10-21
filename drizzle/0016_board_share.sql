ALTER TABLE `inspiration_boards` ADD `share_token` varchar(24);--> statement-breakpoint
ALTER TABLE `inspiration_boards` ADD CONSTRAINT `inspiration_boards_share_uq` UNIQUE(`share_token`);