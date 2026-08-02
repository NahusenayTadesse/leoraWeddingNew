import { fail } from '@sveltejs/kit';
import { getCoupleByUserId } from '$lib/server/couples';
import {
	listThreadsForCouple,
	getThreadMessages,
	markThreadRead,
	getVendorContact,
	sendMessage
} from '$lib/server/messages';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent, url, locals }) => {
	const { couple } = await parent();
	const coupleId = couple!.id;
	const userId = locals.user!.id;

	const threads = await listThreadsForCouple(coupleId, userId);

	const vendorParam = Number(url.searchParams.get('vendor'));
	const activeVendorId = Number.isInteger(vendorParam) && vendorParam > 0
		? vendorParam
		: (threads[0]?.vendorId ?? null);

	let activeThread: { vendor: { vendorId: number; businessName: string; categoryName: string | null }; messages: Awaited<ReturnType<typeof getThreadMessages>> } | null = null;

	if (activeVendorId) {
		const existing = threads.find((t) => t.vendorId === activeVendorId);
		const vendor = existing ?? (await getVendorContact(activeVendorId));

		if (vendor) {
			const [threadMessages] = await Promise.all([
				getThreadMessages(coupleId, activeVendorId),
				markThreadRead(coupleId, activeVendorId, userId)
			]);
			activeThread = {
				vendor: {
					vendorId: activeVendorId,
					businessName: vendor.businessName,
					categoryName: vendor.categoryName
				},
				messages: threadMessages
			};
			const unread = threads.find((t) => t.vendorId === activeVendorId);
			if (unread) unread.unread = 0;
		}
	}

	return { threads, activeVendorId, activeThread };
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		const couple = await getCoupleByUserId(locals.user!.id);
		if (!couple) return fail(403, { error: 'No wedding workspace found.' });

		const form = await request.formData();
		const vendorId = Number(form.get('vendorId'));
		const body = String(form.get('body') ?? '').trim();

		if (!Number.isInteger(vendorId) || vendorId <= 0) {
			return fail(400, { error: 'Choose a conversation first.' });
		}
		if (!body) return fail(400, { error: 'Message cannot be empty.' });

		const vendor = await getVendorContact(vendorId);
		if (!vendor) return fail(404, { error: 'Vendor not found.' });
		if (!vendor.userId) return fail(400, { error: "This vendor hasn't set up messaging yet." });

		await sendMessage({
			senderId: locals.user!.id,
			receiverId: vendor.userId,
			coupleId: couple.id,
			vendorId,
			body
		});

		return { success: true };
	}
};
