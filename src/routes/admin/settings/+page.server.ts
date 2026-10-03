import { desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
import { db } from '$lib/server/db';
import { commissionSettings } from '$lib/server/db/schema';
import { parse, ok } from '$lib/server/adminAction';
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
	return {
		commission: row
			? { id: row.id, type: row.commissionType, value: toMoney(row.value), updatedAt: row.updatedAt }
			: null
	};
};

const schema = z
	.object({
		type: z.enum(['percentage', 'fixed']),
		value: z.coerce.number().min(0, 'Cannot be negative').max(99_999_999)
	})
	.refine((d) => d.type !== 'percentage' || d.value <= 100, { message: 'A percentage cannot exceed 100' });

export const actions = {
	commission: async (event) => {
		const p = await parse(event.request, schema);
		if ('error' in p) return p.error;
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
		return ok('Commission updated. It applies to payments confirmed from now on.');
	}
} satisfies Actions;
