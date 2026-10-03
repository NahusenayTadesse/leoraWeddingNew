import { desc, eq, and } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { vendorBookings, vendors, weddingPlans, couples, vendorServices } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select({
			id: vendorBookings.id,
			status: vendorBookings.status,
			price: vendorBookings.agreedPrice,
			eventDate: vendorBookings.eventDate,
			createdAt: vendorBookings.createdAt,
			cancelledBy: vendorBookings.cancelledBy,
			reason: vendorBookings.cancellationReason,
			vendor: vendors.businessName,
			bride: couples.brideName,
			groom: couples.groomName
		})
		.from(vendorBookings)
		.innerJoin(vendors, eq(vendors.id, vendorBookings.vendorId))
		.innerJoin(weddingPlans, eq(weddingPlans.id, vendorBookings.weddingPlanId))
		.innerJoin(couples, eq(couples.id, weddingPlans.coupleId))
		.orderBy(desc(vendorBookings.createdAt))
		.limit(1000);

	return {
		rows: rows.map((r) => ({
			...r,
			price: r.price === null ? null : toMoney(r.price),
			couple: [r.bride, r.groom].filter(Boolean).join(' & ') || 'Couple'
		}))
	};
};

export const actions = {
	cancel: async (event) => {
		const p = await parse(
			event.request,
			z.object({ id: z.coerce.number().int().positive(), reason: z.string().trim().min(3, 'Give a reason').max(500) })
		);
		if ('error' in p) return p.error;
		const res = await db
			.update(vendorBookings)
			.set({
				status: 'cancelled',
				cancelledBy: 'admin',
				cancellationReason: p.data.reason,
				cancelledAt: new Date()
			})
			.where(and(eq(vendorBookings.id, p.data.id), eq(vendorBookings.status, 'pending')));
		if (!res[0].affectedRows) {
			// confirmed bookings may carry payments; cancel those via disputes/refunds
			return bad('Only pending bookings can be cancelled here. Use disputes/refunds for confirmed ones.');
		}
		await audit(event, 'booking.cancel', 'vendor_booking', p.data.id, { reason: p.data.reason });
		return ok('Booking cancelled');
	}
} satisfies Actions;
