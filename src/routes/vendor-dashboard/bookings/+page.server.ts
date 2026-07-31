import { fail } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import {
	and,
	asc,
	count,
	desc,
	eq,
	gte,
	inArray,
	isNull,
	like,
	lt,
	lte,
	ne,
	or,
	sql
} from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	vendorBookings,
	vendorServices,
	vendorQuotes,
	vendorAvailability,
	weddings,
	couples,
	payments,
	contracts,
	disputes,
    vendors
} from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import {
	bookingFilters,
	confirmSchema,
	cancelSchema,
	quoteSchema,
	rescheduleSchema
} from '$lib/schemas/vendor-bookings';
import type { Actions, PageServerLoad } from './$types';

const PAGE_SIZE = 20;
const todayISO = () => new Date().toISOString().slice(0, 10);
const day = (v: unknown) => (v == null ? null : String(v).slice(0, 10));

/** decimal columns want strings; passing a JS number silently loses precision. */
const toDecimal = (n: number) => n.toFixed(2);

/**
 * A booking's own eventDate is optional — fall back to the wedding day so
 * nothing disappears from the upcoming/past tabs just because it was left blank.
 */
const effectiveDate = sql<string>`coalesce(${vendorBookings.eventDate}, ${weddings.weddingDate})`;

/** Other confirmed work on the same day. */
async function sameDayConfirmed(vendorId: number, date: string, excludeId: number) {
	return db
		.select({ id: vendorBookings.id, groom: couples.groomName, bride: couples.brideName })
		.from(vendorBookings)
		.leftJoin(weddings, eq(weddings.id, vendorBookings.weddingId))
		.leftJoin(couples, eq(couples.id, weddings.coupleId))
		.where(
			and(
				eq(vendorBookings.vendorId, vendorId),
				eq(vendorBookings.status, 'confirmed'),
				eq(vendorBookings.eventDate, date),
				ne(vendorBookings.id, excludeId),
				isNull(vendorBookings.deletedAt)
			)
		);
}

/** Loads a booking and proves it belongs to this vendor in one shot. */
async function ownedBooking(vendorId: number, id: number) {
	const [row] = await db
		.select({
			id: vendorBookings.id,
			status: vendorBookings.status,
			eventDate: vendorBookings.eventDate,
			weddingDate: weddings.weddingDate,
			agreedPrice: vendorBookings.agreedPrice
		})
		.from(vendorBookings)
		.leftJoin(weddings, eq(weddings.id, vendorBookings.weddingId))
		.where(
			and(
				eq(vendorBookings.id, id),
				eq(vendorBookings.vendorId, vendorId),
				isNull(vendorBookings.deletedAt)
			)
		)
		.limit(1);
	return row ?? null;
}

/* ---------------- load ---------------- */

export const load: PageServerLoad = async ({ locals, url, parent }) => {
    const { vendorId } = await parent();

        const [vendor] = await db
        .select({ id: vendors.id, businessName: vendors.businessName })
        .from(vendors)
        .where(and(eq(vendors.id, vendorId), eq(vendors.isActive, true), isNull(vendors.deletedAt)))
        .limit(1);
	const f = bookingFilters.parse(Object.fromEntries(url.searchParams));
	const today = todayISO();

	const where = [eq(vendorBookings.vendorId, vendor.id), isNull(vendorBookings.deletedAt)];

	if (f.tab === 'pending') where.push(eq(vendorBookings.status, 'pending'));
	if (f.tab === 'confirmed') where.push(eq(vendorBookings.status, 'confirmed'));
	if (f.tab === 'cancelled') where.push(eq(vendorBookings.status, 'cancelled'));
	if (f.tab === 'upcoming') {
		where.push(ne(vendorBookings.status, 'cancelled'), gte(effectiveDate, today));
	}
	if (f.tab === 'past') {
		where.push(ne(vendorBookings.status, 'cancelled'), lt(effectiveDate, today));
	}

	if (f.from) where.push(gte(effectiveDate, f.from));
	if (f.to) where.push(lte(effectiveDate, f.to));
	if (f.serviceId) where.push(eq(vendorBookings.serviceId, f.serviceId));
	if (f.q) {
		const term = `%${f.q}%`;
		where.push(
			or(
				like(couples.groomName, term),
				like(couples.brideName, term),
				like(couples.phone, term),
				like(couples.email, term),
				like(vendorServices.title, term),
				like(weddings.city, term)
			)!
		);
	}

	const orderBy = {
		date_asc: asc(effectiveDate),
		date_desc: desc(effectiveDate),
		created_desc: desc(vendorBookings.createdAt),
		price_desc: desc(vendorBookings.agreedPrice)
	}[f.sort];

	const [rows, [{ total }], statusRows, services, confirmForm, cancelForm, quoteForm, rescheduleForm] =
		await Promise.all([
			db
				.select({
					id: vendorBookings.id,
					status: vendorBookings.status,
					agreedPrice: vendorBookings.agreedPrice,
					ownEventDate: vendorBookings.eventDate,
					eventDate: effectiveDate,
					createdAt: vendorBookings.createdAt,
					cancellationReason: vendorBookings.cancellationReason,
					cancelledBy: vendorBookings.cancelledBy,
					weddingId: weddings.id,
					weddingDate: weddings.weddingDate,
					weddingStyle: weddings.weddingStyle,
					city: weddings.city,
					expectedGuests: weddings.expectedGuests,
					coupleId: couples.id,
					groomName: couples.groomName,
					brideName: couples.brideName,
					phone: couples.phone,
					phone2: couples.phone2,
					email: couples.email,
					coupleVerified: couples.verified,
					serviceId: vendorServices.id,
					serviceTitle: vendorServices.title,
					serviceImage: vendorServices.featuredImage,
					currency: vendorServices.currency
				})
				.from(vendorBookings)
				.leftJoin(weddings, eq(weddings.id, vendorBookings.weddingId))
				.leftJoin(couples, eq(couples.id, weddings.coupleId))
				.leftJoin(vendorServices, eq(vendorServices.id, vendorBookings.serviceId))
				.where(and(...where))
				.orderBy(orderBy)
				.limit(PAGE_SIZE)
				.offset((f.page - 1) * PAGE_SIZE),

			db
				.select({ total: count() })
				.from(vendorBookings)
				.leftJoin(weddings, eq(weddings.id, vendorBookings.weddingId))
				.leftJoin(couples, eq(couples.id, weddings.coupleId))
				.leftJoin(vendorServices, eq(vendorServices.id, vendorBookings.serviceId))
				.where(and(...where)),

			db
				.select({ status: vendorBookings.status, c: count() })
				.from(vendorBookings)
				.where(
					and(eq(vendorBookings.vendorId, vendor.id), isNull(vendorBookings.deletedAt))
				)
				.groupBy(vendorBookings.status),

			db
				.select({ value: vendorServices.id, label: vendorServices.title })
				.from(vendorServices)
				.where(
					and(
						eq(vendorServices.vendorId, vendor.id),
						eq(vendorServices.isActive, true),
						isNull(vendorServices.deletedAt)
					)
				)
				.orderBy(asc(vendorServices.title)),

			superValidate(zod4(confirmSchema), { id: 'confirm' }),
			superValidate(zod4(cancelSchema), { id: 'cancel' }),
			superValidate(zod4(quoteSchema), { id: 'quote' }),
			superValidate(zod4(rescheduleSchema), { id: 'reschedule' })
		]);

	const ids = rows.map((r) => r.id);

	/* Side data for the visible page only — three cheap keyed lookups. */
	const [paid, contractRows, disputeRows] = ids.length
		? await Promise.all([
				db
					.select({
						bookingId: payments.bookingId,
						total: sql<string>`sum(${payments.amount})`,
						c: count()
					})
					.from(payments)
					.where(and(inArray(payments.bookingId, ids), eq(payments.status, 'confirmed')))
					.groupBy(payments.bookingId),
				db
					.select({
						bookingId: contracts.bookingId,
						signedByCouple: contracts.signedByCouple,
						signedByVendor: contracts.signedByVendor,
						documentUrl: contracts.documentUrl
					})
					.from(contracts)
					.where(and(inArray(contracts.bookingId, ids), isNull(contracts.deletedAt))),
				db
					.select({ bookingId: disputes.bookingId, status: disputes.status })
					.from(disputes)
					.where(
						and(
							inArray(disputes.bookingId, ids),
							ne(disputes.status, 'resolved')
						)
					)
			])
		: [[], [], []];

	const paidMap = new Map(paid.map((p) => [p.bookingId, { total: Number(p.total ?? 0), count: p.c }]));
	const contractMap = new Map(contractRows.map((c) => [c.bookingId, c]));
	const disputeSet = new Set(disputeRows.map((d) => d.bookingId));

	const byStatus = Object.fromEntries(statusRows.map((s) => [s.status, s.c]));

	return {
		vendor,
		filters: f,
		today,
		services,
		bookings: rows.map((r) => {
			const price = r.agreedPrice ? Number(r.agreedPrice) : 0;
			const p = paidMap.get(r.id);
			return {
				...r,
				eventDate: day(r.eventDate),
				ownEventDate: day(r.ownEventDate),
				weddingDate: day(r.weddingDate),
				agreedPrice: price,
				paidTotal: p?.total ?? 0,
				paymentCount: p?.count ?? 0,
				outstanding: Math.max(price - (p?.total ?? 0), 0),
				contract: contractMap.get(r.id) ?? null,
				hasDispute: disputeSet.has(r.id)
			};
		}),
		stats: {
			pending: byStatus.pending ?? 0,
			confirmed: byStatus.confirmed ?? 0,
			cancelled: byStatus.cancelled ?? 0,
			total: (byStatus.pending ?? 0) + (byStatus.confirmed ?? 0) + (byStatus.cancelled ?? 0)
		},
		pagination: {
			page: f.page,
			pageSize: PAGE_SIZE,
			total,
			pages: Math.max(Math.ceil(total / PAGE_SIZE), 1)
		},
		confirmForm,
		cancelForm,
		quoteForm,
		rescheduleForm
	};
};

/* ---------------- actions ---------------- */

export const actions: Actions = {
	confirm: async ({ request, locals }) => {
		const vendor = await requireVendor(locals, '/vendor/bookings');
		const form = await superValidate(request, zod4(confirmSchema), { id: 'confirm' });
		if (!form.valid) return fail(400, { form });

		const booking = await ownedBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found.' }, { status: 404 });
		if (booking.status === 'cancelled') {
			return message(
				form,
				{ type: 'error', text: 'This booking was cancelled and cannot be confirmed.' },
				{ status: 400 }
			);
		}

		const date = day(booking.eventDate ?? booking.weddingDate);

		if (date && !form.data.allowOverlap) {
			const clash = await sameDayConfirmed(vendor.id, date, booking.id);
			if (clash.length) {
				const names = clash
					.map((c) => [c.groom, c.bride].filter(Boolean).join(' & ') || `#${c.id}`)
					.join(', ');
				return message(
					form,
					{
						type: 'error',
						text: `You already have confirmed work on ${date} (${names}). Tick "allow same-day" if you can cover both.`
					},
					{ status: 409 }
				);
			}
		}

		// The vendor is taking this day, so drop any manual block sitting on it.
		if (date) {
			await db
				.delete(vendorAvailability)
				.where(
					and(
						eq(vendorAvailability.vendorId, vendor.id),
						eq(vendorAvailability.availableDate, date),
						eq(vendorAvailability.isAvailable, false)
					)
				);
		}

		await db
			.update(vendorBookings)
			.set({
				status: 'confirmed',
				...(form.data.agreedPrice !== undefined
					? { agreedPrice: toDecimal(form.data.agreedPrice) }
					: {}),
				updatedBy: vendor.userId
			})
			.where(and(eq(vendorBookings.id, booking.id), eq(vendorBookings.vendorId, vendor.id)));

		return message(form, { type: 'success', text: 'Booking confirmed.' });
	},

	cancel: async ({ request, locals }) => {
		const vendor = await requireVendor(locals, '/vendor/bookings');
		const form = await superValidate(request, zod4(cancelSchema), { id: 'cancel' });
		if (!form.valid) return fail(400, { form });

		const booking = await ownedBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found.' }, { status: 404 });
		if (booking.status === 'cancelled') {
			return message(form, { type: 'error', text: 'Already cancelled.' }, { status: 400 });
		}

		// Money already collected means this needs the refund flow, not a status flip.
		const [{ c: settled }] = await db
			.select({ c: count() })
			.from(payments)
			.where(and(eq(payments.bookingId, booking.id), eq(payments.status, 'confirmed')));

		if (settled > 0) {
			return message(
				form,
				{
					type: 'error',
					text: 'This booking has confirmed payments. Raise a refund before cancelling.'
				},
				{ status: 409 }
			);
		}

		await db
			.update(vendorBookings)
			.set({
				status: 'cancelled',
				cancellationReason: form.data.reason,
				cancelledBy: 'vendor',
				cancelledAt: new Date(),
				updatedBy: vendor.userId
			})
			.where(and(eq(vendorBookings.id, booking.id), eq(vendorBookings.vendorId, vendor.id)));

		return message(form, { type: 'success', text: 'Booking cancelled and the couple notified.' });
	},

	quote: async ({ request, locals }) => {
		const vendor = await requireVendor(locals, '/vendor/bookings');
		const form = await superValidate(request, zod4(quoteSchema), { id: 'quote' });
		if (!form.valid) return fail(400, { form });

		const booking = await ownedBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found.' }, { status: 404 });
		if (booking.status === 'cancelled') {
			return message(form, { type: 'error', text: 'This booking is cancelled.' }, { status: 400 });
		}

		await db.insert(vendorQuotes).values({
			bookingId: booking.id,
			vendorId: vendor.id,
			proposedPrice: toDecimal(form.data.proposedPrice),
			notes: form.data.notes || null,
			status: 'sent'
		});

		return message(form, { type: 'success', text: 'Quote sent to the couple.' });
	},

	reschedule: async ({ request, locals }) => {
		const vendor = await requireVendor(locals, '/vendor/bookings');
		const form = await superValidate(request, zod4(rescheduleSchema), { id: 'reschedule' });
		if (!form.valid) return fail(400, { form });

		const booking = await ownedBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found.' }, { status: 404 });
		if (form.data.eventDate < todayISO()) {
			return message(form, { type: 'error', text: 'Pick a date in the future.' }, { status: 400 });
		}

		if (!form.data.allowOverlap) {
			const clash = await sameDayConfirmed(vendor.id, form.data.eventDate, booking.id);
			if (clash.length) {
				return message(
					form,
					{ type: 'error', text: `You already have confirmed work on ${form.data.eventDate}.` },
					{ status: 409 }
				);
			}
		}

		await db
			.update(vendorBookings)
			.set({ eventDate: form.data.eventDate, updatedBy: vendor.userId })
			.where(and(eq(vendorBookings.id, booking.id), eq(vendorBookings.vendorId, vendor.id)));

		return message(form, { type: 'success', text: `Moved to ${form.data.eventDate}.` });
	}
};