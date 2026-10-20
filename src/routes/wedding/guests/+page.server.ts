import { redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { guestLists } from '$lib/server/db/schema';
import { guestSchema, bulkGuestSchema, guestIdSchema } from '$lib/schemas/guest';
import { listGuests, assertGuestOwnership, parseGuestLines } from '$lib/server/guests';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { parse, bad } from '$lib/server/adminAction';
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
		if (!form.valid)
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);

		const values = {
			fullName: form.data.fullName,
			phone: form.data.phone || null,
			side: form.data.side,
			rsvpStatus: form.data.isConfirmed ? ('confirmed' as const) : ('pending' as const)
		};

		if (form.data.id) {
			if (!(await assertGuestOwnership(form.data.id, couple!.id)))
				return message(
					form,
					{ type: 'error', text: 'That is not yours to change.' },
					{ status: 403 }
				);

			await db
				.update(guestLists)
				.set(values)
				.where(and(eq(guestLists.id, form.data.id), eq(guestLists.coupleId, couple!.id)));
		} else {
			await db.insert(guestLists).values({ ...values, coupleId: couple!.id });
		}

		return message(form, {
			type: 'success',
			text: form.data.id ? 'Guest updated.' : 'Guest added.'
		});
	},

	bulk: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(bulkGuestSchema), { id: 'bulk' });
		if (!form.valid)
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);

		const parsed = parseGuestLines(form.data.names);
		if (parsed.length === 0) {
			return message(
				form,
				{ type: 'error', text: 'No usable names found in that list.' },
				{ status: 400 }
			);
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

		return message(form, {
			type: 'success',
			text: `Added ${parsed.length} guest${parsed.length === 1 ? '' : 's'}.`
		});
	},

	toggle: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const p = await parse(request, guestIdSchema);
		if ('error' in p) return p.error;

		const [current] = await db
			.select({ rsvpStatus: guestLists.rsvpStatus })
			.from(guestLists)
			.where(and(eq(guestLists.id, p.data.id), eq(guestLists.coupleId, couple!.id)))
			.limit(1);
		if (!current) return bad('That guest is not on your list.', 403);

		await db
			.update(guestLists)
			.set({ rsvpStatus: current.rsvpStatus === 'confirmed' ? 'pending' : 'confirmed' })
			.where(and(eq(guestLists.id, p.data.id), eq(guestLists.coupleId, couple!.id)));

		// Silent on success: the tick in the row is the feedback.
		return { success: true };
	},

	delete: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(guestIdSchema), { id: 'delete' });
		if (!form.valid)
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);

		if (!(await assertGuestOwnership(form.data.id, couple!.id)))
			return message(
				form,
				{ type: 'error', text: 'That is not yours to change.' },
				{ status: 403 }
			);

		await db
			.delete(guestLists)
			.where(and(eq(guestLists.id, form.data.id), eq(guestLists.coupleId, couple!.id)));

		return message(form, { type: 'success', text: 'Guest removed.' });
	}
};
