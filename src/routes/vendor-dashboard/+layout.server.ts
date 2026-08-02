import { requireVendor } from '$lib/server/vendor';
import type { LayoutServerLoad } from './$types';

/**
 * Every vendor-dashboard route shares one ownership check: a vendor profile
 * must be linked to the signed-in account. `requireVendor` throws its own
 * redirect/403 — pages under here can assume `data.vendor` exists.
 */
export const load: LayoutServerLoad = async ({ locals }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard');
	return { vendor };
};
