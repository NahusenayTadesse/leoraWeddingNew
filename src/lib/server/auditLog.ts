import { db } from '$lib/server/db';
import { activityLogs } from '$lib/server/db/schema';

/**
 * Admin writes leave a trail in `activity_logs`. Failure to log must never
 * fail the action the admin just performed, so errors are swallowed to stderr.
 */
export async function audit(
	event: { locals: App.Locals; request: Request; getClientAddress: () => string },
	action: string,
	entityType: string,
	entityId?: number | null,
	meta?: Record<string, unknown>
) {
	try {
		await db.insert(activityLogs).values({
			userId: event.locals.user?.id ?? null,
			action,
			entityType,
			entityId: entityId ?? null,
			ipAddress: event.getClientAddress().slice(0, 45),
			userAgent: (event.request.headers.get('user-agent') ?? '').slice(0, 255),
			meta: meta ?? null
		});
	} catch (err) {
		console.error('audit log failed:', err);
	}
}
