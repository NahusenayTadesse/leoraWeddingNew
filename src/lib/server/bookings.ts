import { db } from '$lib/server/db';
import {
	vendorBookings,
	vendors,
	vendorServices,
	bookingPayments,
	vendorQuotes
} from '$lib/server/db/schema';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';
import { balanceDueDate, depositAmount } from '$lib/policy';
import { contractsForBookings } from '$lib/server/contracts';

/** Vendor's contact user + display name, for the auto-generated booking-request message. */
export async function getVendorForMessage(vendorId: number) {
	const [row] = await db
		.select({ userId: vendors.userId, businessName: vendors.businessName })
		.from(vendors)
		.where(eq(vendors.id, vendorId))
		.limit(1);

	return row ?? null;
}

export async function getServiceTitle(serviceId: number) {
	const [row] = await db
		.select({ title: vendorServices.title })
		.from(vendorServices)
		.where(eq(vendorServices.id, serviceId))
		.limit(1);

	return row?.title ?? null;
}

export async function listBookings(weddingPlanId: number) {
	const rows = await db
		.select({
			id: vendorBookings.id,
			vendorId: vendorBookings.vendorId,
			vendorName: vendors.businessName,
			vendorPhone: vendors.phone,
			vendorVerified: vendors.isVerified,
			policy: vendors.cancellationPolicy,
			depositPercent: vendors.depositPercent,
			balanceDueDays: vendors.balanceDueDays,
			serviceId: vendorBookings.serviceId,
			serviceTitle: vendorServices.title,
			status: vendorBookings.status,
			agreedPrice: vendorBookings.agreedPrice,
			eventDate: vendorBookings.eventDate,
			createdAt: vendorBookings.createdAt
		})
		.from(vendorBookings)
		.innerJoin(vendors, eq(vendorBookings.vendorId, vendors.id))
		.leftJoin(vendorServices, eq(vendorBookings.serviceId, vendorServices.id))
		.where(and(eq(vendorBookings.weddingPlanId, weddingPlanId), isNull(vendorBookings.deletedAt)))
		.orderBy(asc(vendorBookings.eventDate), asc(vendorBookings.id));

	if (rows.length === 0) return [];

	// Aggregated separately so the join above doesn't fan out per payment.
	const totals = await db
		.select({
			bookingId: bookingPayments.bookingId,
			// Confirmed money less any approved partial refunds on it.
			confirmed: sql<string>`COALESCE(SUM(CASE WHEN ${bookingPayments.status} = 'confirmed' THEN ${bookingPayments.amount} - (SELECT COALESCE(SUM(r.amount), 0) FROM refunds r WHERE r.booking_payment_id = booking_payments.id AND r.status = 'approved') ELSE 0 END), 0)`,
			// Receipts waiting for review. Open Chapa attempts are left out: most are abandoned.
			pending: sql<string>`COALESCE(SUM(CASE WHEN ${bookingPayments.status} = 'pending' AND ${bookingPayments.paymentMethod} <> 'chapa' THEN ${bookingPayments.amount} ELSE 0 END), 0)`
		})
		.from(bookingPayments)
		.where(
			inArray(
				bookingPayments.bookingId,
				rows.map((r) => r.id)
			)
		)
		.groupBy(bookingPayments.bookingId);

	const byBooking = new Map(totals.map((t) => [t.bookingId, t]));

	// Each booking's payment history, newest first; abandoned Chapa attempts are noise.
	const history = await db
		.select({
			id: bookingPayments.id,
			bookingId: bookingPayments.bookingId,
			amount: bookingPayments.amount,
			method: bookingPayments.paymentMethod,
			status: bookingPayments.status,
			receiptFile: bookingPayments.receiptFile,
			note: bookingPayments.verifyPayload,
			createdAt: bookingPayments.createdAt
		})
		.from(bookingPayments)
		.where(
			and(
				inArray(
					bookingPayments.bookingId,
					rows.map((r) => r.id)
				),
				isNull(bookingPayments.deletedAt),
				sql`NOT (${bookingPayments.paymentMethod} = 'chapa' AND ${bookingPayments.status} IN ('pending', 'failed'))`
			)
		)
		.orderBy(sql`${bookingPayments.createdAt} DESC`);

	const contractByBooking = await contractsForBookings(rows.map((r) => r.id));
	const openQuotes = await db
		.select({
			id: vendorQuotes.id,
			bookingId: vendorQuotes.bookingId,
			proposedPrice: vendorQuotes.proposedPrice,
			notes: vendorQuotes.notes,
			createdAt: vendorQuotes.createdAt
		})
		.from(vendorQuotes)
		.where(
			and(
				inArray(
					vendorQuotes.bookingId,
					rows.map((r) => r.id)
				),
				eq(vendorQuotes.status, 'sent')
			)
		)
		.orderBy(sql`${vendorQuotes.createdAt} DESC`);

	return rows.map((r) => {
		const t = byBooking.get(r.id);
		const agreed = Number(r.agreedPrice ?? 0);
		const paid = Number(t?.confirmed ?? 0);
		const pending = Number(t?.pending ?? 0);
		const eventDay = r.eventDate ? String(r.eventDate).slice(0, 10) : null;

		return {
			...r,
			// Shared once the vendor has confirmed; before that, talk through Leora messages.
			vendorPhone: r.status === 'confirmed' || r.status === 'completed' ? r.vendorPhone : null,
			agreedPrice: agreed,
			paid,
			pendingPaid: pending,
			balance: Math.max(0, Math.round((agreed - paid - pending) * 100) / 100),
			/** Still owed towards the deposit that secures the date. */
			depositDue: Math.max(0, depositAmount(agreed, r.depositPercent) - paid - pending),
			balanceDueBy: balanceDueDate(eventDay, r.balanceDueDays),
			contract: contractByBooking.get(r.id) ?? null,
			quotes: openQuotes
				.filter((q) => q.bookingId === r.id)
				.map((q) => ({ ...q, proposedPrice: Number(q.proposedPrice ?? 0) })),
			payments: history
				.filter((h) => h.bookingId === r.id)
				.map((h) => ({
					id: h.id,
					amount: Number(h.amount),
					method: h.method,
					status: h.status,
					receiptFile: h.receiptFile,
					// Only a rejection reason is the couple's business; Chapa payloads are not.
					rejection: h.note?.startsWith('Rejected: ') ? h.note.slice(10) : null,
					createdAt: h.createdAt
				}))
		};
	});
}

/** Active, verified vendors available to book. */
export async function listBookableVendors() {
	return (
		db
			.select({ id: vendors.id, name: vendors.businessName })
			.from(vendors)
			// `status` is the gate, `isVerified` only a badge (docs/schema-conventions.md).
			.where(
				and(eq(vendors.isActive, true), eq(vendors.status, 'approved'), isNull(vendors.deletedAt))
			)
			.orderBy(asc(vendors.businessName))
	);
}

export async function listVendorServices(vendorId: number) {
	return db
		.select({ id: vendorServices.id, title: vendorServices.title })
		.from(vendorServices)
		.where(
			and(
				eq(vendorServices.vendorId, vendorId),
				eq(vendorServices.isActive, true),
				isNull(vendorServices.deletedAt)
			)
		)
		.orderBy(asc(vendorServices.title));
}

export async function getBookingForWedding(bookingId: number, weddingPlanId: number) {
	const [row] = await db
		.select({
			id: vendorBookings.id,
			vendorId: vendorBookings.vendorId,
			status: vendorBookings.status
		})
		.from(vendorBookings)
		.where(
			and(
				eq(vendorBookings.id, bookingId),
				eq(vendorBookings.weddingPlanId, weddingPlanId),
				isNull(vendorBookings.deletedAt)
			)
		)
		.limit(1);

	return row ?? null;
}

/** Confirms a service belongs to the vendor being booked. */
export async function serviceBelongsToVendor(serviceId: number, vendorId: number) {
	const [row] = await db
		.select({ id: vendorServices.id })
		.from(vendorServices)
		.where(
			and(
				eq(vendorServices.id, serviceId),
				eq(vendorServices.vendorId, vendorId),
				isNull(vendorServices.deletedAt)
			)
		)
		.limit(1);

	return !!row;
}

export function toDateInput(value: unknown): string {
	if (!value) return '';
	if (value instanceof Date) {
		const m = `${value.getMonth() + 1}`.padStart(2, '0');
		const d = `${value.getDate()}`.padStart(2, '0');
		return `${value.getFullYear()}-${m}-${d}`;
	}
	return String(value).slice(0, 10);
}

/**
 * The couple accepts a vendor's quote: it becomes the booking's agreed price and any other open
 * quotes on the booking are declined. Returns the vendor's user id for the notification.
 */
export async function respondToQuote(quoteId: number, weddingPlanId: number, accept: boolean) {
	return db.transaction(async (tx) => {
		const [q] = await tx
			.select({
				id: vendorQuotes.id,
				bookingId: vendorQuotes.bookingId,
				price: vendorQuotes.proposedPrice,
				status: vendorQuotes.status,
				vendorUserId: vendors.userId
			})
			.from(vendorQuotes)
			.innerJoin(vendorBookings, eq(vendorBookings.id, vendorQuotes.bookingId))
			.innerJoin(vendors, eq(vendors.id, vendorQuotes.vendorId))
			.where(and(eq(vendorQuotes.id, quoteId), eq(vendorBookings.weddingPlanId, weddingPlanId)))
			.for('update');
		if (!q || q.status !== 'sent') return null;

		await tx
			.update(vendorQuotes)
			.set({ status: accept ? 'accepted' : 'rejected' })
			.where(eq(vendorQuotes.id, q.id));
		if (accept) {
			await tx
				.update(vendorBookings)
				.set({ agreedPrice: q.price })
				.where(eq(vendorBookings.id, q.bookingId));
			await tx
				.update(vendorQuotes)
				.set({ status: 'rejected' })
				.where(and(eq(vendorQuotes.bookingId, q.bookingId), eq(vendorQuotes.status, 'sent')));
		}
		return { vendorUserId: q.vendorUserId, price: q.price, bookingId: q.bookingId };
	});
}
