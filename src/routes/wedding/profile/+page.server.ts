import { superValidate, setError, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { couples, user } from '$lib/server/db/schema';
import { makeInviteCode, removePartner, resetInvite } from '$lib/server/partners';
import { ok, bad } from '@nahu/admin-kit/server/actionResults';
import { coupleSchema } from '$lib/schemas/couples';
import { getCoupleByUserId, uniqueSlug } from '$lib/server/couples';
import { and, eq, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	const couple = await getCoupleByUserId(locals.user!.id);
	const isPartner1 = !!couple && couple.partner1UserId === locals.user!.id;
	const partnerId = couple ? (isPartner1 ? couple.partner2UserId : couple.partner1UserId) : null;
	const [partner] = partnerId
		? await db.select({ name: user.name }).from(user).where(eq(user.id, partnerId))
		: [];

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

	return {
		form,
		isNew: !couple,
		verified: couple?.verified ?? false,
		partner: {
			/** Only partner 1 manages the invite. */
			canInvite: isPartner1,
			name: partner?.name ?? null,
			inviteUrl: couple && isPartner1 ? `${url.origin}/join/${couple.inviteCode}` : null
		}
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const userId = locals.user!.id;
		const form = await superValidate(request, zod4(coupleSchema));
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

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
					inviteCode: makeInviteCode(),
					createdBy: userId,
					updatedBy: userId
				});
			}
		} catch (e) {
			if ((e as { code?: string })?.code === 'ER_DUP_ENTRY') {
				return setError(form, 'slug', 'That link is already taken, try another.');
			}
			throw e;
		}

		return message(form, {
			type: 'success',
			text: existing ? m.srv_details_updated() : m.srv_profile_ready()
		});
	},

	newInviteLink: async ({ locals }) => {
		const couple = await getCoupleByUserId(locals.user!.id);
		if (!couple || !(await resetInvite(couple.id, locals.user!.id)))
			return bad(m.srv_not_yours(), 403);
		return ok(m.srv_partner_new_link());
	},

	removePartner: async ({ locals }) => {
		const couple = await getCoupleByUserId(locals.user!.id);
		if (!couple || !(await removePartner(couple.id, locals.user!.id)))
			return bad(m.srv_not_yours(), 403);
		return ok(m.srv_partner_removed());
	}
};
