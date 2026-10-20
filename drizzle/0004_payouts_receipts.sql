ALTER TABLE `vendor_payouts` ADD `destination` varchar(255);--> statement-breakpoint
CREATE INDEX `booking_payments_receipt_idx` ON `booking_payments` (`receipt_file`);--> statement-breakpoint
CREATE INDEX `payments_receipt_idx` ON `payments` (`receipt_file`);