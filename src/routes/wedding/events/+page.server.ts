import { z } from 'zod/v4';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { getCoupleByUserId } from '$lib/server/couples';
import { addEvent, EVENT_TYPES, listEvents, removeEvent, updateEvent } from '$lib/server/planner';
import { parse, ok, bad } from '$lib/server/adminAction';
import type { Actions, PageServerLoad } from './$types';

const optional = (max: number) =>
	z
		.string()
		.trim()
		.max(max)
		.transform((v) => v || null);

const eventSchema = z.object({
	eventType: z.enum(EVENT_TYPES),
	eventName: z.string().trim().min(2, 'Give the event a name').max(150),
	eventDate: z
		.string()
		.trim()
		// The form's local time is Addis Ababa time (UTC+3, no DST), whatever the server's zone.
		.transform((v) => (v ? new Date(`${v.length === 16 ? `${v}:00` : v}+03:00`) : null))
		.refine((d) => d === null || !Number.isNaN(d.getTime()), 'Invalid date'),
	venueName: optional(150),
	venueAddress: optional(255),
	city: optional(100),
	notes: optional(2000)
});
const idSchema = z.object({ id: z.coerce.number().int().positive() });

export const load: PageServerLoad = async ({ locals }) => {
	const couple = await getCoupleByUserId(locals.user!.id);
	const events = couple ? await listEvents(couple.id) : [];
	return { events };
};

export const actions = {
	add: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, eventSchema);
		if ('error' in p) return p.error;
		await addEvent(couple.id, p.data, locals.user!.id);
		return ok('Event added');
	},
	edit: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, eventSchema.extend(idSchema.shape));
		if ('error' in p) return p.error;
		const { id, ...input } = p.data;
		if (!(await updateEvent(couple.id, id, input, locals.user!.id))) return bad('Event not found', 404);
		return ok('Event updated');
	},
	remove: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, idSchema);
		if ('error' in p) return p.error;
		if (!(await removeEvent(couple.id, p.data.id, locals.user!.id))) return bad('Event not found', 404);
		return ok('Event deleted');
	}
} satisfies Actions;
