import { z } from 'zod/v4';
import { requireCoupleAndWedding } from '$lib/server/weddings';
import { getCoupleByUserId } from '$lib/server/couples';
import {
	addEvent,
	addWeddingWeek,
	EVENT_TYPES,
	listEvents,
	removeEvent,
	updateEvent,
	type WeddingWeekKey
} from '$lib/server/planner';
import { parse, ok, bad } from '@nahu/admin-kit/server/actionResults';
import { isoDay } from '$lib/server/availability';
import type { Actions, PageServerLoad } from './$types';
import { m } from '$lib/paraglide/messages.js';

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

const WEEK_LABELS: Record<WeddingWeekKey, () => { name: string; note: string }> = {
	shimgelegna: () => ({ name: m.tpl_shimgelegna(), note: m.tpl_shimgelegna_note() }),
	engagement: () => ({ name: m.tpl_engagement(), note: m.tpl_engagement_note() }),
	telosh: () => ({ name: m.tpl_telosh(), note: m.tpl_telosh_note() }),
	ceremony: () => ({ name: m.tpl_ceremony(), note: m.tpl_ceremony_note() }),
	melse: () => ({ name: m.tpl_melse(), note: m.tpl_melse_note() }),
	kilikil: () => ({ name: m.tpl_kilikil(), note: m.tpl_kilikil_note() })
};

export const actions = {
	/** One click: the traditional wedding week, dated from the wedding day. */
	weddingWeek: async ({ locals }) => {
		const { couple, wedding } = await requireCoupleAndWedding(locals);
		const date = wedding.weddingDate
			? wedding.weddingDate instanceof Date
				? isoDay(wedding.weddingDate)
				: String(wedding.weddingDate).slice(0, 10)
			: null;
		if (!date) return bad(m.srv_tpl_no_date());
		const added = await addWeddingWeek(couple.id, date, locals.user!.id, (k) => WEEK_LABELS[k]());
		return ok(added ? m.srv_tpl_added({ count: added }) : m.srv_tpl_none());
	},

	add: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, eventSchema);
		if ('error' in p) return p.error;
		await addEvent(couple.id, p.data, locals.user!.id);
		return ok(m.srv_event_added());
	},
	edit: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, eventSchema.extend(idSchema.shape));
		if ('error' in p) return p.error;
		const { id, ...input } = p.data;
		if (!(await updateEvent(couple.id, id, input, locals.user!.id)))
			return bad(m.srv_event_not_found(), 404);
		return ok(m.srv_event_updated());
	},
	remove: async ({ request, locals }) => {
		const { couple } = await requireCoupleAndWedding(locals);
		const p = await parse(request, idSchema);
		if ('error' in p) return p.error;
		if (!(await removeEvent(couple.id, p.data.id, locals.user!.id)))
			return bad(m.srv_event_not_found(), 404);
		return ok(m.srv_event_deleted());
	}
} satisfies Actions;
