import { createAccess } from '@nahu/admin-kit/access';

/**
 * The permission an account with the 'Admin' role holds (see `hooks.server.ts`). The app has one
 * admin role, so every admin page sits behind this one permission.
 */
export const ADMIN_PERMISSION = 'admin.access';

/**
 * Who may open what under `/admin`: one rule per page, first match wins. A page under `/admin`
 * that no rule claims is closed, even to admins, so a new admin page needs a rule here.
 *
 * `/vendor-dashboard` and `/wedding` are not under this root: they belong to whoever owns the
 * vendor profile or the couple, which their own `requireVendor` / couple lookups check.
 */
export const access = createAccess({
	root: '/admin',
	rules: [
		{ prefix: '/admin', permission: ADMIN_PERMISSION, exact: true },
		{ prefix: '/admin/reports', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/users', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/vendors', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/bookings', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/payments', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/payouts', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/disputes', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/reviews', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/subscriptions', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/coupons', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/messages', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/activity', permission: ADMIN_PERMISSION },
		{ prefix: '/admin/settings', permission: ADMIN_PERMISSION }
	]
});
