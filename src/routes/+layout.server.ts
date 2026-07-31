import { db } from '$lib/server/db';
import {
	vendorServices,
	serviceCategories,
	user as userTable,
	roles,
	vendors,
	couples,
	weddings
} from '$lib/server/db/schema';
import { and, desc, eq, isNull } from 'drizzle-orm';
import { serviceCardQuery, isListable } from '$lib/server/services';
import type { LayoutServerLoad } from './$types';

/**
 * This load intentionally reads NOTHING from `url` or `params`, so SvelteKit
 * runs it once per full page load and reuses the result across every
 * client-side navigation. Anything that needs to react to the URL (filters,
 * pagination, search) belongs in a route-level +page.server.ts instead.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const currentUser = locals.user ?? null;

	// Newest 10 listable services, for the home carousel / nav previews.
	const featuredQuery = serviceCardQuery()
		.where(isListable)
		.orderBy(desc(vendorServices.createdAt))
		.limit(10);

	// Small, cacheable, used by the nav + shop facets.
	const categoriesQuery = db
		.select({
			id: serviceCategories.id,
			name: serviceCategories.name,
			description: serviceCategories.description
		})
		.from(serviceCategories)
		.where(and(eq(serviceCategories.isActive, true), isNull(serviceCategories.deletedAt)))
		.orderBy(serviceCategories.name);

	if (!currentUser) {
		const [featured, categories] = await Promise.all([featuredQuery, categoriesQuery]);
		return {
			user: null,
			roleName: '',
			vendorId: null,
			couple: null,
			budget: null,
			featured,
			categories
		};
	}

	// Guarded: the original ran these with `currentUser?.id` even when signed
	// out, which compiles to `where user_id = NULL` and silently matches nothing.
	const [featured, categories, profile, vendorRow, couple] = await Promise.all([
		featuredQuery,
		categoriesQuery,
		db
			.select({ roleName: roles.name })
			.from(userTable)
			.leftJoin(roles, eq(userTable.roleId, roles.id))
			.where(eq(userTable.id, currentUser.id))
			.limit(1)
			.then((r) => r[0]),
		db
			.select({ id: vendors.id })
			.from(vendors)
			.where(and(eq(vendors.userId, currentUser.id), isNull(vendors.deletedAt)))
			.limit(1)
			.then((r) => r[0]),
		db
			.select({ id: couples.id, slug: couples.slug, verified: couples.verified })
			.from(couples)
			.where(and(eq(couples.userId, currentUser.id), isNull(couples.deletedAt)))
			.limit(1)
			.then((r) => r[0])
	]);

	const budget = couple
		? await db
				.select()
				.from(weddings)
				.where(eq(weddings.coupleId, couple.id))
				.limit(1)
				.then((r) => r[0] ?? null)
		: null;

	return {
		user: currentUser,
		roleName: profile?.roleName ?? '',
		// Return the id, not a boolean — every vendor route needs it anyway,
		// and `!!data.vendorId` still reads fine at the call site.
		vendorId: vendorRow?.id ?? null,
		couple: couple ?? null,
		budget,
		featured,
		categories
	};
};