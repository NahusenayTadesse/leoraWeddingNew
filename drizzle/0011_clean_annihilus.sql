ALTER TABLE `vendor_bookings` MODIFY COLUMN `status` enum('pending','confirmed','cancelled') NOT NULL DEFAULT 'pending';
ALTER TABLE `vendor_bookings` ADD `cancellation_reason` text;
ALTER TABLE `vendor_bookings` ADD `cancelled_by` enum('couple','vendor','admin');
ALTER TABLE `vendor_bookings` ADD `cancelled_at` timestamp;
CREATE INDEX `vendor_bookings_vendor_idx` ON `vendor_bookings` (`vendor_id`);
CREATE INDEX `vendor_bookings_vendor_date_idx` ON `vendor_bookings` (`vendor_id`,`event_date`);
CREATE INDEX `vendor_bookings_wedding_idx` ON `vendor_bookings` (`wedding_id`);