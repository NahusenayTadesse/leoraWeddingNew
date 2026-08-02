import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subscriptionPlans, subscriptions, couples, vendorSubscriptions, vendors } from '$lib/server/db/schema';
import { contentCrud } from '$lib/server/crud';
import { subscriptionPlanAddSchema, subscriptionPlanEditSchema } from '$lib/schemas/admin';
import type { Actions, PageServerLoad } from './$types';

/**
 * Plans are a fixed catalog managed from `database/seed.sql` — this console
 * only ever changes what a plan costs, never adds or removes one. `add`/
 * `delete` exist on `crud.actions` but are deliberately left unwired below.
 */
const crud = contentCrud({
	table: subscriptionPlans,
	label: 'Plan',
	addSchema: subscriptionPlanAddSchema,
	editSchema: subscriptionPlanEditSchema,
	listFields: ['features'],
	moneyFields: ['price']
});

export const load: PageServerLoad = async (event) => {
	const { addForm, editForm, rows: plans } = await crud.load(event);

	const [coupleSubs, vendorSubs] = await Promise.all([
		db
			.select({
				id: subscriptions.id,
				planId: subscriptions.subscriptionPlanId,
				status: subscriptions.status,
				startedAt: subscriptions.startedAt,
				expiresAt: subscriptions.expiresAt,
				name: couples.brideName,
				partnerName: couples.groomName,
				email: couples.email
			})
			.from(subscriptions)
			.innerJoin(couples, eq(couples.id, subscriptions.coupleId))
			.orderBy(desc(subscriptions.startedAt)),
		db
			.select({
				id: vendorSubscriptions.id,
				planId: vendorSubscriptions.planId,
				status: vendorSubscriptions.status,
				startedAt: vendorSubscriptions.startsAt,
				expiresAt: vendorSubscriptions.endsAt,
				name: vendors.businessName,
				email: vendors.email
			})
			.from(vendorSubscriptions)
			.innerJoin(vendors, eq(vendors.id, vendorSubscriptions.vendorId))
	]);

	const subscribers = [
		...coupleSubs.map((s) => ({
			id: `couple-${s.id}`,
			planId: s.planId,
			kind: 'couple' as const,
			name: [s.name, s.partnerName].filter(Boolean).join(' & ') || 'Couple',
			email: s.email,
			status: s.status,
			startedAt: s.startedAt,
			expiresAt: s.expiresAt
		})),
		...vendorSubs.map((s) => ({
			id: `vendor-${s.id}`,
			planId: s.planId,
			kind: 'vendor' as const,
			name: s.name,
			email: s.email,
			status: s.status,
			startedAt: s.startedAt,
			expiresAt: s.expiresAt
		}))
	];

	return {
		plans: plans.map((p) => ({ ...p, price: Number(p.price) })),
		subscribers,
		addForm,
		editForm
	};
};

export const actions = {
	edit: crud.actions.edit
} satisfies Actions;
