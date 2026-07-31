import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { weddings } from '$lib/server/db/schema';
import { weddingSchema } from '$lib/schemas/wedding';
import { getWeddingByCoupleId, listCities } from '$lib/server/weddings';
import { and, eq, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

/** MySQL DATE -> 'YYYY-MM-DD' regardless of whether the driver hands back a Date or a string. */
function toDateInput(value: unknown): string {
	if (!value) return '';
	if (value instanceof Date) {
		const m = `${value.getMonth() + 1}`.padStart(2, '0');
		const d = `${value.getDate()}`.padStart(2, '0');
		return `${value.getFullYear()}-${m}-${d}`;
	}
	return String(value).slice(0, 10);
}

export const load: PageServerLoad = async ({ parent }) => {
	const { couple, wedding } = await parent();
	if (!couple) throw redirect(302, '/dashboard/profile');

	const cities = await listCities();

	const form = await superValidate(
		wedding
			? {
					weddingDate: toDateInput(wedding.weddingDate),
					weddingStyle: wedding.weddingStyle ?? '',
					city: wedding.city ?? '',
					expectedGuests: wedding.expectedGuests ?? 0,
					totalBudget: Number(wedding.totalBudget ?? 0)
				}
			: {},
		zod4(weddingSchema)
	);

	return {
		form,
		isNew: !wedding,
		cityItems: cities.map((c) => ({ value: c.name, label: `${c.name} — ${c.region}` }))
	};
};

export const actions: Actions = {
	default: async ({ request, locals, parent }) => {
		const { couple } = await parent();
		if (!couple) throw redirect(302, '/dashboard/profile');

		const userId = locals.user!.id;
		const form = await superValidate(request, zod4(weddingSchema));
		if (!form.valid) return fail(400, { form });

		const existing = await getWeddingByCoupleId(couple.id);

		const values = {
			weddingDate: new Date(`${form.data.weddingDate}T00:00:00`),
			weddingStyle: form.data.weddingStyle || null,
			city: form.data.city,
			expectedGuests: form.data.expectedGuests,
			totalBudget: form.data.totalBudget.toFixed(2)
		};

		if (existing) {
			await db
				.update(weddings)
				.set({ ...values, updatedBy: userId })
				.where(and(eq(weddings.id, existing.id), isNull(weddings.deletedAt)));
		} else {
			await db.insert(weddings).values({
				...values,
				coupleId: couple.id,
				createdBy: userId,
				updatedBy: userId
			});
		}

		return message(form, existing ? 'Wedding details updated.' : 'Your wedding is set up!');
	}
};