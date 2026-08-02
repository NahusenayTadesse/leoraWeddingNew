import { redirect } from '@sveltejs/kit';
import { listBudgetItems } from '$lib/server/budget';
import { listGuests } from '$lib/server/guests';
import { listTasks, toDateInput } from '$lib/server/tasks';
import { listBookings } from '$lib/server/bookings';
import { listVendors } from '$lib/server/vendorDirectory';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { couple, wedding } = await parent();
	if (!couple) throw redirect(302, '/wedding/profile');

	// No wedding yet — show the setup path instead of empty widgets.
	if (!wedding) {
		return {
			ready: false as const,
			coupleName: `${couple.brideName} & ${couple.groomName}`
		};
	}

	const [budgetItems, guests, tasks, bookings, recommended] = await Promise.all([
		listBudgetItems(couple.id),
		listGuests(couple.id),
		listTasks(couple.id),
		listBookings(wedding.id),
		listVendors({ sort: 'recommended', page: 1 })
	]);

	const activeBookings = bookings.filter((b) => b.status !== 'cancelled');

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayMs = today.getTime();

	const dayDiff = (value: unknown) => {
		const iso = toDateInput(value);
		if (!iso) return null;
		const d = new Date(`${iso}T00:00:00`);
		return isNaN(d.getTime()) ? null : Math.round((d.getTime() - todayMs) / 86_400_000);
	};

	const openTasks = tasks
		.filter((t) => !t.isConfirmed)
		.map((t) => ({
			id: t.id,
			title: t.title,
			dueDate: toDateInput(t.dueDate),
			daysAway: dayDiff(t.dueDate)
		}));

	return {
		ready: true as const,
		coupleName: `${couple.brideName} & ${couple.groomName}`,
		verified: couple.verified,
		slug: couple.slug,

		wedding: {
			date: toDateInput(wedding.weddingDate),
			daysAway: dayDiff(wedding.weddingDate),
			city: wedding.city,
			style: wedding.weddingStyle,
			expectedGuests: wedding.guestCountEstimate ?? 0,
			totalBudget: Number(wedding.totalBudget ?? 0)
		},

		budget: {
			itemCount: budgetItems.length,
			planned: budgetItems.reduce((s, i) => s + i.plannedAmount, 0),
			spent: budgetItems.reduce((s, i) => s + i.actualAmount, 0),
			topCategories: [...budgetItems]
				.sort((a, b) => b.plannedAmount - a.plannedAmount)
				.slice(0, 4)
				.map((i) => ({
					name: i.categoryName,
					planned: i.plannedAmount,
					actual: i.actualAmount
				}))
		},

		guests: {
			total: guests.length,
			confirmed: guests.filter((g) => g.isConfirmed).length,
			bride: guests.filter((g) => g.side === 'bride').length,
			groom: guests.filter((g) => g.side === 'groom').length
		},

		tasks: {
			total: tasks.length,
			done: tasks.filter((t) => t.isConfirmed).length,
			overdue: openTasks.filter((t) => t.daysAway !== null && t.daysAway < 0).length,
			// Overdue first, then soonest. Undated tasks last.
			next: openTasks
				.sort((a, b) => {
					if (a.daysAway === null) return 1;
					if (b.daysAway === null) return -1;
					return a.daysAway - b.daysAway;
				})
				.slice(0, 5)
		},

		bookings: {
			total: activeBookings.length,
			confirmed: activeBookings.filter((b) => b.status === 'confirmed').length,
			pending: activeBookings.filter((b) => b.status === 'pending').length,
			agreed: activeBookings.reduce((s, b) => s + b.agreedPrice, 0),
			paid: activeBookings.reduce((s, b) => s + b.paid, 0),
			outstanding: activeBookings.reduce((s, b) => s + b.balance, 0),
			awaitingConfirmation: activeBookings.reduce((s, b) => s + b.pendingPaid, 0),
			upcoming: activeBookings
				.filter((b) => b.balance > 0)
				.sort((a, b) => b.balance - a.balance)
				.slice(0, 3)
				.map((b) => ({
					id: b.id,
					vendorName: b.vendorName,
					status: b.status,
					balance: b.balance,
					eventDate: toDateInput(b.eventDate)
				}))
		},

		recommended: recommended.vendors.slice(0, 3).map((v) => ({
			id: v.id,
			name: v.businessName,
			category: v.categoryName,
			cover: v.cover,
			rating: v.avgRating,
			reviewCount: v.reviewCount,
			isVerified: v.isVerified
		}))
	};
};