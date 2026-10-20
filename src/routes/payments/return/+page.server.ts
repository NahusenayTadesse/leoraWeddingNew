import { verify } from '$lib/server/payments';
import type { PageServerLoad } from './$types';

/** Where Chapa sends the customer back. Asks Chapa (via `verify`) and says what happened. */
export const load: PageServerLoad = async ({ url }) => {
	const txRef = url.searchParams.get('tx_ref') ?? url.searchParams.get('trx_ref') ?? '';
	const outcome = txRef
		? await verify(txRef)
		: { status: 'pending' as const, kind: null, returnPath: '/' };
	return { status: outcome.status, kind: outcome.kind, returnPath: outcome.returnPath };
};
