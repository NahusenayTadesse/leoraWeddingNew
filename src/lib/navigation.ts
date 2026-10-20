import type { NavItem } from '@nahu/admin-kit/navigation';
import {
	BarChart3,
	Building2,
	CalendarCheck,
	CreditCard,
	Gavel,
	Landmark,
	LayoutDashboard,
	MessageSquare,
	PackageOpen,
	ScrollText,
	Settings,
	Sparkles,
	Star,
	TicketPercent,
	Users,
	Wallet
} from '@lucide/svelte';

/** The admin sidebar and search palette. Each entry also needs a rule in `access.ts`. */
export const ADMIN_NAVIGATION: NavItem[] = [
	{ title: 'Dashboard', url: '/admin', icon: LayoutDashboard },
	{ title: 'Reports', url: '/admin/reports', icon: BarChart3 },
	{ title: 'Users', url: '/admin/users', icon: Users },
	{ title: 'Vendors', url: '/admin/vendors', icon: Building2 },
	{ title: 'Bookings', url: '/admin/bookings', icon: CalendarCheck },
	{ title: 'Payments', url: '/admin/payments', icon: Wallet },
	{ title: 'Payouts', url: '/admin/payouts', icon: Landmark },
	{ title: 'Disputes', url: '/admin/disputes', icon: Gavel },
	{ title: 'Reviews', url: '/admin/reviews', icon: Star },
	{ title: 'Subscriptions', url: '/admin/subscriptions', icon: CreditCard },
	{ title: 'Coupons', url: '/admin/coupons', icon: TicketPercent },
	{ title: 'Messages', url: '/admin/messages', icon: MessageSquare },
	{ title: 'Activity log', url: '/admin/activity', icon: ScrollText },
	{ title: 'Settings', url: '/admin/settings', icon: Settings }
];

/** The vendor dashboard's sidebar and search palette. */
export const VENDOR_NAVIGATION: NavItem[] = [
	{ title: 'Dashboard', url: '/vendor-dashboard', icon: LayoutDashboard },
	{ title: 'Business Profile', url: '/vendor-dashboard/profile', icon: Building2 },
	{ title: 'Services', url: '/vendor-dashboard/services', icon: Sparkles },
	{ title: 'Packages', url: '/vendor-dashboard/packages', icon: PackageOpen },
	{ title: 'Bookings', url: '/vendor-dashboard/bookings', icon: CalendarCheck },
	{ title: 'Payments', url: '/vendor-dashboard/payments', icon: Wallet },
	{ title: 'Messages', url: '/vendor-dashboard/messages', icon: MessageSquare }
];
