import { and, eq, isNull } from 'drizzle-orm';
import { superValidate, message } from 'sveltekit-superforms';
import { zod4 } from 'sveltekit-superforms/adapters';
import { db } from '$lib/server/db';
import { vendorBookings, vendorQuotes, messages, couples } from '$lib/server/db/schema';
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
	PAGE_SIZE
} from '$lib/server/vendor-bookings';
import { fromMoney } from '$lib/money';
import {
	bookingFilters,
	confirmSchema,
	cancelSchema,
	quoteSchema,
	rescheduleSchema,
	vendorBookingAddSchema,
	vendorBookingEditSchema,
	replySchema
} from '$lib/schemas/vendor-bookings';
import { idSchema as crudIdSchema } from '$lib/server/crud';
import type { Actions, PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals, url }) => {
	const vendor = await requireVendor(locals, '/vendor-dashboard/bookings');
	const filters = bookingFilters.parse(Object.fromEntries(url.searchParams));

	const [
		{ rows, total },
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
		listVendorBookings(vendor.id, filters),
		unreadCountsByCouple(vendor.id, vendor.userId),
		listVendorServices(vendor.id),
		listCouplesForBooking(),
		superValidate(zod4(vendorBookingAddSchema), { id: 'add' }),
		superValidate(zod4(vendorBookingEditSchema), { id: 'edit' }),
		superValidate(zod4(crudIdSchema), { id: 'delete' }),
		superValidate(zod4(confirmSchema), { id: 'confirm' }),
		superValidate(zod4(cancelSchema), { id: 'cancel' }),
		superValidate(zod4(quoteSchema), { id: 'quote' }),
		superValidate(zod4(rescheduleSchema), { id: 'reschedule' }),
		superValidate(zod4(replySchema), { id: 'reply' })
	]);

	return {
		vendorUserId: vendor.userId,
		bookings: rows.map((b) => ({
			...b,
			eventDate: toDateInput(b.eventDate),
			coupleNames: [b.groomName, b.brideName].filter(Boolean).join(' & ') || 'Couple',
			unread: unread.get(b.coupleId) ?? 0
		})),
		total,
		pageSize: PAGE_SIZE,
		filters,
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
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

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
			return message(form, { type: 'error', text: 'Please check the form for errors' }, { status: 400 });
		}

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
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });

		const eventDate = booking.eventDate;
		if (!form.data.allowOverlap && eventDate) {
			const conflict = await hasConfirmedConflict(vendor.id, eventDate, booking.id);
			if (conflict) {
				return message(
					form,
					{ type: 'error', text: 'You already have a confirmed booking on that date. Confirm again to allow it anyway.' },
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

		return message(form, { type: 'success', text: 'Booking confirmed' });
	},

	cancel: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(cancelSchema), { id: 'cancel' });
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });

		await db
			.update(vendorBookings)
			.set({
				status: 'cancelled',
				cancellationReason: form.data.reason,
				cancelledBy: 'vendor',
				cancelledAt: new Date(),
				updatedBy: locals.user!.id
			})
			.where(and(eq(vendorBookings.id, booking.id), eq(vendorBookings.vendorId, vendor.id)));

		return message(form, { type: 'success', text: 'Booking cancelled' });
	},

	quote: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(quoteSchema), { id: 'quote' });
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });

		await db.insert(vendorQuotes).values({
			bookingId: booking.id,
			vendorId: vendor.id,
			proposedPrice: fromMoney(form.data.proposedPrice),
			notes: form.data.notes ?? null,
			status: 'sent'
		});

		return message(form, { type: 'success', text: 'Quote sent to the couple' });
	},

	reschedule: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const form = await superValidate(request, zod4(rescheduleSchema), { id: 'reschedule' });
		if (!form.valid) return message(form, { type: 'error', text: 'Please check the form' }, { status: 400 });

		const booking = await getVendorBooking(vendor.id, form.data.id);
		if (!booking) return message(form, { type: 'error', text: 'Booking not found' }, { status: 404 });

		if (!form.data.allowOverlap && booking.status === 'confirmed') {
			const conflict = await hasConfirmedConflict(vendor.id, form.data.eventDate, booking.id);
			if (conflict) {
				return message(
					form,
					{ type: 'error', text: 'You already have a confirmed booking on that date. Reschedule again to allow it anyway.' },
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
		if (!form.valid) return message(form, { type: 'error', text: 'Write a reply first' }, { status: 400 });

		const [couple] = await db
			.select({ partner1UserId: couples.partner1UserId, partner2UserId: couples.partner2UserId })
			.from(couples)
			.where(and(eq(couples.id, form.data.coupleId), isNull(couples.deletedAt)))
			.limit(1);

		const receiverId = couple?.partner1UserId ?? couple?.partner2UserId;
		if (!receiverId) {
			return message(form, { type: 'error', text: 'This couple has no linked account to message' }, { status: 400 });
		}

		await db.insert(messages).values({
			senderId: locals.user!.id,
			receiverId,
			coupleId: form.data.coupleId,
			vendorId: vendor.id,
			body: form.data.body
		});

		return message(form, { type: 'success', text: 'Reply sent' });
	},

	markRead: async ({ request, locals }) => {
		const vendor = await requireVendor(locals);
		const data = await request.formData();
		const coupleId = Number(data.get('coupleId'));
		if (coupleId) await markThreadRead(vendor.id, vendor.userId, coupleId);
		return { success: true };
	}
};
