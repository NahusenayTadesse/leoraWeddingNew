import { Chapa } from 'chapa-nodejs';
import { SECRET_KEY } from '$env/static/private';

export const chapa = new Chapa({ secretKey: SECRET_KEY });

const SEPARATOR = '::';

/**
 * A confirmation page's URL carries the tx_ref plus whatever row it needs to
 * settle (an order id, a plan id — the caller decides), base64url-encoded so
 * the link doesn't expose a bare, guessable id. This is not a security
 * boundary — settling anything still requires `chapa.verify()` to agree the
 * tx_ref actually paid — it just keeps the URL from being trivially editable.
 */
export function encodeCheckoutToken(txRef: string, subjectId: number): string {
	const raw = `${txRef}${SEPARATOR}${subjectId}`;
	return Buffer.from(raw, 'utf-8')
		.toString('base64')
		.replace(/\+/g, '-')
		.replace(/\//g, '_')
		.replace(/=+$/, '');
}

/**
 * Chapa insists on the bare local format (09xxxxxxxx / 07xxxxxxxx) — the
 * couple's number is entered either that way or as +251xxxxxxxxx, and Chapa's
 * SDK rejects the latter outright rather than normalizing it itself.
 */
export function normalizeEthiopianPhone(phone: string | null | undefined): string | undefined {
	if (!phone) return undefined;
	const cleaned = phone.trim();

	if (cleaned.startsWith('09') || cleaned.startsWith('07')) return cleaned;
	if (cleaned.startsWith('+251')) return '0' + cleaned.slice(4);

	return undefined;
}

export function decodeCheckoutToken(token: string): { txRef: string; subjectId: number } | null {
	try {
		const base64 = token.replace(/-/g, '+').replace(/_/g, '/');
		const raw = Buffer.from(base64, 'base64').toString('utf-8');
		const [txRef, subjectIdRaw] = raw.split(SEPARATOR);
		const subjectId = Number(subjectIdRaw);

		if (!txRef || !Number.isInteger(subjectId) || subjectId <= 0) return null;
		return { txRef, subjectId };
	} catch {
		return null;
	}
}
