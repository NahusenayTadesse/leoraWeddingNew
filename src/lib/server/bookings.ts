import { db } from '$lib/server/db';
import { vendorBookings, vendors, vendorServices, bookingPayments } from '$lib/server/db/schema';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

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
			confirmed: sql<string>`COALESCE(SUM(CASE WHEN ${bookingPayments.status} = 'confirmed' THEN ${bookingPayments.amount} ELSE 0 END), 0)`,
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

	return rows.map((r) => {
		const t = byBooking.get(r.id);
		const agreed = Number(r.agreedPrice ?? 0);
		const paid = Number(t?.confirmed ?? 0);
		const pending = Number(t?.pending ?? 0);

		return {
			...r,
			agreedPrice: agreed,
			paid,
			pendingPaid: pending,
			balance: Math.max(0, Math.round((agreed - paid - pending) * 100) / 100),
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
	return db
		.select({ id: vendors.id, name: vendors.businessName })
		.from(vendors)
		// `status` is the gate, `isVerified` only a badge (docs/schema-conventions.md).
		.where(
			and(eq(vendors.isActive, true), eq(vendors.status, 'approved'), isNull(vendors.deletedAt))
		)
		.orderBy(asc(vendors.businessName));
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
