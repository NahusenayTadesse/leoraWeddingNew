ALTER TABLE `vendor_availability` DROP FOREIGN KEY `vendor_availability_vendor_id_vendors_id_fk`;

ALTER TABLE `vendor_availability` MODIFY COLUMN `is_available` boolean NOT NULL DEFAULT true;
ALTER TABLE `vendor_availability` ADD CONSTRAINT `vendor_availability_vendor_date_uq` UNIQUE(`vendor_id`,`available_date`);
ALTER TABLE `vendor_availability` ADD CONSTRAINT `vendor_availability_vendor_id_vendors_id_fk` FOREIGN KEY (`vendor_id`) REFERENCES `vendors`(`id`) ON DELETE cascade ON UPDATE no action;
CREATE INDEX `vendor_availability_vendor_idx` ON `vendor_availability` (`vendor_id`);