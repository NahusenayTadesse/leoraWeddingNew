import { and, asc, desc, eq, isNull } from 'drizzle-orm';
import { z } from 'zod/v4';
import { parse, ok, bad } from '$lib/server/adminAction';
import { message, superValidate } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { commissionSchema } from '$lib/schemas/admin';
import { db } from '$lib/server/db';
import { bankAccounts, commissionSettings } from '$lib/server/db/schema';
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
	const accounts = await db
		.select()
		.from(bankAccounts)
		.where(isNull(bankAccounts.deletedAt))
		.orderBy(asc(bankAccounts.sortOrder), asc(bankAccounts.id));
	return {
		form,
		accounts,
		commission: row
			? { id: row.id, type: row.commissionType, value: toMoney(row.value), updatedAt: row.updatedAt }
			: null
	};
};

const accountSchema = z.object({
	bankName: z.string().trim().min(2, 'Bank name is required').max(100),
	accountName: z.string().trim().min(2, 'Account name is required').max(150),
	accountNumber: z
		.string()
		.trim()
		.regex(/^[0-9 -]{6,50}$/, 'Account number should be digits'),
	sortOrder: z.coerce.number().int().min(0).max(999).default(0)
});
const accountId = z.object({ id: z.coerce.number().int().positive() });

export const actions = {
	/** An account customers may transfer to. Shown on every checkout while active. */
	addAccount: async (event) => {
		const p = await parse(event.request, accountSchema);
		if ('error' in p) return p.error;
		const [row] = await db
			.insert(bankAccounts)
			.values({ ...p.data, createdBy: event.locals.user?.id })
			.$returningId();
		await audit(event, 'settings.bank_account.add', 'bank_accounts', row.id, p.data);
		return ok('Bank account added. It now appears on checkout.');
	},
	toggleAccount: async (event) => {
		const p = await parse(event.request, accountId);
		if ('error' in p) return p.error;
		const [row] = await db.select().from(bankAccounts).where(eq(bankAccounts.id, p.data.id));
		if (!row || row.deletedAt) return bad('Account not found', 404);
		await db
			.update(bankAccounts)
			.set({ isActive: !row.isActive, updatedBy: event.locals.user?.id })
			.where(eq(bankAccounts.id, row.id));
		await audit(event, 'settings.bank_account.toggle', 'bank_accounts', row.id, { active: !row.isActive });
		return ok(row.isActive ? 'Account hidden from checkout' : 'Account shown on checkout');
	},
	/** Soft delete: past payments still point at it for reconciliation. */
	removeAccount: async (event) => {
		const p = await parse(event.request, accountId);
		if ('error' in p) return p.error;
		const res = await db
			.update(bankAccounts)
			.set({ deletedAt: new Date(), deletedBy: event.locals.user?.id, isActive: false })
			.where(and(eq(bankAccounts.id, p.data.id), isNull(bankAccounts.deletedAt)));
		if (!res[0].affectedRows) return bad('Account not found', 404);
		await audit(event, 'settings.bank_account.remove', 'bank_accounts', p.data.id);
		return ok('Bank account removed');
	},

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
