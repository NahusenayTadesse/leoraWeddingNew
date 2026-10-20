import type { LayoutServerLoad } from './$types';

/**
 * Only admins get here: the kit's hook (`hooks.server.ts`, rules in `$lib/access`) has already
 * refused everyone else, for actions as well as loads. This hands the menu what the viewer holds.
 */
export const load: LayoutServerLoad = ({ locals }) => ({
	permList: locals.permList,
	isSuperAdmin: locals.isSuperAdmin
});
