import { db } from '$lib/server/db';
import { couples } from '$lib/server/db/schema';
import { and, eq, isNull, ne } from 'drizzle-orm';

/** The couple record owned by a user, ignoring soft-deleted rows. */
export async function getCoupleByUserId(userId: string) {
	const [row] = await db
		.select()
		.from(couples)
		.where(and(eq(couples.userId, userId), isNull(couples.deletedAt)))
		.limit(1);

	return row ?? null;
}

// export function slugify(input: string) {
// 	return input
// 		.toLowerCase()
// 		.normalize('NFKD')
// 		.replace(/[^a-z0-9\s-]/g, '')
// 		.trim()
// 		.replace(/\s+/g, '-')
// 		.replace(/-+/g, '-')
// 		.slice(0, 200);
// }

import { slugify } from '$lib/utils/slugify';

/** Appends -2, -3… until the slug is free. Excludes the couple's own row on edit. */
export async function uniqueSlug(base: string, excludeId?: number) {
	const root = slugify(base) || 'couple';
	let candidate = root;
	let n = 1;

	while (true) {
		const [hit] = await db
			.select({ id: couples.id })
			.from(couples)
			.where(
				excludeId
					? and(eq(couples.slug, candidate), ne(couples.id, excludeId))
					: eq(couples.slug, candidate)
			)
			.limit(1);

		if (!hit) return candidate;
		n += 1;
		candidate = `${root}-${n}`;
	}
}