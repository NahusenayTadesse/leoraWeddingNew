import { json, error } from '@sveltejs/kit';
import { requireVendor } from '$lib/server/vendor';
import { listConversation, markThreadRead } from '$lib/server/vendor-bookings';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
	const vendor = await requireVendor(locals);

	const coupleId = Number(url.searchParams.get('coupleId'));
	if (!Number.isInteger(coupleId) || coupleId <= 0) throw error(400, 'Invalid couple');

	const [messages] = await Promise.all([
		listConversation(vendor.id, coupleId),
		markThreadRead(vendor.id, vendor.userId, coupleId)
	]);

	return json(messages);
};
