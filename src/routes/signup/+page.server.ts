import { authActions, loadAuthForms } from '$lib/server/authForms';
import type { Actions, PageServerLoad } from './$types';

/** Same card as `/login`, opened on the Sign Up tab. */
export const load: PageServerLoad = async (event) => loadAuthForms(event);

export const actions = authActions satisfies Actions;
