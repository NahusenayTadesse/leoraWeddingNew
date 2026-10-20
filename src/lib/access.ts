import { createAccess } from '@nahu/admin-kit/access';

/**
 * Held by anyone with at least one staff permission (see `loadGrant` in hooks.server.ts): it
 * opens the admin overview. The 'Admin' role is a super admin and holds everything.
 */
export const ADMIN_PERMISSION = 'admin.access';

/**
 * Staff permissions, matching `permissions.name` (database/seed.sql §2). Grant them to a role in
 * `role_permissions` (e.g. the seeded 'Support' role) or to one person in `special_permissions`.
 */
export const PERM = {
	reports: 'report.view',
	users: 'user.view',
	usersManage: 'user.manage',
	vendors: 'vendor.view',
	vendorsApprove: 'vendor.approve',
	bookings: 'booking.view',
	payments: 'payment.view',
	paymentsManage: 'payment.manage',
	refunds: 'payment.refund',
	payouts: 'payout.manage',
	disputes: 'dispute.manage',
	reviews: 'review.manage',
	plans: 'plan.manage',
	coupons: 'coupon.manage',
	messages: 'message.manage',
	activity: 'activity.view',
	settings: 'settings.manage'
} as const;

/**
 * Who may open what under `/admin`: one rule per page, first match wins. A page under `/admin`
 * that no rule claims is closed, even to admins, so a new admin page needs a rule here.
 * Actions that need more than viewing (approving, banning, refunding) check again with
 * `requirePermission` in their own action.
 *
 * `/vendor-dashboard` and `/wedding` are not under this root: they belong to whoever owns the
 * vendor profile or the couple, which their own `requireVendor` / couple lookups check.
 */
export const access = createAccess({
	root: '/admin',
	rules: [
		{ prefix: '/admin', permission: ADMIN_PERMISSION, exact: true },
		{ prefix: '/admin/reports', permission: PERM.reports },
		{ prefix: '/admin/users', permission: PERM.users },
		{ prefix: '/admin/vendors', permission: PERM.vendors },
		{ prefix: '/admin/bookings', permission: PERM.bookings },
		{ prefix: '/admin/payments', permission: PERM.payments },
		{ prefix: '/admin/payouts', permission: PERM.payouts },
		{ prefix: '/admin/disputes', permission: PERM.disputes },
		{ prefix: '/admin/reviews', permission: PERM.reviews },
		{ prefix: '/admin/subscriptions', permission: PERM.plans },
		{ prefix: '/admin/coupons', permission: PERM.coupons },
		{ prefix: '/admin/messages', permission: PERM.messages },
		{ prefix: '/admin/activity', permission: PERM.activity },
		{ prefix: '/admin/settings', permission: PERM.settings }
	]
});
