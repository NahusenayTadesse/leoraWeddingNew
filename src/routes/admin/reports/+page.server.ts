import {
	revenueSeries,
	signupSeries,
	bookingSeries,
	topVendors,
	lastMonths,
	type Range
} from '$lib/server/adminStats';
import type { PageServerLoad } from './$types';

function parse(s: string | null): Date | null {
	if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
	const d = new Date(s + 'T00:00:00');
	return Number.isNaN(d.getTime()) ? null : d;
}

export const load: PageServerLoad = async ({ url }) => {
	const def = lastMonths(6);
	let from = parse(url.searchParams.get('from')) ?? new Date(def.from);
	let to = parse(url.searchParams.get('to')) ?? new Date();
	to = new Date(to.getFullYear(), to.getMonth(), to.getDate(), 23, 59, 59);
	if (from > to) [from, to] = [to, from];
	const range: Range = { from, to };

	const [revenue, signups, bookings, vendors] = await Promise.all([
		revenueSeries(range),
		signupSeries(range),
		bookingSeries(range),
		topVendors(range, 10)
	]);

	const iso = (d: Date) =>
		`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
	const sum = (a: number[]) => a.reduce((x, y) => x + y, 0);

	return {
		from: iso(from),
		to: iso(to),
		revenue,
		signups,
		bookings,
		vendors,
		totals: {
			subscriptions: sum(revenue.subscriptions),
			commission: sum(revenue.commission),
			gmv: sum(revenue.gmv),
			platform: sum(revenue.platform),
			couples: sum(signups.couples),
			vendors: sum(signups.vendors),
			bookings: sum(bookings.bookings)
		}
	};
};
