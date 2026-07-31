import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, eq, isNull, sql, inArray } from 'drizzle-orm';
import { addUser } from '$lib/ZodSchema.js';
import { db } from '$lib/server/db';
import {
	weddings,
	couples,
	budgetCategories,
	weddingBudgetItems,
	serviceCategories,
	vendorServices
} from '$lib/server/db/schema';
import { budgetSchema, WEDDING_STYLES, type WeddingStyle } from './schema';
import type { Actions, PageServerLoad } from './$types';

/** Existing rows may hold a style we no longer offer — fall back rather than fail validation. */
const coerceStyle = (value: string | null | undefined): WeddingStyle =>
	WEDDING_STYLES.includes(value as WeddingStyle) ? (value as WeddingStyle) : WEDDING_STYLES[0];

/** `date` columns come back as Date objects; the <input type="date"> wants YYYY-MM-DD. */
const toDateInput = (value: Date | string | null | undefined): string => {
	if (!value) return '';
	if (typeof value === 'string') return value.slice(0, 10);
	return value.toISOString().slice(0, 10);
};

export const load: PageServerLoad = async ({ parent }) => {
	// The root layout already resolved these — don't pay for them twice.
	const { user, couple, budget } = await parent();

	const [categories, existingItems] = await Promise.all([
		// Budget categories, each joined to the matching service category so the
		// "Browse" links can deep-link into /shop with a real category filter.
		db
			.select({
				id: budgetCategories.id,
				name: budgetCategories.name,
				description: budgetCategories.description,
				serviceCategoryId: serviceCategories.id,
				vendorCount: sql<number>`(
					select count(*) from ${vendorServices}
					where ${vendorServices.categoryId} = ${serviceCategories.id}
					  and ${vendorServices.isActive} = 1
					  and ${vendorServices.deletedAt} is null
				)`
			})
			.from(budgetCategories)
			// Name match is a stopgap. See the note about adding
			// budgetCategories.serviceCategoryId as a real FK.
			.leftJoin(serviceCategories, eq(serviceCategories.name, budgetCategories.name))
			.where(and(eq(budgetCategories.isActive, true), isNull(budgetCategories.deletedAt)))
			.orderBy(budgetCategories.id),

		budget
			? db
					.select({
						categoryId: weddingBudgetItems.categoryId,
						plannedAmount: weddingBudgetItems.plannedAmount
					})
					.from(weddingBudgetItems)
					.where(eq(weddingBudgetItems.weddingId, budget.id))
			: Promise.resolve([])
	]);

	// decimal columns arrive as strings — never let parseFloat near money you
	// intend to write back. Here it only feeds a percentage, so it's safe.
	const savedTotal = budget?.totalBudget ? Number(budget.totalBudget) : 0;

	const savedPercents = new Map(
		existingItems.map((item) => [
			item.categoryId,
			savedTotal > 0 ? (Number(item.plannedAmount ?? 0) / savedTotal) * 100 : 0
		])
	);

	// Even split when nothing has been saved yet, so the bar is never empty.
	const evenSplit = categories.length > 0 ? 100 / categories.length : 0;

	// Seed defaults HERE rather than assigning to $form in the component. The old
	// version read `data.budget.weddingDate.toLocaleDateString()` at component
	// init, which threw whenever weddingDate was null (it's nullable), and wrote
	// NaN into the inputs whenever there was no saved budget at all.
	const form = await superValidate(
		{
			totalBudget: savedTotal,
			expectedGuests: budget?.expectedGuests ?? 0,
			weddingStyle: coerceStyle(budget?.weddingStyle),
			weddingDate: toDateInput(budget?.weddingDate),
			allocations: categories.map((c) => ({
				categoryId: c.id,
				percent: Math.round(savedPercents.get(c.id) ?? evenSplit)
			}))
		},
		zod4(budgetSchema),
		// Don't show "required" errors on a form the user hasn't touched yet.
		{ errors: false }
	);

	return {
		form,
		signupForm: await superValidate(zod4(addUser)),
		categories,
		hasCouple: Boolean(couple),
		user
	};
};

export const actions: Actions = {
	budget: async ({ request, locals }) => {
		const form = await superValidate(request, zod4(budgetSchema));

		if (!form.valid) {
			return message(form, { type: 'error', text: 'Check the highlighted fields' }, { status: 400 });
		}

		// The original action never checked for a session, so a signed-out request
		// ran `where user_id = NULL` and fell through to the success message.
		if (!locals.user?.id) {
			return message(form, { type: 'error', text: 'Sign in to save your budget' }, { status: 401 });
		}

		const { weddingDate, totalBudget, expectedGuests, weddingStyle, allocations } = form.data;

		// Resolved BEFORE the transaction on purpose. Returning `message()` from
		// inside a transaction callback returns it to the transaction, not to the
		// client — the tx still commits and the outer function still returns
		// success, so the old "Couple not found" branch could never be seen.
		const couple = await db
			.select({ id: couples.id })
			.from(couples)
			.where(and(eq(couples.userId, locals.user.id), isNull(couples.deletedAt)))
			.limit(1)
			.then((rows) => rows[0]);

		if (!couple) {
			return message(
				form,
				{ type: 'error', text: 'Only couples can save a budget. Create a couple profile first.' },
				{ status: 403 }
			);
		}

		// Reject allocations pointing at categories that don't exist or were
		// disabled between page load and submit.
		const categoryIds = allocations.map((a) => a.categoryId);
		const validIds = categoryIds.length
			? await db
					.select({ id: budgetCategories.id })
					.from(budgetCategories)
					.where(
						and(
							inArray(budgetCategories.id, categoryIds),
							eq(budgetCategories.isActive, true),
							isNull(budgetCategories.deletedAt)
						)
					)
					.then((rows) => new Set(rows.map((r) => r.id)))
			: new Set<number>();

		const cleanAllocations = allocations.filter((a) => validIds.has(a.categoryId) && a.percent > 0);

		try {
			await db.transaction(async (tx) => {
				const existing = await tx
					.select({ id: weddings.id })
					.from(weddings)
					.where(and(eq(weddings.coupleId, couple.id), isNull(weddings.deletedAt)))
					.limit(1)
					.then((rows) => rows[0]);

				const values = {
					weddingDate: new Date(weddingDate),
					// decimal columns take strings in Drizzle. Passing a JS number
					// works by accident until a value needs more precision than a
					// float can hold.
					totalBudget: totalBudget.toFixed(2),
					expectedGuests,
					weddingStyle,
					coupleId: couple.id,
					updatedBy: locals.user!.id
				};

				let weddingId: number;

				if (existing) {
					// The original did `delete(weddings)` then `insert`. weddings.id is
					// referenced by wedding_guests, wedding_tasks, wedding_budget_items,
					// vendor_bookings and payments — so that either threw on the FK
					// constraint or wiped the couple's entire planning history every
					// time they edited a number. Update in place instead.
					await tx.update(weddings).set(values).where(eq(weddings.id, existing.id));
					weddingId = existing.id;
				} else {
					const [result] = await tx
						.insert(weddings)
						.values({ ...values, createdBy: locals.user!.id });
					weddingId = result.insertId;
				}

				// Budget items have no dependents, so replace-in-place is safe here.
				await tx.delete(weddingBudgetItems).where(eq(weddingBudgetItems.weddingId, weddingId));

				if (cleanAllocations.length > 0) {
					await tx.insert(weddingBudgetItems).values(
						cleanAllocations.map((a) => ({
							weddingId,
							categoryId: a.categoryId,
							plannedAmount: ((totalBudget * a.percent) / 100).toFixed(2)
						}))
					);
				}
			});
		} catch (err) {
			console.error('[budget] save failed', err);
			return message(
				form,
				{ type: 'error', text: 'Could not save your budget. Try again in a moment.' },
				{ status: 500 }
			);
		}

		return message(form, { type: 'success', text: 'Budget saved' });
	}
};