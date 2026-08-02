import { requireAdmin } from '$lib/server/admin';
import type { LayoutServerLoad } from './$types';

/**
 * Every admin route shares one gate: the signed-in account must carry the
 * 'Admin' role. `requireAdmin` throws its own redirect/403 — pages under here
 * can assume the visitor is an admin.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const admin = await requireAdmin(locals);
	return { admin };
};
