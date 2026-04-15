CREATE TABLE `home_images` (
	`id` int AUTO_INCREMENT NOT NULL,
	`image_url` varchar(255) NOT NULL,
	CONSTRAINT `home_images_id` PRIMARY KEY(`id`)
);
--> statement-breakpoint
CREATE TABLE `youtube_url` (
	`id` int AUTO_INCREMENT NOT NULL,
	`video_url` varchar(255) NOT NULL,
	CONSTRAINT `youtube_url_id` PRIMARY KEY(`id`)
);
