import { fail } from '@sveltejs/kit';
import type { z } from 'zod/v4';

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
		return { error: fail(400, { message: result.error.issues[0]?.message ?? 'Invalid request' }) };
	}
	return { data: result.data as z.infer<S> };
}

export const ok = (message: string) => ({ success: true, message });
export const bad = (message: string, status = 400) => fail(status, { message });
