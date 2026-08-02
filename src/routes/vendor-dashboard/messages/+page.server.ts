import { fail } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { messages, couples } from '$lib/server/db/schema';
import { and, eq, isNull } from 'drizzle-orm';
import { requireVendor } from '$lib/server/vendor';
import { listThreadsForVendor, listConversation, markThreadRead } from '$lib/server/vendor-bookings';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/messages');

	const threads = await listThreadsForVendor(vendor.id, vendor.userId);

	const coupleParam = Number(url.searchParams.get('couple'));
	const activeCoupleId = Number.isInteger(coupleParam) && coupleParam > 0
		? coupleParam
		: (threads[0]?.coupleId ?? null);

	let activeThread: { couple: { coupleId: number; coupleName: string }; messages: Awaited<ReturnType<typeof listConversation>> } | null = null;

	if (activeCoupleId) {
		const existing = threads.find((t) => t.coupleId === activeCoupleId);

		if (existing) {
			const [threadMessages] = await Promise.all([
				listConversation(vendor.id, activeCoupleId),
				markThreadRead(vendor.id, vendor.userId, activeCoupleId)
			]);
			activeThread = {
				couple: { coupleId: activeCoupleId, coupleName: existing.coupleName },
				messages: threadMessages
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

		await db.insert(messages).values({
			senderId: locals.user!.id,
			receiverId,
			coupleId,
			vendorId: vendor.id,
			body
		});

		return { success: true };
	}
};
