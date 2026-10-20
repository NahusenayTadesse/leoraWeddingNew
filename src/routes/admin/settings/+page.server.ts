import { desc, eq, isNull } from 'drizzle-orm';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { commissionSchema } from '$lib/schemas/admin';
import { db } from '$lib/server/db';
import { commissionSettings } from '$lib/server/db/schema';
import { audit } from '$lib/server/auditLog';
import { fromMoney, toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

const current = () =>
	db
		.select()
		.from(commissionSettings)
		.where(isNull(commissionSettings.deletedAt))
		.orderBy(desc(commissionSettings.id))
		.limit(1);

export const load: PageServerLoad = async () => {
	const [row] = await current();
	const form = await superValidate(
		row ? { type: row.commissionType, value: toMoney(row.value) } : { type: 'percentage' as const, value: 10 },
		zod4(commissionSchema),
		{ errors: false }
	);
	return {
		form,
		commission: row
			? { id: row.id, type: row.commissionType, value: toMoney(row.value), updatedAt: row.updatedAt }
			: null
	};
};

export const actions = {
	commission: async (event) => {
		const form = await superValidate(event.request, zod4(commissionSchema));
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}
		const p = { data: form.data };
		const [row] = await current();
		const values = { commissionType: p.data.type, value: fromMoney(p.data.value) };
		if (row) {
			await db
				.update(commissionSettings)
				.set({ ...values, updatedBy: event.locals.user?.id })
				.where(eq(commissionSettings.id, row.id));
		} else {
			await db.insert(commissionSettings).values({ ...values, createdBy: event.locals.user?.id });
		}
		await audit(event, 'settings.commission', 'commission_settings', row?.id ?? null, {
			from: row ? { type: row.commissionType, value: row.value } : null,
			to: p.data
		});
		return message(form, {
			type: 'success',
			text: 'Commission updated. It applies to payments confirmed from now on.'
		});
	}
} satisfies Actions;
