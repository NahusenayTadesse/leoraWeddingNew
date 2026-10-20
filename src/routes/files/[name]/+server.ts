import { error } from '@sveltejs/kit';
import { streamStoredFile } from '@nahu/admin-kit/server/serveFile';
import { isPrivateFile } from '$lib/server/privateFiles';
import type { RequestHandler } from './$types';

/**
 * Uploaded files, open to anyone: the public vendor pages and the shop show images from here to
 * signed-out visitors, so this cannot be the kit's signed-in `GET`. Stored names are random UUIDs.
 * The kit resolves the name inside `FILES_DIR` and refuses anything that escapes it.
 * Receipts and contracts share the store but are refused here (see privateFiles.ts).
 */
export const GET: RequestHandler = async ({ params, request }) => {
	if (await isPrivateFile(params.name)) error(404, 'Not found');
	return streamStoredFile(params.name, request, 'private');
};
