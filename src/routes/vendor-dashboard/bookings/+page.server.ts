import { and, eq, isNull } from 'drizzle-orm';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { vendorBookings, vendorQuotes, couples } from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import { listVendorServices } from '$lib/server/bookings';
import {
	listVendorBookings,
	unreadCountsByCouple,
	getVendorBooking,
	hasConfirmedConflict,
	listCouplesForBooking,
	markThreadRead,
	toDateInput,
	BOOKING_FILTERS,
	BOOKING_SORTS
} from '$lib/server/vendor-bookings';
import { fromMoney } from '$lib/money';
import { notify } from '$lib/server/notify';
import { isoDay } from '$lib/server/availability';
import { cancelBooking } from '$lib/server/cancellations';
import { checkBookingAllowance } from '$lib/server/vendorPlan';
import { sendMessage } from '$lib/server/messages';
import { ClaimRefused, openDispute } from '$lib/server/claims';
import { attachContract, contractsForBookings, signContract } from '$lib/server/contracts';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { z as zv4 } from 'zod/v4';
import {
	bookingTab,
	confirmSchema,
	cancelSchema,
	quoteSchema,
	rescheduleSchema,
	vendorBookingAddSchema,
	vendorBookingEditSchema,
	replySchema
} from '$lib/schemas/vendor-bookings';
import { idSchema as crudIdSchema } from '@nahu/admin-kit/server/crud';
import { currentQuery, pagination, parseTableQuery } from '@nahu/admin-kit/server/queryFilters';
import type { Actions, PageServerLoad } from './$types';

const COMPLETED_LOCKED =
	'This booking is completed and can no longer be changed. Contact support if something is wrong.';

/**
 * Held money is released a few days after the event date, so a vendor must not move an existing
 * booking into the past: that would release a couple's payment for a service not yet given.
 */
const PAST_DATE = 'Pick today or a later date.';

/** Why the vendor's plan doesn't allow another confirmed booking, or null when it does. */
async function planRefusal(vendorId: number) {
	const allowance = await checkBookingAllowance(vendorId);
	if (allowance.ok) return null;
	return allowance.reason === 'no_plan'
		? 'Choose a plan to confirm bookings.'
		: `Your plan includes ${allowance.limit} bookings and you have used them. Upgrade to confirm more.`;
}
const movesIntoPast = (before: string | null | undefined, after: string | null | undefined) =>
	!!after && after !== (before ?? null) && after < isoDay(new Date());

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/bookings');
	const tab = bookingTab.catch('upcoming').parse(url.searchParams.get('tab') ?? undefined);
	const query = parseTableQuery(url, BOOKING_FILTERS, 20, Object.keys(BOOKING_SORTS));

	const [
		{ rows, total, facets },
		unread,
		services,
		couplesForBooking,
		addForm,
		editForm,
		deleteForm,
		confirmForm,
		cancelForm,
		quoteForm,
		rescheduleForm,
		replyForm
	] = await Promise.all([
		listVendorBookings(vendor.id, tab, query),
		unreadCountsByCouple(vendor.id, vendor.userId),
		listVendorServices(vendor.id),
		listCouplesForBooking(vendor.id),
		superValidate(zod4(vendorBookingAddSchema), { id: 'add' }),
		superValidate(zod4(vendorBookingEditSchema), { id: 'edit' }),
		superValidate(zod4(crudIdSchema), { id: 'delete' }),
		superValidate(zod4(confirmSchema), { id: 'confirm' }),
		superValidate(zod4(cancelSchema), { id: 'cancel' }),
		superValidate(zod4(quoteSchema), { id: 'quote' }),
		superValidate(zod4(rescheduleSchema), { id: 'reschedule' }),
		superValidate(zod4(replySchema), { id: 'reply' })
	]);

	const contractByBooking = await contractsForBookings(rows.map((b) => b.id));

	return {
		vendorUserId: vendor.userId,
		bookings: rows.map((b) => ({
			...b,
			eventDate: toDateInput(b.eventDate),
			unread: unread.get(b.coupleId) ?? 0,
			contract: contractByBooking.get(b.id) ?? null
		})),
		tab,
		server: { pagination: pagination(query, total), facets, filters: currentQuery(query) },
		services: services.map((s) => ({ value: s.id, name: s.title })),
		couples: couplesForBooking,
		addForm,
		editForm,
		deleteForm,
		confirmForm,
		cancelForm,
		quoteForm,
		rescheduleForm,
		replyForm
	};
};

export const actions: Actions = {
	add: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(vendorBookingAddSchema), { id: 'add' });
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const allowed = await listCouplesForBooking(vendor.id);
		if (!allowed.some((c) => c.value === form.data.weddingPlanId)) {
			return message(
				form,
				{ type: 'error', text: 'You can only add bookings for couples who have contacted you.' },
				{ status: 403 }
			);
		}

		const overLimit = form.data.status === 'confirmed' ? await planRefusal(vendor.id) : null;
		if (overLimit) return message(form, { type: 'error', text: overLimit }, { status: 402 });

		try {
			await db.insert(vendorBookings).values({
				weddingPlanId: form.data.weddingPlanId,
				vendorId: vendor.id,
				serviceId: form.data.serviceId ?? null,
				status: form.data.status,
				agreedPrice: form.data.agreedPrice != null ? fromMoney(form.data.agreedPrice) : null,
				eventDate: form.data.eventDate ?? null,
				createdBy: locals.user!.id,
				updatedBy: locals.user!.id
			});
			return message(form, { type: 'success', text: 'Booking added' });
		} catch (err) {
			console.error('Failed to add booking:', err);
			return message(form, { type: 'error', text: 'Could not add booking' }, { status: 500 });
		}
	},

	edit: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(vendorBookingEditSchema), { id: 'edit' });
		if (!form.valid) {
			return message(
				form,
				{ type: 'error', text: 'Please check the form for errors' },
				{ status: 400 }
			);
		}

		const before = await getVendorBooking(vendor.id, form.data.id);
		if (!before)
			return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });
		if (before.status === 'completed')
			return message(form, { type: 'error', text: COMPLETED_LOCKED }, { status: 409 });
		if (movesIntoPast(before.eventDate, form.data.eventDate))
			return message(form, { type: 'error', text: PAST_DATE }, { status: 400 });
		const overLimit =
			form.data.status === 'confirmed' && before.status !== 'confirmed'
				? await planRefusal(vendor.id)
				: null;
		if (overLimit) return message(form, { type: 'error', text: overLimit }, { status: 402 });

		try {
			const [result] = await db
				.update(vendorBookings)
				.set({
					serviceId: form.data.serviceId ?? null,
					status: form.data.status,
					agreedPrice: form.data.agreedPrice != null ? fromMoney(form.data.agreedPrice) : null,
					eventDate: form.data.eventDate ?? null,
					updatedBy: locals.user!.id
				})
				.where(and(eq(vendorBookings.id, form.data.id), eq(vendorBookings.vendorId, vendor.id)));
			if (result.affectedRows === 0) {
				return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });
			}
			// The couple pays against the agreed price, so they hear about any change to it.
			const newPrice = form.data.agreedPrice != null ? fromMoney(form.data.agreedPrice) : null;
			const priceChanged = (before.agreedPrice ?? null) !== newPrice;
			const dateChanged = (before.eventDate ?? null) !== (form.data.eventDate ?? null);
			if (priceChanged || dateChanged) {
				await notify(before.partner1UserId, {
					type: 'booking_updated',
					title: 'Booking details changed',
					body: `${vendor.businessName ?? 'Your vendor'} updated your booking${priceChanged ? ` — agreed price is now ETB ${newPrice ?? '0.00'}` : ''}${dateChanged ? ` — date is now ${form.data.eventDate ?? 'unset'}` : ''}.`,
					link: '/wedding/bookings'
				});
			}
			return message(form, { type: 'success', text: 'Booking updated' });
		} catch (err) {
			console.error('Failed to update booking:', err);
			return message(form, { type: 'error', text: 'Could not update booking' }, { status: 500 });
		}
	},

	delete: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(crudIdSchema), { id: 'delete' });
		if (!form.valid) {
			return message(form, { type: 'error', text: 'Invalid request' }, { status: 400 });
		}

		const target = await getVendorBooking(vendor.id, form.data.id);
		if (target && (target.status === 'confirmed' || target.status === 'completed'))
			return message(
				form,
				{ type: 'error', text: 'Confirmed bookings can be cancelled, not deleted.' },
				{ status: 409 }
			);

		try {
			await db
				.update(vendorBookings)
				.set({ deletedAt: new Date(), deletedBy: locals.user!.id })
				.where(and(eq(vendorBookings.id, form.data.id), eq(vendorBookings.vendorId, vendor.id)));
			return message(form, { type: 'success', text: 'Booking removed' });
		} catch (err) {
			console.error('Failed to delete booking:', err);
			return message(form, { type: 'error', text: 'Could not remove booking' }, { status: 500 });
		}
	},

	confirm: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(confirmSchema), { id: 'confirm' });
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking)
			return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });
		if (booking.status === 'completed')
			return message(form, { type: 'error', text: COMPLETED_LOCKED }, { status: 409 });

		const overLimit = booking.status === 'confirmed' ? null : await planRefusal(vendor.id);
		if (overLimit) return message(form, { type: 'error', text: overLimit }, { status: 402 });

		const eventDate = booking.eventDate;
		if (!form.data.allowOverlap && eventDate) {
			const conflict = await hasConfirmedConflict(vendor.id, eventDate, booking.id);
			if (conflict) {
				return message(
					form,
					{
						type: 'error',
						text: 'You already have a confirmed booking on that date. Confirm again to allow it anyway.'
					},
					{ status: 409 }
				);
			}
		}

		await db
			.update(vendorBookings)
			.set({
				status: 'confirmed',
				...(form.data.agreedPrice != null ? { agreedPrice: fromMoney(form.data.agreedPrice) } : {}),
				updatedBy: locals.user!.id
			})
			.where(and(eq(vendorBookings.id, booking.id), eq(vendorBookings.vendorId, vendor.id)));

		await notify(booking.partner1UserId, {
			type: 'booking_confirmed',
			title: 'Booking confirmed',
			body: `${vendor.businessName ?? 'Your vendor'} confirmed your booking. You can now pay from your bookings page.`,
			link: '/wedding/bookings'
		});
		return message(form, { type: 'success', text: 'Booking confirmed' });
	},

	cancel: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(cancelSchema), { id: 'cancel' });
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking)
			return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });

		// The couple gets everything they paid back when the vendor cancels.
		const outcome = await cancelBooking({
			bookingId: booking.id,
			by: 'vendor',
			userId: locals.user!.id,
			reason: form.data.reason,
			vendorId: vendor.id
		});
		if (!outcome.ok) {
			if (outcome.reason === 'completed')
				return message(form, { type: 'error', text: COMPLETED_LOCKED }, { status: 409 });
			if (outcome.reason === 'already_cancelled')
				return message(form, { type: 'success', text: 'Booking already cancelled' });
			return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });
		}

		await notify(booking.partner1UserId, {
			type: 'booking_cancelled',
			title: 'Booking cancelled by vendor',
			body: `${vendor.businessName ?? 'Your vendor'} cancelled your booking. Reason: ${form.data.reason}`,
			link: '/wedding/bookings'
		});
		return message(form, { type: 'success', text: 'Booking cancelled' });
	},

	quote: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(quoteSchema), { id: 'quote' });
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking)
			return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });

		await db.insert(vendorQuotes).values({
			bookingId: booking.id,
			vendorId: vendor.id,
			proposedPrice: fromMoney(form.data.proposedPrice),
			notes: form.data.notes ?? null,
			status: 'sent'
		});

		await notify(booking.partner1UserId, {
			type: 'quote_received',
			title: 'New quote',
			body: `${vendor.businessName ?? 'Your vendor'} sent you a quote of ETB ${fromMoney(form.data.proposedPrice)}.`,
			link: '/wedding/bookings'
		});
		return message(form, { type: 'success', text: 'Quote sent to the couple' });
	},

	reschedule: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(rescheduleSchema), { id: 'reschedule' });
		if (!form.valid)
			return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking)
			return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });
		if (booking.status === 'completed')
			return message(form, { type: 'error', text: COMPLETED_LOCKED }, { status: 409 });
		if (movesIntoPast(booking.eventDate, form.data.eventDate))
			return message(form, { type: 'error', text: PAST_DATE }, { status: 400 });

		if (!form.data.allowOverlap && booking.status === 'confirmed') {
			const conflict = await hasConfirmedConflict(vendor.id, form.data.eventDate, booking.id);
			if (conflict) {
				return message(
					form,
					{
						type: 'error',
						text: 'You already have a confirmed booking on that date. Reschedule again to allow it anyway.'
					},
					{ status: 409 }
				);
			}
		}

		await db
			.update(vendorBookings)
			.set({ eventDate: form.data.eventDate, updatedBy: locals.user!.id })
			.where(and(eq(vendorBookings.id, booking.id), eq(vendorBookings.vendorId, vendor.id)));

		return message(form, { type: 'success', text: 'Booking rescheduled' });
	},

	reply: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(replySchema), { id: 'reply' });
		if (!form.valid)
			return message(form, { type: 'error', text: 'Write a reply first' }, { status: 400 });

		const [couple] = await db
			.select({ partner1UserId: couples.partner1UserId, partner2UserId: couples.partner2UserId })
			.from(couples)
			.where(and(eq(couples.id, form.data.coupleId), isNull(couples.deletedAt)))
			.limit(1);

		const receiverId = couple?.partner1UserId ?? couple?.partner2UserId;
		if (!receiverId) {
			return message(
				form,
				{ type: 'error', text: 'This couple has no linked account to message' },
				{ status: 400 }
			);
		}

		const sent = await sendMessage({
			senderId: locals.user!.id,
			receiverId,
			coupleId: form.data.coupleId,
			vendorId: vendor.id,
			body: form.data.body,
			from: 'vendor'
		});
		if (!sent.ok)
			return message(
				form,
				{ type: 'error', text: 'You can only message couples who contacted you' },
				{ status: 403 }
			);

		return message(form, {
			type: 'success',
			text: sent.masked
				? 'Reply sent. Contact details are hidden until the booking is confirmed.'
				: 'Reply sent'
		});
	},

	markRead: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const data = await request.formData();
		const coupleId = Number(data.get('coupleId'));
		if (coupleId) await markThreadRead(vendor.id, vendor.userId, coupleId);
		return { success: true };
	},

	/** Report a problem with a booking for staff to look into. */
	dispute: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const p = await parse(
			request,
			zv4.object({
				id: zv4.coerce.number().int().positive(),
				reason: zv4
					.string()
					.trim()
					.min(10, 'Tell us a little more (at least 10 characters)')
					.max(2000)
			})
		);
		if ('error' in p) return p.error;
		const booking = await getVendorBooking(vendor.id, p.data.id);
		if (!booking) return bad('Booking not found', 404);
		try {
			await openDispute({ bookingId: booking.id, raisedBy: 'vendor', reason: p.data.reason });
		} catch (err) {
			if (err instanceof ClaimRefused) return bad(err.message);
			throw err;
		}
		return ok('Thanks — our team will look into it and get back to you.');
	},

	/** Attaches (or replaces) the booking's contract PDF; both signatures start over. */
	attachContract: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const data = await request.formData();
		const id = Number(data.get('id'));
		const title =
			String(data.get('title') ?? '')
				.trim()
				.slice(0, 150) || 'Service agreement';
		const file = data.get('document');
		if (!(file instanceof File) || file.size === 0) return bad('Attach the contract as a PDF.');
		if (file.type !== 'application/pdf') return bad('Contracts must be PDF files.');

		const booking = await getVendorBooking(vendor.id, id);
		if (!booking) return bad('Booking not found', 404);

		let documentUrl: string;
		try {
			documentUrl = await saveUploadedFile(file);
		} catch (err) {
			if (err instanceof UploadRefused) return bad(err.message);
			throw err;
		}
		await attachContract({ bookingId: booking.id, documentUrl, title, userId: locals.user!.id });
		await notify(booking.partner1UserId, {
			type: 'contract_ready',
			title: 'Contract ready to sign',
			body: `${vendor.businessName ?? 'Your vendor'} shared a contract ("${title}") for you to review and sign.`,
			link: '/wedding/bookings'
		});
		return ok('Contract shared with the couple.');
	},

	signContract: async ({ request, locals, getClientAddress }) => {
		const vendor = await requireVendor(locals);
		const p = await parse(
			request,
			zv4.object({
				id: zv4.coerce.number().int().positive(),
				name: zv4.string().trim().min(3, 'Type your full name to sign').max(150)
			})
		);
		if ('error' in p) return p.error;
		const booking = await getVendorBooking(vendor.id, p.data.id);
		if (!booking) return bad('Booking not found', 404);
		const signed = await signContract({
			bookingId: booking.id,
			side: 'vendor',
			name: p.data.name,
			ip: getClientAddress()
		});
		if (!signed) return bad('Attach a contract first.');
		return ok('Contract signed.');
	}
};
