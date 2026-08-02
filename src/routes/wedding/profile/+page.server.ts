import { fail } from '@sveltejs/kit';
import { superValidate, setError, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { couples } from '$lib/server/db/schema';
import { coupleSchema } from '$lib/schemas/couples';
import { getCoupleByUserId, uniqueSlug } from '$lib/server/couples';
import { and, eq, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await getCoupleByUserId(locals.user!.id);

	const form = await superValidate(
		couple
			? {
					groomName: couple.groomName ?? '',
					brideName: couple.brideName ?? '',
					phone: couple.phone ?? '',
					phone2: couple.phone2 ?? '',
					email: couple.email ?? '',
					slug: couple.slug ?? ''
				}
			: { email: locals.user!.email ?? '' },
		zod4(coupleSchema)
	);

	return { form, isNew: !couple, verified: couple?.verified ?? false };
};

export const actions: Actions = {
	default: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const form = await superValidate(request, zod4(coupleSchema));
		if (!form.valid) return fail(400, { form });

		const existing = await getCoupleByUserId(userId);

		const slug = await uniqueSlug(
			form.data.slug || `${form.data.brideName}-${form.data.groomName}`,
			existing?.id
		);

		const values = {
			groomName: form.data.groomName,
			brideName: form.data.brideName,
			phone: form.data.phone,
			phone2: form.data.phone2 || null,
			email: form.data.email || null,
			slug
		};

		try {
			if (existing) {
				await db
					.update(couples)
					.set({ ...values, updatedBy: userId })
					.where(and(eq(couples.id, existing.id), isNull(couples.deletedAt)));
			} else {
				await db.insert(couples).values({
					...values,
					partner1UserId: userId,
					inviteCode: crypto.randomUUID().replace(/-/g, '').slice(0, 12),
					createdBy: userId,
					updatedBy: userId
				});
			}
		} catch (e: any) {
			if (e?.code === 'ER_DUP_ENTRY') {
				return setError(form, 'slug', 'That link is already taken, try another.');
			}
			throw e;
		}

		return message(form, existing ? 'Details updated.' : 'Your couple profile is ready!');
	}
};