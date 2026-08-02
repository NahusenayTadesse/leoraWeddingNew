import { db } from '$lib/server/db';
import { guestLists } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';

/**
 * `isConfirmed` is a derived convenience for the UI, which predates the
 * three-state `rsvpStatus` column. "Confirmed" maps to rsvpStatus ===
 * 'confirmed'; both 'pending' and 'declined' read as unconfirmed.
 */
export async function listGuests(coupleId: number) {
	const rows = await db
		.select()
		.from(guestLists)
		.where(eq(guestLists.coupleId, coupleId))
		.orderBy(asc(guestLists.fullName));

	return rows.map((g) => ({ ...g, isConfirmed: g.rsvpStatus === 'confirmed' }));
}

export async function assertGuestOwnership(guestId: number, coupleId: number) {
	const [row] = await db
		.select({ id: guestLists.id })
		.from(guestLists)
		.where(and(eq(guestLists.id, guestId), eq(guestLists.coupleId, coupleId)))
		.limit(1);

	return !!row;
}

/**
 * Parses pasted lines into guest rows.
 * Accepts "Name", "Name, 0911234567" or "Name<tab>0911234567".
 */
export function parseGuestLines(raw: string) {
	const seen = new Set<string>();
	const out: { fullName: string; phone: string | null }[] = [];

	for (const line of raw.split(/\r?\n/)) {
		const trimmed = line.trim();
		if (!trimmed) continue;

		const [namePart, phonePart] = trimmed.split(/[,\t;]/, 2).map((s) => s?.trim() ?? '');
		const fullName = namePart.slice(0, 150);
		if (fullName.length < 2) continue;

		const key = fullName.toLowerCase();
		if (seen.has(key)) continue;
		seen.add(key);

		const phone = phonePart && /^(?:\+251|0)(9|7)\d{8}$/.test(phonePart) ? phonePart : null;
		out.push({ fullName, phone });
	}

	return out;
}
