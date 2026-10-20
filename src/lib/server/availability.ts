import { and, between, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendorAvailability, vendorBookings } from '$lib/server/db/schema';

/** `YYYY-MM-DD` for a Date, in local time (dates here are calendar days, not instants). */
export function isoDay(d: Date): string {
	const pad = (n: number) => String(n).padStart(2, '0');
	return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

/**
 * A vendor's busy days between two dates: days they blocked by hand, and days with a confirmed
 * booking. Rows in `vendor_availability` with `is_available = false` are the blocks.
 */
export async function busyDays(vendorId: number, from: string, to: string) {
	const [blocked, booked] = await Promise.all([
		db
			.select({ day: vendorAvailability.availableDate })
			.from(vendorAvailability)
			.where(
				and(
					eq(vendorAvailability.vendorId, vendorId),
					eq(vendorAvailability.isAvailable, false),
					between(vendorAvailability.availableDate, from, to)
				)
			),
		db
			.selectDistinct({ day: vendorBookings.eventDate })
			.from(vendorBookings)
			.where(
				and(
					eq(vendorBookings.vendorId, vendorId),
					eq(vendorBookings.status, 'confirmed'),
					isNull(vendorBookings.deletedAt),
					between(vendorBookings.eventDate, from, to)
				)
			)
	]);
	const day = (v: unknown) => (v instanceof Date ? isoDay(v) : String(v).slice(0, 10));
	return {
		blocked: blocked.map((r) => day(r.day)),
		booked: booked.map((r) => day(r.day)).filter(Boolean)
	};
}

export async function isBlocked(vendorId: number, day: string): Promise<boolean> {
	const [row] = await db
		.select({ id: vendorAvailability.id })
		.from(vendorAvailability)
		.where(
			and(
				eq(vendorAvailability.vendorId, vendorId),
				eq(vendorAvailability.availableDate, day),
				eq(vendorAvailability.isAvailable, false)
			)
		)
		.limit(1);
	return !!row;
}

/** Blocks a free day, or frees a blocked one. Returns the new state. */
export async function toggleBlocked(vendorId: number, day: string): Promise<'blocked' | 'free'> {
	if (await isBlocked(vendorId, day)) {
		await db
			.delete(vendorAvailability)
			.where(
				and(eq(vendorAvailability.vendorId, vendorId), eq(vendorAvailability.availableDate, day))
			);
		return 'free';
	}
	await db
		.insert(vendorAvailability)
		.values({ vendorId, availableDate: day, isAvailable: false })
		.onDuplicateKeyUpdate({ set: { isAvailable: false } });
	return 'blocked';
}
