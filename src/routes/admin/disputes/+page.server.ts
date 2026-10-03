import { desc, eq } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { disputes, vendorBookings, vendors } from '$lib/server/db/schema';
import { parse, ok } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => ({
	rows: await db
		.select({
			id: disputes.id,
			bookingId: disputes.bookingId,
			raisedBy: disputes.raisedBy,
			reason: disputes.reason,
			status: disputes.status,
			notes: disputes.resolutionNotes,
			createdAt: disputes.createdAt,
			vendor: vendors.businessName
		})
		.from(disputes)
		.innerJoin(vendorBookings, eq(vendorBookings.id, disputes.bookingId))
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.orderBy(desc(disputes.createdAt))
		.limit(500)
});

export const actions = {
	update: async (event) => {
		const p = await parse(
			event.request,
			z.object({
				id: z.coerce.number().int().positive(),
				status: z.enum(['open', 'under_review', 'resolved', 'refunded']),
				notes: z.string().trim().max(2000).optional()
			})
		);
		if ('error' in p) return p.error;
		await db
			.update(disputes)
			.set({ status: p.data.status, resolutionNotes: p.data.notes || null })
			.where(eq(disputes.id, p.data.id));
		await audit(event, 'dispute.update', 'dispute', p.data.id, { status: p.data.status });
		return ok('Dispute updated');
	}
} satisfies Actions;
