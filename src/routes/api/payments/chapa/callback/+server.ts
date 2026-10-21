import { json, type RequestHandler } from '@sveltejs/kit';
import { verify } from '$lib/server/payments';
import { webhookSignatureOk } from '@nahu/admin-kit/server/chapa';

/**
 * Chapa calls `callback_url` with GET `?trx_ref=…&status=…` when a checkout finishes, and can also
 * POST a webhook. Neither is trusted: both only name a tx_ref, which `verify` checks with Chapa
 * server to server before anything is settled. Always 200 so Chapa does not retry forever.
 */
export const GET: RequestHandler = async ({ url }) => {
	const txRef = url.searchParams.get('trx_ref') ?? url.searchParams.get('tx_ref');
	if (!txRef) return json({ ok: false }, { status: 400 });
	const outcome = await verify(txRef);
	return json({ ok: true, status: outcome.status });
};

export const POST: RequestHandler = async ({ request }) => {
	const raw = await request.text();
	if (
		!webhookSignatureOk(
			raw,
			request.headers.get('x-chapa-signature') ?? request.headers.get('chapa-signature')
		)
	) {
		return json({ ok: false }, { status: 401 });
	}
	let txRef: string | undefined;
	try {
		const body = JSON.parse(raw);
		txRef = body?.tx_ref ?? body?.trx_ref ?? body?.data?.tx_ref;
	} catch {
		return json({ ok: false }, { status: 400 });
	}
	if (!txRef) return json({ ok: false }, { status: 400 });
	const outcome = await verify(String(txRef));
	return json({ ok: true, status: outcome.status });
};
