import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
import { message, setError, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { couponCreateSchema } from '$lib/schemas/admin';
import { db } from '$lib/server/db';
import { coupons } from '$lib/server/db/schema';
import { parse, ok, bad } from '$lib/server/adminAction';
import { audit } from '$lib/server/auditLog';
import { fromMoney, toMoney } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async () => {
	const rows = await db
		.select()
		.from(coupons)
		.where(isNull(coupons.deletedAt))
		.orderBy(desc(coupons.createdAt));
	return {
		createForm: await superValidate(zod4(couponCreateSchema)),
		rows: rows.map((c) => ({
			id: c.id,
			code: c.code,
			type: c.type,
			value: toMoney(c.value),
			maxUses: c.maxUses,
			usesCount: c.usesCount,
			expiresAt: c.expiresAt,
			isActive: c.isActive,
			/** What the status column shows and filters on. */
			state: (c.expiresAt && c.expiresAt < new Date()
				? 'expired'
				: c.isActive
					? 'active'
					: 'paused') as 'expired' | 'active' | 'paused'
		}))
	};
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	create: async (event) => {
		const form = await superValidate(event.request, zod4(couponCreateSchema));
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}
		const [dupe] = await db
			.select({ id: coupons.id })
			.from(coupons)
			.where(and(eq(coupons.code, form.data.code), isNull(coupons.deletedAt)));
		if (dupe) return setError(form, 'code', `Coupon ${form.data.code} already exists`);
		const [row] = await db
			.insert(coupons)
			.values({
				code: form.data.code,
				type: form.data.type,
				value: fromMoney(form.data.value),
				maxUses: form.data.maxUses ?? null,
				expiresAt: form.data.expiresAt ? new Date(form.data.expiresAt) : null,
				createdBy: event.locals.user?.id
			})
			.$returningId();
		await audit(event, 'coupon.create', 'coupon', row.id, { code: form.data.code });
		return message(form, { type: 'success', text: `Coupon ${form.data.code} created` });
	},
	toggle: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const [c] = await db
			.select({ isActive: coupons.isActive })
			.from(coupons)
			.where(eq(coupons.id, p.data.id));
		if (!c) return bad('Coupon not found');
		await db.update(coupons).set({ isActive: !c.isActive }).where(eq(coupons.id, p.data.id));
		await audit(event, 'coupon.toggle', 'coupon', p.data.id, { isActive: !c.isActive });
		return ok(c.isActive ? 'Coupon paused' : 'Coupon activated');
	},
	remove: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		await db
			.update(coupons)
			.set({ deletedAt: new Date(), deletedBy: event.locals.user?.id ?? null, isActive: false })
			.where(eq(coupons.id, p.data.id));
		await audit(event, 'coupon.remove', 'coupon', p.data.id);
		return ok('Coupon deleted');
	}
} satisfies Actions;
