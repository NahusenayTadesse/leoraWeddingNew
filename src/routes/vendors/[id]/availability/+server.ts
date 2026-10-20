import { json, error, type RequestHandler } from '@sveltejs/kit';
import { busyDays } from '$lib/server/availability';
import { monthRange } from '$lib/server/monthRange';
import { getVendor } from '$lib/server/vendorDirectory';

/** Busy days for a public vendor's calendar. Dates only — nothing about who booked them. */
export const GET: RequestHandler = async ({ params, url, setHeaders }) => {
	const vendorId = Number(params.id);
	if (!Number.isInteger(vendorId) || !(await getVendor(vendorId))) error(404, 'Not found');
	const { month, from, to } = monthRange(url.searchParams.get('month'));
	setHeaders({ 'cache-control': 'private, max-age=60' });
	return json({ month, ...(await busyDays(vendorId, from, to)) });
};
