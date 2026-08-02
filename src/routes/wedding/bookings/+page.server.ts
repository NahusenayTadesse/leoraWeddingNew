import { fail, redirect } from '@sveltejs/kit';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { vendorBookings, bookingPayments } from '$lib/server/db/schema';
import { bookingSchema, bookingIdSchema, paymentSchema } from '$lib/schemas/booking';
import {
	listBookings,
	listBookableVendors,
	getBookingForWedding,
	serviceBelongsToVendor,
	toDateInput
} from '$lib/server/bookings';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { and, eq, isNull } from 'drizzle-orm';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ parent }) => {
	const { wedding } = await parent();
	if (!wedding) throw redirect(302, '/wedding/wedding');

	const [bookings, vendorList, form, cancelForm, paymentForm] = await Promise.all([
		listBookings(wedding.id),
		listBookableVendors(),
		superValidate(zod4(bookingSchema), { id: 'booking' }),
		superValidate(zod4(bookingIdSchema), { id: 'cancel' }),
		superValidate(zod4(paymentSchema), { id: 'payment' })
	]);

	return {
		bookings: bookings.map((b) => ({ ...b, eventDate: toDateInput(b.eventDate) })),
		vendorItems: vendorList.map((v) => ({ value: String(v.id), name: v.name })),
		weddingDate: toDateInput(wedding.weddingDate),
		form,
		cancelForm,
		paymentForm
	};
};

export const actions: Actions = {
	request: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(bookingSchema), { id: 'booking' });
		if (!form.valid) return fail(400, { form });

		if (form.data.serviceId) {
			const ok = await serviceBelongsToVendor(form.data.serviceId, form.data.vendorId);
			if (!ok) return message(form, "That service doesn't belong to the chosen vendor.", { status: 400 });
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

		return message(form, 'Booking request sent. The vendor will confirm shortly.');
	},

	cancel: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(bookingIdSchema), { id: 'cancel' });
		if (!form.valid) return fail(400, { form });

		const booking = await getBookingForWedding(form.data.id, wedding.id);
		if (!booking) return fail(403, { form });

		if (booking.status === 'cancelled') {
			return message(form, 'That booking is already cancelled.');
		}

		await db
			.update(vendorBookings)
			.set({ status: 'cancelled', updatedBy: locals.user!.id })
			.where(
				and(
					eq(vendorBookings.id, form.data.id),
					eq(vendorBookings.weddingPlanId, wedding.id),
					isNull(vendorBookings.deletedAt)
				)
			);

		return message(form, 'Booking cancelled.');
	},

	pay: async ({ request, locals }) => {
		const { wedding } = await requireCoupleAndWedding(locals);

		const form = await superValidate(request, zod4(paymentSchema), { id: 'payment' });
		if (!form.valid) return fail(400, { form });

		const booking = await getBookingForWedding(form.data.bookingId, wedding.id);
		if (!booking) return fail(403, { form });

		if (booking.status === 'cancelled') {
			return message(form, "You can't record a payment on a cancelled booking.", { status: 400 });
		}

		await db.insert(bookingPayments).values({
			weddingPlanId: wedding.id,
			bookingId: booking.id,
			payerId: locals.user!.id,
			payeeVendorId: booking.vendorId,
			amount: form.data.amount.toFixed(2),
			currency: 'ETB',
			paymentMethod: form.data.paymentMethod,
			paymentType: form.data.paymentType,
			status: 'pending',
			transactionReference: form.data.transactionReference || null
		});

		return message(form, 'Payment logged. It shows as pending until the vendor confirms it.');
	}
};
