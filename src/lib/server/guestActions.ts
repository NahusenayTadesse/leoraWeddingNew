/**
 * The form actions guests use on the invitation pages, shared by the open invitation, the
 * personal link and the wall link: send a gift, post a photo, a blessing or a song.
 */
import { fail, redirect, type RequestEvent } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { takeToken } from '$lib/server/rateLimit';
import { GiftRefused, startGift } from '$lib/server/gifts';
import { addPost } from '$lib/server/guestPosts';
import { m } from '$lib/paraglide/messages.js';

const GUEST_LIMIT = { capacity: 12, perMinute: 4 };

const say = (status: number, text: string, type: 'error' | 'success' = 'error') =>
	type === 'error' ? fail(status, { message: { type, text } }) : { message: { type, text } };

const giftSchema = z.object({
	fromName: z.string().trim().min(2).max(120),
	amount: z.coerce.number().positive(),
	message: z
		.string()
		.trim()
		.max(500)
		.transform((v) => v || null),
	phone: z
		.string()
		.trim()
		.max(20)
		.transform((v) => v || null),
	email: z
		.string()
		.trim()
		.max(190)
		.transform((v) => v || null)
});

/** Starts the Chapa checkout and sends the guest there. */
export async function giftAction(
	event: RequestEvent,
	coupleId: number,
	guestId: number | null = null
) {
	if (!takeToken(`gift:${event.getClientAddress()}`, GUEST_LIMIT))
		return say(429, m.auth_too_many());
	const parsed = giftSchema.safeParse(Object.fromEntries(await event.request.formData()));
	if (!parsed.success) return say(400, m.auth_form_invalid());
	let url: string;
	try {
		url = await startGift({ coupleId, guestId, ...parsed.data }, event.url.origin);
	} catch (err) {
		if (err instanceof GiftRefused) return say(409, err.message);
		console.error('[gifts] checkout failed:', err);
		return say(502, m.gift_failed());
	}
	redirect(303, url);
}

const postSchema = z.object({
	kind: z.enum(['photo', 'blessing', 'song']),
	authorName: z.string().trim().min(1).max(120),
	body: z
		.string()
		.trim()
		.max(500)
		.transform((v) => v || null)
});

/** A photo, blessing or song from a guest who is allowed to post (checked by the caller). */
export async function postAction(
	event: RequestEvent,
	coupleId: number,
	guestId: number | null = null
) {
	if (!takeToken(`post:${event.getClientAddress()}`, GUEST_LIMIT))
		return say(429, m.auth_too_many());
	const form = await event.request.formData();
	const parsed = postSchema.safeParse(Object.fromEntries(form));
	if (!parsed.success) return say(400, m.auth_form_invalid());
	const { kind, authorName, body } = parsed.data;

	let photo: string | null = null;
	if (kind === 'photo') {
		const file = form.get('photo');
		if (!(file instanceof File) || !file.size || !file.type.startsWith('image/'))
			return say(400, m.wall_photo_needed());
		try {
			photo = await saveUploadedFile(file);
		} catch (err) {
			if (err instanceof UploadRefused) return say(400, err.message);
			throw err;
		}
	} else if (!body) {
		return say(400, m.auth_form_invalid());
	}

	await addPost({ coupleId, guestId, kind, authorName, body, photo });
	return say(200, m.wall_thanks(), 'success');
}
