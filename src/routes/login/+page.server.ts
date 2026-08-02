import { authActions, loadAuthForms } from '$lib/server/authForms';
import type { Actions, PageServerLoad } from './$types';

/**
 * `/login` and `/signup` are the same card, opened on a different tab — see
 * `$lib/server/authForms.ts`. Both routes share one load and one set of
 * actions so they can't drift apart.
 */
export const load: PageServerLoad = async (event) => loadAuthForms(event);

export const actions = authActions satisfies Actions;
