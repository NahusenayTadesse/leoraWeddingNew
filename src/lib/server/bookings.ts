import { db } from '$lib/server/db';
import {
	vendorBookings,
	vendors,
	vendorServices,
	payments
} from '$lib/server/db/schema';
import { and, asc, eq, inArray, isNull, sql } from 'drizzle-orm';

export async function listBookings(weddingId: number) {
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
		.where(and(eq(vendorBookings.weddingId, weddingId), isNull(vendorBookings.deletedAt)))
		.orderBy(asc(vendorBookings.eventDate), asc(vendorBookings.id));

	if (rows.length === 0) return [];

	// Aggregated separately so the join above doesn't fan out per payment.
	const totals = await db
		.select({
			bookingId: payments.bookingId,
			confirmed: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'confirmed' THEN ${payments.amount} ELSE 0 END), 0)`,
			pending: sql<string>`COALESCE(SUM(CASE WHEN ${payments.status} = 'pending' THEN ${payments.amount} ELSE 0 END), 0)`
		})
		.from(payments)
		.where(
			inArray(
				payments.bookingId,
				rows.map((r) => r.id)
			)
		)
		.groupBy(payments.bookingId);

	const byBooking = new Map(totals.map((t) => [t.bookingId, t]));

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
			balance: Math.max(0, agreed - paid)
		};
	});
}

/** Active, verified vendors available to book. */
export async function listBookableVendors() {
	return db
		.select({ id: vendors.id, name: vendors.businessName })
		.from(vendors)
		.where(
			and(eq(vendors.isActive, true), eq(vendors.isVerified, true), isNull(vendors.deletedAt))
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

export async function getBookingForWedding(bookingId: number, weddingId: number) {
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
				eq(vendorBookings.weddingId, weddingId),
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