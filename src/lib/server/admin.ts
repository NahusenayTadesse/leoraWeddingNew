import { error, redirect } from '@sveltejs/kit';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { user, roles } from '$lib/server/db/schema';

/**
 * The exact string 'Admin' is the app-wide contract for this role — see
 * database/seed.sql section 1. Do not rename it here without renaming it there.
 */
export async function requireAdmin(locals: App.Locals, redirectTo = '/admin') {
	const userId = locals.user?.id;
	if (!userId) redirect(302, `/login?redirectTo=${encodeURIComponent(redirectTo)}`);

	const [row] = await db
		.select({ roleName: roles.name })
		.from(user)
		.leftJoin(roles, eq(user.roleId, roles.id))
		.where(eq(user.id, userId))
		.limit(1);

	if (row?.roleName !== 'Admin') error(403, 'Admin access only');
	return { userId };
}
