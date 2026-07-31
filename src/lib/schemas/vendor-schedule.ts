import { z } from 'zod';

const ISO = /^\d{4}-\d{2}-\d{2}$/;

export const isoDate = z.string().trim().regex(ISO, 'Use a valid date');

/** DatePicker writes into a hidden input, so this arrives as "d1,d2,d3" or a JSON array. */
function toDateArray(v: unknown): string[] {
	if (v == null) return [];
	let raw: unknown[];
	if (Array.isArray(v)) raw = v;
	else if (typeof v === 'string') {
		const t = v.trim();
		if (!t) raw = [];
		else if (t.startsWith('[')) {
			try {
				const p = JSON.parse(t);
				raw = Array.isArray(p) ? p : [];
			} catch {
				raw = [];
			}
		} else raw = t.split(/[,;\s]+/);
	} else raw = [v];

	const out = raw.map((d) => String(d).trim().slice(0, 10)).filter(Boolean);
	return [...new Set(out)].sort();
}

export const scheduleStatus = z.enum(['blocked', 'available', 'clear']);
export type ScheduleStatus = z.infer<typeof scheduleStatus>;

export const bulkDatesSchema = z.object({
	dates: z.preprocess(
		toDateArray,
		z
			.array(isoDate)
			.min(1, 'Pick at least one date')
			.max(120, 'You can only set 120 dates at a time')
	),
	status: scheduleStatus
});

const dayMs = 86_400_000;
const span = (a: string, b: string) => (Date.parse(b) - Date.parse(a)) / dayMs;

export const rangeSchema = z
	.object({
		from: isoDate,
		to: isoDate,
		status: scheduleStatus,
		weekendsOnly: z.boolean().default(false)
	})
	.refine((d) => d.to >= d.from, {
		message: 'End date must be on or after the start date',
		path: ['to']
	})
	.refine((d) => span(d.from, d.to) <= 365, {
		message: 'Range cannot be longer than a year',
		path: ['to']
	});

export const cycleSchema = z.object({ date: isoDate });

export const removeSchema = z.object({
	id: z.coerce.number().int().positive()
});

export type BulkDatesInput = z.infer<typeof bulkDatesSchema>;
export type RangeInput = z.infer<typeof rangeSchema>;