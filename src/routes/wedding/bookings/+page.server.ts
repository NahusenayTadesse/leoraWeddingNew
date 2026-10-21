import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message, withFiles } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { vendorBookings, messages } from '$lib/server/db/schema';
import { bookingSchema, bookingIdSchema } from '$lib/schemas/booking';
import { bookingPaySchema, bookingTransferSchema } from '$lib/schemas/payment';
import { saveUploadedFile, UploadRefused } from '@nahu/admin-kit/server/files';
import {
	PaymentRefused,
	PaymentStartError,
	startBookingChapa,
	submitBookingTransfer,
	transferAccounts
} from '$lib/server/payments';
import { LIMITS, takeToken } from '$lib/server/rateLimit';
import { ClaimRefused, openDispute, requestRefund } from '$lib/server/claims';
import { notify } from '$lib/server/notify';
import { isBlocked } from '$lib/server/availability';
import { signContract } from '$lib/server/contracts';
import { completeBooking } from '$lib/server/bookingPayments';
import { cancelBooking } from '$lib/server/cancellations';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { z } from 'zod/v4';

const refundSchema = z.object({
	paymentId: z.coerce.number().int().positive(),
	amount: z.coerce.number().positive('Enter an amount'),
	reason: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(1000)
});
const disputeSchema = z.object({
	bookingId: z.coerce.number().int().positive(),
	reason: z.string().trim().min(10, 'Tell us a little more (at least 10 characters)').max(2000)
});
import { m } from '$lib/paraglide/messages.js';
import {
	listBookings,
	listBookableVendors,
	getBookingForWedding,
	serviceBelongsToVendor,
	getVendorForMessage,
	getServiceTitle,
	respondToQuote,
	toDateInput
} from '$lib/server/bookings';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { formatETB } from '$lib/money';
import type { Actions, PageServerLoad } from './$types';

/** Formats a `YYYY-MM-DD` date input as a calendar date, without UTC-shift. */
function formatEventDate(dateStr: string) {
	const [y, m, d] = dateStr.split('-').map(Number);
	return new Date(y, m - 1, d).toLocaleDateString('en-US', {
		weekday: 'long',
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
}

export const load: PageServerLoad = async ({ parent }) => {
	const { wedding } = await parent();
	if (!wedding) throw redirect(302, '/wedding/wedding');

	const [bookings, vendorList, form, cancelForm, transferForm, accounts] = await Promise.all([
		listBookings(wedding.id),
		listBookableVendors(),
		superValidate(zod4(bookingSchema), { id: 'booking' }),
		superValidate(zod4(bookingIdSchema), { id: 'cancel' }),
		superValidate(zod4(bookingTransferSchema), { id: 'transfer' }),
		transferAccounts()
	]);

	return {
		bookings: bookings.map((b) => ({ ...b, eventDate: toDateInput(b.eventDate) })),
		vendorItems: vendorList.map((v) => ({ value: String(v.id), name: v.name })),
		weddingDate: toDateInput(wedding.weddingDate),
		form,
		cancelForm,
		transferForm,
		accounts
	};
};

export const actions: Actions = {
	request: async ({ request, locals }) => {
		const { couple, wedding } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(bookingSchema), { id: 'booking' });
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

		if (form.data.serviceId) {
			const ok = await serviceBelongsToVendor(form.data.serviceId, form.data.vendorId);
			if (!ok)
				return message(form, { type: 'error', text: m.srv_service_mismatch() }, { status: 400 });
		}

		if (await isBlocked(form.data.vendorId, form.data.eventDate)) {
			return message(form, { type: 'error', text: m.avail_date_blocked() }, { status: 409 });
		}

		await db.insert(vendorBookings).values({
			weddingPlanId: wedding.id,
			vendorId: form.data.vendorId,
			serviceId: form.data.serviceId || null,
			eventDate: form.data.eventDate,
			agreedPrice: form.data.agreedPrice.toFixed(2),
			status: 'pending',
			createdBy: locals.user!.id,
			updatedBy: locals.user!.id
		});

		// Drops a message in the shared thread so both sides have a written
		// record of what was requested — visible in both inboxes since threads
		// are keyed on (coupleId, vendorId), not on sender/receiver.
		const vendor = await getVendorForMessage(form.data.vendorId);
		if (vendor?.userId) {
			const serviceTitle = form.data.serviceId ? await getServiceTitle(form.data.serviceId) : null;
			await db.insert(messages).values({
				senderId: locals.user!.id,
				receiverId: vendor.userId,
				coupleId: couple.id,
				vendorId: form.data.vendorId,
				body: `Booking requested: ${serviceTitle ?? 'General inquiry'} for ${formatEventDate(form.data.eventDate)}. Proposed price: ${formatETB(form.data.agreedPrice)}.`
			});
		}

		await notify(vendor?.userId, {
			type: 'booking_requested',
			title: 'New booking request',
			body: `A couple asked to book you for ${formatEventDate(form.data.eventDate)}.`,
			link: '/vendor-dashboard/bookings'
		});

		return message(form, {
			type: 'success',
			text: m.srv_booking_sent()
		});
	},

	cancel: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(bookingIdSchema), { id: 'cancel' });
		if (!form.valid)
			return message(form, { type: 'error', text: m.srv_check_form() }, { status: 400 });

		const booking = await getBookingForWedding(form.data.id, wedding.id);
		if (!booking) return message(form, { type: 'error', text: m.srv_not_yours() }, { status: 403 });

		const outcome = await cancelBooking({
			bookingId: booking.id,
			by: 'couple',
			userId: locals.user!.id,
			weddingPlanId: wedding.id
		});
		if (!outcome.ok) {
			if (outcome.reason === 'already_cancelled')
				return message(form, { type: 'success', text: m.srv_already_cancelled() });
			if (outcome.reason === 'completed')
				return message(form, { type: 'error', text: m.srv_booking_completed() }, { status: 409 });
			return message(form, { type: 'error', text: m.srv_not_yours() }, { status: 403 });
		}

		const vendor = await getVendorForMessage(booking.vendorId);
		await notify(vendor?.userId, {
			type: 'booking_cancelled',
			title: 'Booking cancelled by couple',
			body:
				outcome.refundTotal > 0
					? `A couple cancelled their booking with you. Under your cancellation policy they get ${outcome.refundPercent}% of what they paid back (${formatETB(outcome.refundTotal)}); the rest is yours.`
					: 'A couple cancelled their booking with you.',
			link: '/vendor-dashboard/bookings'
		});

		return message(form, {
			type: 'success',
			text:
				outcome.refundTotal > 0
					? m.srv_booking_cancelled_refund({ amount: formatETB(outcome.refundTotal) })
					: m.srv_booking_cancelled()
		});
	},

	/**
	 * Pay online: a plain form post (no JavaScript needed) that answers with a 303 to Chapa's
	 * checkout. Amount and booking are re-checked against the database in `startBookingChapa`.
	 */
	payChapa: async ({ request, locals, url, getClientAddress }) => {
		const { couple, wedding } = await requireCoupleAndWedding(locals);
		if (!takeToken(`pay:${getClientAddress()}`, LIMITS.payment)) {
			return fail(429, { message: { type: 'error', text: m.auth_too_many() } });
		}

		const form = await superValidate(request, zod4(bookingPaySchema));
		if (!form.valid) {
			return fail(400, { message: { type: 'error', text: m.auth_form_invalid() } });
		}

		const booking = await getBookingForWedding(form.data.bookingId, wedding.id);
		if (!booking) return fail(403, { message: { type: 'error', text: m.srv_not_yours() } });

		let checkoutUrl: string;
		try {
			checkoutUrl = await startBookingChapa(
				{
					booking,
					weddingPlanId: wedding.id,
					payer: {
						id: locals.user!.id,
						name: locals.user!.name,
						email: locals.user!.email,
						phone: couple.phone
					},
					amount: form.data.amount,
					paymentType: form.data.paymentType
				},
				url.origin
			);
		} catch (err) {
			if (err instanceof PaymentRefused) {
				return fail(409, { message: { type: 'error', text: err.message } });
			}
			if (err instanceof PaymentStartError) {
				console.error('Chapa start failed:', err.cause);
				return fail(502, { message: { type: 'error', text: m.pay_unavailable() } });
			}
			throw err;
		}
		redirect(303, checkoutUrl);
	},

	/** Paid by bank transfer: the receipt is saved and waits for staff to match it. */
	payTransfer: async ({ request, locals, getClientAddress }) => {
		const { couple, wedding } = await requireCoupleAndWedding(locals);
		const form = await superValidate(request, zod4(bookingTransferSchema), { id: 'transfer' });
		if (!takeToken(`pay:${getClientAddress()}`, LIMITS.payment)) {
			return message(withFiles(form), { type: 'error', text: m.auth_too_many() }, { status: 429 });
		}
		if (!form.valid) return fail(400, withFiles({ form }));

		const booking = await getBookingForWedding(form.data.bookingId, wedding.id);
		if (!booking) {
			return message(withFiles(form), { type: 'error', text: m.srv_not_yours() }, { status: 403 });
		}

		try {
			const receiptFile = await saveUploadedFile(form.data.receipt);
			await submitBookingTransfer({
				booking,
				weddingPlanId: wedding.id,
				payer: {
					id: locals.user!.id,
					name: locals.user!.name,
					email: locals.user!.email,
					phone: couple.phone
				},
				amount: form.data.amount,
				paymentType: form.data.paymentType,
				bankAccountId: form.data.bankAccountId,
				reference: form.data.reference || undefined,
				receiptFile
			});
		} catch (err) {
			if (err instanceof PaymentRefused || err instanceof UploadRefused) {
				return message(withFiles(form), { type: 'error', text: err.message }, { status: 409 });
			}
			throw err;
		}

		return message(withFiles(form), { type: 'success', text: m.pay_transfer_received() });
	},

	/** Ask for (part of) a confirmed payment back; staff decide on admin Payments → Refunds. */
	requestRefund: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);
		const p = await parse(request, refundSchema);
		if ('error' in p) return p.error;
		try {
			await requestRefund({ ...p.data, weddingPlanId: wedding.id, userId: locals.user!.id });
		} catch (err) {
			if (err instanceof ClaimRefused) return bad(err.message);
			throw err;
		}
		return ok(m.srv_refund_requested());
	},

	/** Report a problem with a booking for staff to look into. */
	openDispute: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);
		const p = await parse(request, disputeSchema);
		if ('error' in p) return p.error;
		const booking = await getBookingForWedding(p.data.bookingId, wedding.id);
		if (!booking) return bad(m.srv_not_yours(), 403);
		try {
			await openDispute({ bookingId: booking.id, raisedBy: 'couple', reason: p.data.reason });
		} catch (err) {
			if (err instanceof ClaimRefused) return bad(err.message);
			throw err;
		}
		return ok(m.srv_dispute_thanks());
	},

	/** The couple confirms the vendor delivered; their held payments are released to the vendor. */
	markDelivered: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);
		const p = await parse(request, z.object({ bookingId: z.coerce.number().int().positive() }));
		if ('error' in p) return p.error;
		const outcome = await completeBooking(p.data.bookingId, wedding.id, locals.user!.id);
		if (!outcome.ok) {
			if (outcome.reason === 'not_found') return bad(m.srv_not_yours(), 403);
			if (outcome.reason === 'too_early') return bad(m.srv_delivered_too_early());
			return bad(m.srv_delivered_not_confirmed());
		}
		return ok(outcome.heldByDispute ? m.srv_delivered_dispute() : m.srv_delivered_thanks());
	},

	/** Signs the booking's contract with the typed full name. */
	signContract: async ({ request, locals, getClientAddress }) => {
		const { wedding } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({
				bookingId: z.coerce.number().int().positive(),
				name: z.string().trim().min(3, 'Type your full name to sign').max(150)
			})
		);
		if ('error' in p) return p.error;
		const booking = await getBookingForWedding(p.data.bookingId, wedding.id);
		if (!booking) return bad(m.srv_not_yours(), 403);
		const signed = await signContract({
			bookingId: booking.id,
			side: 'couple',
			name: p.data.name,
			ip: getClientAddress()
		});
		if (!signed) return bad(m.srv_no_contract());
		const vendor = await getVendorForMessage(booking.vendorId);
		await notify(vendor?.userId, {
			type: 'contract_signed',
			title: 'Contract signed',
			body: `The couple signed the contract for booking #${booking.id}.`,
			link: '/vendor-dashboard/bookings'
		});
		return ok(m.srv_contract_signed());
	},

	/** Accept or decline a vendor's quote. Accepting sets the booking's agreed price. */
	respondQuote: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);
		const p = await parse(
			request,
			z.object({ quoteId: z.coerce.number().int().positive(), accept: z.enum(['yes', 'no']) })
		);
		if ('error' in p) return p.error;
		const accept = p.data.accept === 'yes';
		const result = await respondToQuote(p.data.quoteId, wedding.id, accept);
		if (!result) return bad(m.srv_quote_closed());
		await notify(result.vendorUserId, {
			type: accept ? 'quote_accepted' : 'quote_declined',
			title: accept ? 'Quote accepted' : 'Quote declined',
			body: accept
				? `The couple accepted your quote of ETB ${result.price} for booking #${result.bookingId}.`
				: `The couple declined your quote for booking #${result.bookingId}.`,
			link: '/vendor-dashboard/bookings'
		});
		return ok(accept ? 'Quote accepted — the agreed price is updated.' : 'Quote declined.');
	}
};
