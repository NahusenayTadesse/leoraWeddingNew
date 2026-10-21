import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { couples } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVendor } from '$lib/server/vendor';
import { haveBooked, sendMessage } from '$lib/server/messages';
import {
	listThreadsForVendor,
	listConversation,
	markThreadRead
} from '$lib/server/vendor-bookings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/messages');

	const threads = await listThreadsForVendor(vendor.id, vendor.userId);

	const coupleParam = Number(url.searchParams.get('couple'));
	const activeCoupleId =
		Number.isInteger(coupleParam) && coupleParam > 0 ? coupleParam : (threads[0]?.coupleId ?? null);

	let activeThread: {
		couple: { coupleId: number; coupleName: string };
		messages: Awaited<ReturnType<typeof listConversation>>;
		booked: boolean;
	} | null = null;

	if (activeCoupleId) {
		const existing = threads.find((t) => t.coupleId === activeCoupleId);

		if (existing) {
			const [threadMessages, , booked] = await Promise.all([
				listConversation(vendor.id, activeCoupleId),
				markThreadRead(vendor.id, vendor.userId, activeCoupleId),
				haveBooked(activeCoupleId, vendor.id)
			]);
			activeThread = {
				couple: { coupleId: activeCoupleId, coupleName: existing.coupleName },
				messages: threadMessages,
				booked
			};
			existing.unread = 0;
		}
	}

	return { threads, activeCoupleId, activeThread };
};

export const actions: Actions = {
	send: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);

		const form = await request.formData();
		const coupleId = Number(form.get('coupleId'));
		const body = String(form.get('body') ?? '').trim();

		if (!Number.isInteger(coupleId) || coupleId <= 0) {
			return fail(400, { error: 'Choose a conversation first.' });
		}
		if (!body) return fail(400, { error: 'Message cannot be empty.' });

		const [couple] = await db
			.select({ partner1UserId: couples.partner1UserId, partner2UserId: couples.partner2UserId })
			.from(couples)
			.where(and(eq(couples.id, coupleId), isNull(couples.deletedAt)))
			.limit(1);

		const receiverId = couple?.partner1UserId ?? couple?.partner2UserId;
		if (!receiverId) {
			return fail(400, { error: 'This couple has no linked account to message.' });
		}

		const sent = await sendMessage({
			senderId: locals.user!.id,
			receiverId,
			coupleId,
			vendorId: vendor.id,
			body,
			from: 'vendor'
		});
		if (!sent.ok) return fail(403, { error: 'You can only message couples who contacted you.' });

		return { success: true, masked: sent.masked };
	}
};
