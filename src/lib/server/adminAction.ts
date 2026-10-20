import { fail } from '@sveltejs/kit';
import type { z } from 'zod/v4';

/**
 * Results for plain form actions — the one-click row actions behind the kit's `ConfirmAction`.
 *
 * They answer `{ message: { type, text } }`, the same shape a superforms action puts on its form,
 * and the root layout turns `page.form.message` into a toast. Actions that take typed input use
 * superforms (`message(form, …)`) instead, and `createForm` toasts those.
 */
export type ActionMessage = { type: 'success' | 'error'; text: string };

/**
 * Parses a POSTed FormData against a zod schema. Returns either the typed data
 * or a ready-to-return `fail(400)` so actions stay one-liners:
 *
 *   const p = await parse(request, schema);
 *   if ('error' in p) return p.error;
 */
export async function parse<S extends z.ZodType>(request: Request, schema: S) {
	const raw = Object.fromEntries((await request.formData()).entries());
	const result = schema.safeParse(raw);
	if (!result.success) {
		return { error: bad(result.error.issues[0]?.message ?? 'Invalid request') };
	}
	return { data: result.data as z.infer<S> };
}

export const ok = (text: string) => ({ message: { type: 'success', text } as ActionMessage });
export const bad = (text: string, status = 400) =>
	fail(status, { message: { type: 'error', text } as ActionMessage });
