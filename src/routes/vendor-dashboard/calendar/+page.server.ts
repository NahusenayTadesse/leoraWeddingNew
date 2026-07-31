import { error, fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { and, asc, eq, gte, inArray, isNull, lte, ne } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	vendors,
	vendorAvailability,
	vendorBookings,
	weddings,
	couples
} from '$lib/server/db/schema';
import {
	bulkDatesSchema,
	rangeSchema,
	cycleSchema,
	removeSchema,
	type ScheduleStatus
} from '$lib/schemas/vendor-schedule';
import type { Actions, PageServerLoad } from './$types';

/* ---------- helpers ---------- */

const bulkDefaults = { dates: [] as string[], status: 'blocked' as ScheduleStatus };

const todayISO = () => new Date().toISOString().slice(0, 10);

/** Move this to $lib/server/vendor.ts once a second dashboard page needs it. */
async function requireVendor(locals: App.Locals) {
	const userId = locals.session?.user?.id;
	if (!userId) redirect(302, '/login?redirect=/vendor/schedule');

	const [vendor] = await db
		.select({ id: vendors.id, businessName: vendors.businessName })
		.from(vendors)
		.where(and(eq(vendors.userId, userId), eq(vendors.isActive, true), isNull(vendors.deletedAt)))
		.limit(1);

	if (!vendor) error(403, 'No vendor profile is linked to this account');
	return vendor;
}

function monthWindow(param: string | null) {
	const now = new Date();
	const fallback = `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`;
	const month = param && /^\d{4}-(0[1-9]|1[0-2])$/.test(param) ? param : fallback;
	const [y, m] = month.split('-').map(Number);
	const daysInMonth = new Date(Date.UTC(y, m, 0)).getUTCDate();

	const shift = (delta: number) => {
		const d = new Date(Date.UTC(y, m - 1 + delta, 1));
		return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`;
	};

	return {
		month,
		year: y,
		monthIndex: m - 1,
		daysInMonth,
		start: `${month}-01`,
		end: `${month}-${String(daysInMonth).padStart(2, '0')}`,
		prev: shift(-1),
		next: shift(1)
	};
}

function expandRange(from: string, to: string, weekendsOnly: boolean) {
	const out: string[] = [];
	const cursor = new Date(`${from}T00:00:00Z`);
	const stop = new Date(`${to}T00:00:00Z`);
	while (cursor <= stop) {
		const dow = cursor.getUTCDay(); // 0 Sun, 6 Sat
		if (!weekendsOnly || dow === 0 || dow === 6) out.push(cursor.toISOString().slice(0, 10));
		cursor.setUTCDate(cursor.getUTCDate() + 1);
	}
	return out;
}

/** Live bookings win over any manual block. */
async function bookedAmong(vendorId: number, dates: string[]) {
	if (!dates.length) return [];
	const rows = await db
		.select({ date: vendorBookings.eventDate })
		.from(vendorBookings)
		.where(
			and(
				eq(vendorBookings.vendorId, vendorId),
				isNull(vendorBookings.deletedAt),
				ne(vendorBookings.status, 'cancelled'),
				inArray(vendorBookings.eventDate, dates)
			)
		);
	return [...new Set(rows.map((r) => String(r.date).slice(0, 10)))];
}

async function applyStatus(vendorId: number, dates: string[], status: ScheduleStatus) {
	if (!dates.length) return;

	if (status === 'clear') {
		await db
			.delete(vendorAvailability)
			.where(
				and(
					eq(vendorAvailability.vendorId, vendorId),
					inArray(vendorAvailability.availableDate, dates)
				)
			);
		return;
	}

	const isAvailable = status === 'available';
	for (let i = 0; i < dates.length; i += 250) {
		const chunk = dates.slice(i, i + 250);
		await db
			.insert(vendorAvailability)
			.values(chunk.map((d) => ({ vendorId, availableDate: d, isAvailable })))
			.onDuplicateKeyUpdate({ set: { isAvailable } });
	}
}

/* ---------- load ---------- */

export const load: PageServerLoad = async ({ locals, url, parent }) => {
	const { vendorId } = await parent();

		const [vendor] = await db
		.select({ id: vendors.id, businessName: vendors.businessName })
		.from(vendors)
		.where(and(eq(vendors.id, vendorId), eq(vendors.isActive, true), isNull(vendors.deletedAt)))
		.limit(1);


	const win = monthWindow(url.searchParams.get('month'));

	const [availability, bookings, bulkForm, rangeForm] = await Promise.all([
		db
			.select({
				id: vendorAvailability.id,
				date: vendorAvailability.availableDate,
				isAvailable: vendorAvailability.isAvailable
			})
			.from(vendorAvailability)
			.where(
				and(
					eq(vendorAvailability.vendorId, vendorId),
					gte(vendorAvailability.availableDate, win.start),
					lte(vendorAvailability.availableDate, win.end)
				)
			)
			.orderBy(asc(vendorAvailability.availableDate)),

		db
			.select({
				id: vendorBookings.id,
				date: vendorBookings.eventDate,
				status: vendorBookings.status,
				groomName: couples.groomName,
				brideName: couples.brideName
			})
			.from(vendorBookings)
			.leftJoin(weddings, eq(weddings.id, vendorBookings.weddingId))
			.leftJoin(couples, eq(couples.id, weddings.coupleId))
			.where(
				and(
					eq(vendorBookings.vendorId, vendorId),
					isNull(vendorBookings.deletedAt),
					ne(vendorBookings.status, 'cancelled'),
					gte(vendorBookings.eventDate, win.start),
					lte(vendorBookings.eventDate, win.end)
				)
			)
			.orderBy(asc(vendorBookings.eventDate)),

		superValidate(zod4(bulkDatesSchema, { defaults: bulkDefaults }), { id: 'bulk' }),
		superValidate(zod4(rangeSchema), { id: 'range' })
	]);

	const upcoming = await db
		.select({
			id: vendorAvailability.id,
			date: vendorAvailability.availableDate,
			isAvailable: vendorAvailability.isAvailable
		})
		.from(vendorAvailability)
		.where(
			and(
				eq(vendorAvailability.vendorId, vendorId),
				eq(vendorAvailability.isAvailable, false),
				gte(vendorAvailability.availableDate, todayISO())
			)
		)
		.orderBy(asc(vendorAvailability.availableDate))
		.limit(50);

	return {
		vendor,
		window: win,
		today: todayISO(),
		availability: availability.map((a) => ({ ...a, date: String(a.date).slice(0, 10) })),
		bookings: bookings.map((b) => ({ ...b, date: String(b.date).slice(0, 10) })),
		upcomingBlocks: upcoming.map((u) => ({ ...u, date: String(u.date).slice(0, 10) })),
		bulkForm,
		rangeForm
	};
};

/* ---------- actions ---------- */

export const actions: Actions = {
	setDates: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(bulkDatesSchema, { defaults: bulkDefaults }), {
			id: 'bulk'
		});
		if (!form.valid) return fail(400, { form });

		const today = todayISO();
		const dates = form.data.dates.filter((d) => d >= today);
		const skippedPast = form.data.dates.length - dates.length;
		if (!dates.length) {
			return message(form, { type: 'error', text: 'Those dates are all in the past.' }, { status: 400 });
		}

		if (form.data.status === 'blocked') {
			const clash = await bookedAmong(vendor.id, dates);
			if (clash.length) {
				return message(
					form,
					{
						type: 'error',
						text: `You have bookings on ${clash.slice(0, 5).join(', ')}${clash.length > 5 ? ` and ${clash.length - 5} more` : ''}. Cancel those first.`
					},
					{ status: 400 }
				);
			}
		}

		await applyStatus(vendor.id, dates, form.data.status);
		form.data.dates = [];

		const verb = form.data.status === 'clear' ? 'cleared' : form.data.status;
		return message(form, {
			type: 'success',
			text: `${dates.length} date${dates.length === 1 ? '' : 's'} ${verb}${skippedPast ? ` (${skippedPast} past date${skippedPast === 1 ? '' : 's'} skipped)` : ''}.`
		});
	},

	setRange: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(rangeSchema), { id: 'range' });
		if (!form.valid) return fail(400, { form });

		const today = todayISO();
		const dates = expandRange(form.data.from, form.data.to, form.data.weekendsOnly).filter(
			(d) => d >= today
		);
		if (!dates.length) {
			return message(form, { type: 'error', text: 'That range has no upcoming dates.' }, { status: 400 });
		}

		if (form.data.status === 'blocked') {
			const clash = await bookedAmong(vendor.id, dates);
			if (clash.length) {
				return message(
					form,
					{
						type: 'error',
						text: `Bookings exist on ${clash.slice(0, 5).join(', ')}${clash.length > 5 ? ` and ${clash.length - 5} more` : ''}.`
					},
					{ status: 400 }
				);
			}
		}

		await applyStatus(vendor.id, dates, form.data.status);
		return message(form, { type: 'success', text: `${dates.length} dates updated.` });
	},

	// unset -> blocked -> available -> unset
	cycle: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(cycleSchema), { id: 'cycle' });
		if (!form.valid) return fail(400, { form });

		const { date } = form.data;
		if (date < todayISO()) return fail(400, { form, reason: 'past' });

		const [existing] = await db
			.select({ id: vendorAvailability.id, isAvailable: vendorAvailability.isAvailable })
			.from(vendorAvailability)
			.where(
				and(eq(vendorAvailability.vendorId, vendor.id), eq(vendorAvailability.availableDate, date))
			)
			.limit(1);

		if (!existing) {
			if ((await bookedAmong(vendor.id, [date])).length) {
				return fail(400, { form, reason: 'booked' });
			}
			await db
				.insert(vendorAvailability)
				.values({ vendorId: vendor.id, availableDate: date, isAvailable: false });
		} else if (!existing.isAvailable) {
			await db
				.update(vendorAvailability)
				.set({ isAvailable: true })
				.where(eq(vendorAvailability.id, existing.id));
		} else {
			await db.delete(vendorAvailability).where(eq(vendorAvailability.id, existing.id));
		}

		return { form };
	},

	remove: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(removeSchema), { id: 'remove' });
		if (!form.valid) return fail(400, { form });

		await db
			.delete(vendorAvailability)
			.where(
				and(
					eq(vendorAvailability.id, form.data.id),
					eq(vendorAvailability.vendorId, vendor.id) // ownership check, not optional
				)
			);

		return { form };
	}
};