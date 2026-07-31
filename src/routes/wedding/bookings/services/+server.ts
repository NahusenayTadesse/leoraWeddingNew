import { json, error } from '@sveltejs/kit';
import { listVendorServices } from '$lib/server/bookings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	if (!locals.user) throw error(401, 'Unauthorized');

	const vendorId = Number(url.searchParams.get('vendorId'));
	if (!Number.isInteger(vendorId) || vendorId <= 0) return json([]);

	const services = await listVendorServices(vendorId);

	return json(services.map((s) => ({ value: String(s.id), name: s.title })));
};