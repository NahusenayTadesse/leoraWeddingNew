import { db } from '$lib/server/db';
import { couples } from '$lib/server/db/schema';
import { and, eq, isNull, ne, or } from 'drizzle-orm';
import { slugify } from '$lib/utils/slugify';

/** The couple record owned by a user (on either side of the partnership), ignoring soft-deleted rows. */
export async function getCoupleByUserId(userId: string) {
	const [row] = await db
		.select()
		.from(couples)
		.where(
			and(
				or(eq(couples.partner1UserId, userId), eq(couples.partner2UserId, userId)),
				isNull(couples.deletedAt)
			)
		)
		.limit(1);

	return row ?? null;
}

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
