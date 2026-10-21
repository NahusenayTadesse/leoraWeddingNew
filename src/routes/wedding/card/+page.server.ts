import { fail } from '@sveltejs/kit';
import { z } from 'zod/v4';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import {
	canPublish,
	cardBySlug,
	CARD_THEMES,
	CardRefused,
	ensureInviteTokens,
	inviteList,
	saveCard,
	setPublished
} from '$lib/server/cards';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { m } from '$lib/paraglide/messages.js';
import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { couples } from '$lib/server/db/schema';
import { uniqueSlug } from '$lib/server/couples';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const { couple } = await requireCoupleAndWedding(locals);
	// The card lives at /i/<slug>; couples created before slugs were required get one now.
	const slug =
		couple.slug ??
		(await uniqueSlug(
			[couple.brideName, couple.groomName].filter(Boolean).join(' and '),
			couple.id
		));
	if (!couple.slug) await db.update(couples).set({ slug }).where(eq(couples.id, couple.id));
	await ensureInviteTokens(couple.id);
	const [page, invites, publishable] = await Promise.all([
		cardBySlug(slug, couple.id),
		inviteList(couple.id),
		canPublish(couple.id)
	]);
	return {
		slug,
		origin: url.origin,
		page: page!,
		invites,
		publishable
	};
};

const optional = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((v) => v || null);

const cardSchema = z.object({
	theme: z.enum(CARD_THEMES),
	headline: optional(150),
	message: optional(2000),
	rsvpDeadline: z
		.string()
		.trim()
		.refine((v) => v === '' || /^\d{4}-\d{2}-\d{2}$/.test(v))
		.transform((v) => v || null),
	mapUrl: optional(500).refine((v) => v === null || /^https:\/\//.test(v), 'Use an https:// link'),
	removeCover: z.string().optional()
});

export const actions = {
	save: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const data = await request.formData();
		const parsed = cardSchema.safeParse(
			Object.fromEntries([...data.entries()].filter(([, v]) => typeof v === 'string'))
		);
		if (!parsed.success) return bad(parsed.error.issues[0]?.message ?? m.auth_form_invalid());

		let coverImage: string | null | undefined;
		const file = data.get('cover');
		if (file instanceof File && file.size > 0) {
			if (!file.type.startsWith('image/')) return bad(m.pay_receipt_type());
			try {
				coverImage = await saveUploadedFile(file);
			} catch (err) {
				if (err instanceof UploadRefused) return bad(err.message);
				throw err;
			}
		} else if (parsed.data.removeCover === 'yes') {
			coverImage = null;
		}

		const { removeCover: _r, ...fields } = parsed.data;
		void _r;
		await saveCard(couple.id, { ...fields, coverImage });
		return ok(m.ced_saved());
	},

	publish: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, z.object({ published: z.enum(['yes', 'no']) }));
		if ('error' in p) return p.error;
		try {
			await setPublished(couple.id, p.data.published === 'yes');
		} catch (err) {
			if (err instanceof CardRefused)
				return fail(402, { message: { type: 'error', text: err.message } });
			throw err;
		}
		return ok(p.data.published === 'yes' ? m.ced_published() : m.ced_unpublished());
	}
} satisfies Actions;
