import { db } from '$lib/server/db';
import { weddingGuests } from '$lib/server/db/schema';
import { and, asc, eq } from 'drizzle-orm';

export async function listGuests(weddingId: number) {
	return db
		.select()
		.from(weddingGuests)
		.where(eq(weddingGuests.weddingId, weddingId))
		.orderBy(asc(weddingGuests.fullName));
}

export async function assertGuestOwnership(guestId: number, weddingId: number) {
	const [row] = await db
		.select({ id: weddingGuests.id })
		.from(weddingGuests)
		.where(and(eq(weddingGuests.id, guestId), eq(weddingGuests.weddingId, weddingId)))
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