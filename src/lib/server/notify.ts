import { eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { notifications, user } from '$lib/server/db/schema';
import { appOrigin } from '$lib/server/auth';
import { layout, notifyByEmail } from '$lib/server/email';

export type Notice = {
	/** Machine-readable kind, e.g. `payment_confirmed`. */
	type: string;
	title: string;
	body: string;
	/** In-app path the notification opens, e.g. `/wedding/bookings`. */
	link?: string;
	/** Also email it (default true). */
	email?: boolean;
};

/**
 * Tells one user something happened: a row in `notifications` (the bell in the header) and,
 * unless `email: false`, an email. Never throws — a notification failing must not undo or fail
 * the action that caused it.
 */
export async function notify(userId: string | null | undefined, notice: Notice): Promise<void> {
	if (!userId) return;
	try {
		await db.insert(notifications).values({
			userId,
			type: notice.type,
			title: notice.title.slice(0, 200),
			body: notice.body.slice(0, 255),
			data: notice.link ? { link: notice.link } : null
		});

		if (notice.email !== false) {
			const [row] = await db
				.select({ email: user.email })
				.from(user)
				.where(eq(user.id, userId))
				.limit(1);
			if (row?.email) {
				notifyByEmail({
					to: row.email,
					subject: notice.title,
					...layout({
						heading: notice.title,
						paragraphs: [notice.body],
						action: notice.link
							? { label: 'Open Leora Events', url: `${appOrigin()}${notice.link}` }
							: undefined
					})
				});
			}
		}
	} catch (err) {
		console.error(`[notify] ${notice.type} for ${userId} failed:`, err);
	}
}
