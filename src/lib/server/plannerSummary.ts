/**
 * One couple's plan, condensed for the AI assistant: what is set, what is left, what is late or
 * over budget. Read for the signed-in couple only; nothing here takes an id from the model.
 */
import { formatDateIn } from '@nahu/admin-kit/calendars';
import { getCoupleByUserId } from '$lib/server/couples';
import { getWeddingByCoupleId } from '$lib/server/weddings';
import { listBudgetItems } from '$lib/server/budget';
import { listGuests } from '$lib/server/guests';
import { listTasks, toDateInput } from '$lib/server/tasks';
import { listBookings } from '$lib/server/bookings';
import { listEvents } from '$lib/server/planner';
import { giftBalance } from '$lib/server/gifts';
import { isoDay } from '$lib/server/availability';
import { seasonNotes } from '@nahu/admin-kit/ethiopianSeasons';

export async function plannerSummary(userId: string) {
	const couple = await getCoupleByUserId(userId);
	if (!couple) return { error: 'This account has no wedding workspace yet.' };
	const wedding = await getWeddingByCoupleId(couple.id);
	if (!wedding)
		return { error: 'The couple has not set up their wedding yet (date, budget, guests).' };

	const [budget, guests, tasks, bookings, events, gifts] = await Promise.all([
		listBudgetItems(couple.id),
		listGuests(couple.id),
		listTasks(couple.id),
		listBookings(wedding.id),
		listEvents(couple.id),
		giftBalance(couple.id)
	]);

	const today = isoDay(new Date());
	const date = toDateInput(wedding.weddingDate);
	const daysAway = date
		? Math.round((Date.parse(`${date}T00:00:00Z`) - Date.parse(`${today}T00:00:00Z`)) / 86_400_000)
		: null;
	const totalBudget = Number(wedding.totalBudget ?? 0);
	const planned = budget.reduce((s, i) => s + i.plannedAmount, 0);
	const spent = budget.reduce((s, i) => s + i.actualAmount, 0);
	const open = tasks.filter((t) => t.status !== 'done');

	return {
		couple: [couple.brideName, couple.groomName].filter(Boolean).join(' & '),
		today,
		wedding: {
			date,
			dateEthiopian: date ? formatDateIn(date, 'ethiopian') : null,
			daysAway,
			city: wedding.city,
			expectedGuests: wedding.guestCountEstimate,
			seasonNotes: seasonNotes(date).map((n) => n.key)
		},
		budget: {
			total: totalBudget,
			planned,
			spent,
			overTotal: totalBudget > 0 && planned > totalBudget,
			overspentLines: budget
				.filter((i) => i.plannedAmount > 0 && i.actualAmount > i.plannedAmount)
				.map((i) => ({
					category: i.categoryName,
					planned: i.plannedAmount,
					spent: i.actualAmount
				})),
			byCategory: budget.map((i) => ({
				category: i.categoryName,
				planned: i.plannedAmount,
				spent: i.actualAmount
			}))
		},
		guests: {
			onList: guests.length,
			attending: guests.filter((g) => g.rsvpStatus === 'confirmed').length,
			declined: guests.filter((g) => g.rsvpStatus === 'declined').length,
			noReply: guests.filter((g) => g.rsvpStatus === 'pending').length
		},
		bookings: bookings.map((b) => ({
			vendor: b.vendorName,
			service: b.serviceTitle,
			status: b.status,
			eventDate: toDateInput(b.eventDate),
			agreedPrice: b.agreedPrice,
			paid: b.paid,
			stillOwed: b.balance,
			depositStillDue: b.depositDue,
			balanceDueBy: b.balanceDueBy,
			cancellationPolicy: b.policy
		})),
		tasks: {
			done: tasks.length - open.length,
			total: tasks.length,
			overdue: open
				.filter((t) => t.dueDate && toDateInput(t.dueDate) < today)
				.map((t) => ({ title: t.title, due: toDateInput(t.dueDate) })),
			next: open
				.filter((t) => !t.dueDate || toDateInput(t.dueDate) >= today)
				.slice(0, 10)
				.map((t) => ({ title: t.title, due: toDateInput(t.dueDate) || null, priority: t.priority }))
		},
		events: events.map((e) => ({ name: e.eventName, type: e.eventType, at: e.eventDate })),
		gifts: { received: gifts.received, availableToWithdraw: gifts.available }
	};
}
