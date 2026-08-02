import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { guestLists } from '$lib/server/db/schema';
import { guestSchema, bulkGuestSchema, guestIdSchema } from '$lib/schemas/guest';
import { listGuests, assertGuestOwnership, parseGuestLines } from '$lib/server/guests';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { and, eq } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { couple, wedding } = await parent();
	if (!wedding) throw redirect(302, '/wedding/wedding');

	const [guests, form, bulkForm, deleteForm] = await Promise.all([
		listGuests(couple!.id),
		superValidate(zod4(guestSchema), { id: 'guest' }),
		superValidate(zod4(bulkGuestSchema), { id: 'bulk' }),
		superValidate(zod4(guestIdSchema), { id: 'delete' })
	]);

	return {
		guests,
		expectedGuests: wedding.guestCountEstimate ?? 0,
		form,
		bulkForm,
		deleteForm
	};
};

export const actions: Actions = {
	save: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(guestSchema), { id: 'guest' });
		if (!form.valid) return fail(400, { form });

		const values = {
			fullName: form.data.fullName,
			phone: form.data.phone || null,
			side: form.data.side,
			rsvpStatus: form.data.isConfirmed ? ('confirmed' as const) : ('pending' as const)
		};

		if (form.data.id) {
			if (!(await assertGuestOwnership(form.data.id, couple!.id))) return fail(403, { form });

			await db
				.update(guestLists)
				.set(values)
				.where(and(eq(guestLists.id, form.data.id), eq(guestLists.coupleId, couple!.id)));
		} else {
			await db.insert(guestLists).values({ ...values, coupleId: couple!.id });
		}

		return message(form, form.data.id ? 'Guest updated.' : 'Guest added.');
	},

	bulk: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(bulkGuestSchema), { id: 'bulk' });
		if (!form.valid) return fail(400, { form });

		const parsed = parseGuestLines(form.data.names);
		if (parsed.length === 0) {
			return message(form, 'No usable names found in that list.', { status: 400 });
		}

		await db.insert(guestLists).values(
			parsed.map((g) => ({
				coupleId: couple!.id,
				fullName: g.fullName,
				phone: g.phone,
				side: form.data.side,
				rsvpStatus: 'pending' as const
			}))
		);

		return message(form, `Added ${parsed.length} guest${parsed.length === 1 ? '' : 's'}.`);
	},

	toggle: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(guestIdSchema), { id: 'toggle' });
		if (!form.valid) return fail(400, { form });

		const [current] = await db
			.select({ rsvpStatus: guestLists.rsvpStatus })
			.from(guestLists)
			.where(and(eq(guestLists.id, form.data.id), eq(guestLists.coupleId, couple!.id)))
			.limit(1);
		if (!current) return fail(403, { form });

		await db
			.update(guestLists)
			.set({ rsvpStatus: current.rsvpStatus === 'confirmed' ? 'pending' : 'confirmed' })
			.where(and(eq(guestLists.id, form.data.id), eq(guestLists.coupleId, couple!.id)));

		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(guestIdSchema), { id: 'delete' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertGuestOwnership(form.data.id, couple!.id))) return fail(403, { form });

		await db
			.delete(guestLists)
			.where(and(eq(guestLists.id, form.data.id), eq(guestLists.coupleId, couple!.id)));

		return message(form, 'Guest removed.');
	}
};
