import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { weddingGuests } from '$lib/server/db/schema';
import { guestSchema, bulkGuestSchema, guestIdSchema } from '$lib/schemas/guest';
import { listGuests, assertGuestOwnership, parseGuestLines } from '$lib/server/guests';
import { and, eq, not } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { wedding } = await parent();
	if (!wedding) throw redirect(302, '/dashboard/wedding');

	const [guests, form, bulkForm, deleteForm] = await Promise.all([
		listGuests(wedding.id),
		superValidate(zod4(guestSchema), { id: 'guest' }),
		superValidate(zod4(bulkGuestSchema), { id: 'bulk' }),
		superValidate(zod4(guestIdSchema), { id: 'delete' })
	]);

	return {
		guests,
		expectedGuests: wedding.expectedGuests ?? 0,
		form,
		bulkForm,
		deleteForm
	};
};

export const actions: Actions = {
	save: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(guestSchema), { id: 'guest' });
		if (!form.valid) return fail(400, { form });

		const values = {
			fullName: form.data.fullName,
			phone: form.data.phone || null,
			side: form.data.side,
			isConfirmed: form.data.isConfirmed
		};

		if (form.data.id) {
			if (!(await assertGuestOwnership(form.data.id, wedding.id))) return fail(403, { form });

			await db
				.update(weddingGuests)
				.set(values)
				.where(
					and(eq(weddingGuests.id, form.data.id), eq(weddingGuests.weddingId, wedding.id))
				);
		} else {
			await db.insert(weddingGuests).values({ ...values, weddingId: wedding.id });
		}

		return message(form, form.data.id ? 'Guest updated.' : 'Guest added.');
	},

	bulk: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(bulkGuestSchema), { id: 'bulk' });
		if (!form.valid) return fail(400, { form });

		const parsed = parseGuestLines(form.data.names);
		if (parsed.length === 0) {
			return message(form, 'No usable names found in that list.', { status: 400 });
		}

		await db.insert(weddingGuests).values(
			parsed.map((g) => ({
				weddingId: wedding.id,
				fullName: g.fullName,
				phone: g.phone,
				side: form.data.side,
				isConfirmed: false
			}))
		);

		return message(form, `Added ${parsed.length} guest${parsed.length === 1 ? '' : 's'}.`);
	},

	toggle: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(guestIdSchema), { id: 'toggle' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertGuestOwnership(form.data.id, wedding.id))) return fail(403, { form });

		await db
			.update(weddingGuests)
			.set({ isConfirmed: not(weddingGuests.isConfirmed) })
			.where(and(eq(weddingGuests.id, form.data.id), eq(weddingGuests.weddingId, wedding.id)));

		return { success: true };
	},

	delete: async ({ request, parent }) => {
		const { wedding } = await parent();
		if (!wedding) throw redirect(302, '/dashboard/wedding');

		const form = await superValidate(request, zod4(guestIdSchema), { id: 'delete' });
		if (!form.valid) return fail(400, { form });

		if (!(await assertGuestOwnership(form.data.id, wedding.id))) return fail(403, { form });

		await db
			.delete(weddingGuests)
			.where(and(eq(weddingGuests.id, form.data.id), eq(weddingGuests.weddingId, wedding.id)));

		return message(form, 'Guest removed.');
	}
};