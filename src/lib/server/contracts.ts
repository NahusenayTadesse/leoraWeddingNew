/**
 * One contract per booking: the vendor attaches a PDF, then each side signs by typing their name
 * (stored with time and IP). Replacing the document clears both signatures — nobody stays signed
 * to a version they never saw.
 */
import { and, desc, eq, inArray, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { contracts } from '$lib/server/db/schema';

export type Side = 'couple' | 'vendor';

export async function contractForBooking(bookingId: number) {
	const [row] = await db
		.select()
		.from(contracts)
		.where(and(eq(contracts.bookingId, bookingId), isNull(contracts.deletedAt)))
		.orderBy(desc(contracts.id))
		.limit(1);
	return row ?? null;
}

/** The bits of a contract either party may see. */
export function publicContract(c: NonNullable<Awaited<ReturnType<typeof contractForBooking>>>) {
	return {
		id: c.id,
		title: c.title,
		hasDocument: !!c.documentUrl,
		signedByCouple: c.signedByCouple,
		signedByVendor: c.signedByVendor,
		coupleSignedName: c.coupleSignedName,
		coupleSignedAt: c.coupleSignedAt,
		vendorSignedName: c.vendorSignedName,
		vendorSignedAt: c.vendorSignedAt
	};
}

/** Attaches (or replaces) the booking's contract document. Signatures are reset. */
export async function attachContract(input: {
	bookingId: number;
	documentUrl: string;
	title: string;
	userId: string;
}) {
	const existing = await contractForBooking(input.bookingId);
	const reset = {
		documentUrl: input.documentUrl,
		title: input.title,
		signedByCouple: false,
		signedByVendor: false,
		coupleSignedName: null,
		coupleSignedAt: null,
		coupleSignedIp: null,
		vendorSignedName: null,
		vendorSignedAt: null,
		vendorSignedIp: null,
		updatedBy: input.userId
	};
	if (existing) {
		await db.update(contracts).set(reset).where(eq(contracts.id, existing.id));
		return existing.id;
	}
	const [row] = await db
		.insert(contracts)
		.values({ bookingId: input.bookingId, ...reset, createdBy: input.userId })
		.$returningId();
	return row.id;
}

/** Records one side's typed-name signature. Returns false if there is nothing to sign. */
export async function signContract(input: {
	bookingId: number;
	side: Side;
	name: string;
	ip: string;
}): Promise<boolean> {
	const contract = await contractForBooking(input.bookingId);
	if (!contract?.documentUrl) return false;
	const now = new Date();
	const values =
		input.side === 'couple'
			? {
					signedByCouple: true,
					coupleSignedName: input.name,
					coupleSignedAt: now,
					coupleSignedIp: input.ip
				}
			: {
					signedByVendor: true,
					vendorSignedName: input.name,
					vendorSignedAt: now,
					vendorSignedIp: input.ip
				};
	await db.update(contracts).set(values).where(eq(contracts.id, contract.id));
	return true;
}

/** The current contract of each booking, keyed by booking id, in the shape the pages show. */
export async function contractsForBookings(bookingIds: number[]) {
	if (!bookingIds.length) return new Map<number, ReturnType<typeof publicContract>>();
	const rows = await db
		.select()
		.from(contracts)
		.where(and(inArray(contracts.bookingId, bookingIds), isNull(contracts.deletedAt)))
		.orderBy(desc(contracts.id));
	const map = new Map<number, ReturnType<typeof publicContract>>();
	for (const row of rows) if (!map.has(row.bookingId)) map.set(row.bookingId, publicContract(row));
	return map;
}
