import { and, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
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
		rows: rows.map((c) => ({
			id: c.id,
			code: c.code,
			type: c.type,
			value: toMoney(c.value),
			maxUses: c.maxUses,
			usesCount: c.usesCount,
			expiresAt: c.expiresAt,
			isActive: c.isActive
		}))
	};
};

const idOnly = z.object({ id: z.coerce.number().int().positive() });

const createSchema = z
	.object({
		code: z
			.string()
			.trim()
			.toUpperCase()
			.regex(/^[A-Z0-9_-]{3,40}$/, 'Code: 3–40 letters, numbers, - or _'),
		type: z.enum(['percent', 'flat']),
		value: z.coerce.number().positive('Value must be above 0').max(99_999_999),
		maxUses: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.number().int().positive().optional()),
		expiresAt: z.preprocess((v) => (v === '' ? undefined : v), z.coerce.date().optional())
	})
	.refine((d) => d.type !== 'percent' || d.value <= 100, { message: 'A percent coupon cannot exceed 100' });

export const actions = {
	create: async (event) => {
		const p = await parse(event.request, createSchema);
		if ('error' in p) return p.error;
		const [dupe] = await db
			.select({ id: coupons.id })
			.from(coupons)
			.where(and(eq(coupons.code, p.data.code), isNull(coupons.deletedAt)));
		if (dupe) return bad(`Coupon ${p.data.code} already exists`);
		const [row] = await db
			.insert(coupons)
			.values({
				code: p.data.code,
				type: p.data.type,
				value: fromMoney(p.data.value),
				maxUses: p.data.maxUses ?? null,
				expiresAt: p.data.expiresAt ?? null,
				createdBy: event.locals.user?.id
			})
			.$returningId();
		await audit(event, 'coupon.create', 'coupon', row.id, { code: p.data.code });
		return ok(`Coupon ${p.data.code} created`);
	},
	toggle: async (event) => {
		const p = await parse(event.request, idOnly);
		if ('error' in p) return p.error;
		const [c] = await db.select({ isActive: coupons.isActive }).from(coupons).where(eq(coupons.id, p.data.id));
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
