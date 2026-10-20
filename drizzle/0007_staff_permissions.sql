INSERT IGNORE INTO `permissions` (`id`, `name`, `description`) VALUES
  (18, 'booking.view', 'View all bookings'),
  (19, 'review.manage', 'Moderate vendor reviews'),
  (20, 'message.manage', 'Work the contact-form inbox'),
  (21, 'report.view', 'Open reports and revenue figures'),
  (22, 'settings.manage', 'Change commission and bank accounts'),
  (23, 'payment.manage', 'Confirm or reject transfer receipts and re-check Chapa');
--> statement-breakpoint
INSERT IGNORE INTO `roles` (`id`, `name`, `description`, `is_active`) VALUES
  (7, 'Support', 'Customer support: inbox, disputes, bookings, vendors and reviews (read-mostly)', 1);
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r JOIN `permissions` p
  ON p.name IN ('message.manage', 'dispute.manage', 'booking.view', 'vendor.view', 'user.view', 'review.manage', 'payment.view')
WHERE r.name = 'Support'
  AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
--> statement-breakpoint
INSERT INTO `role_permissions` (`role_id`, `permission_id`)
SELECT r.id, p.id FROM `roles` r JOIN `permissions` p ON p.id BETWEEN 18 AND 23
WHERE r.name = 'Admin'
  AND NOT EXISTS (SELECT 1 FROM `role_permissions` rp WHERE rp.role_id = r.id AND rp.permission_id = p.id);
