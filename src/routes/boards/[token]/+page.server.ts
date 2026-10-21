import { error } from '@sveltejs/kit';
import { boardByToken } from '$lib/server/boards';
import type { PageServerLoad } from './$types';

/** A couple's board as they sent it to a vendor: pictures only, nothing about the couple. */
export const load: PageServerLoad = async ({ params }) => {
	const board = await boardByToken(params.token);
	if (!board) error(404, 'Board not found');
	return { board };
};
