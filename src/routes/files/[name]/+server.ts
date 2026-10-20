import { streamStoredFile } from '@nahu/admin-kit/server/serveFile';
import type { RequestHandler } from './$types';

/**
 * Uploaded files, open to anyone: the public vendor pages and the shop show images from here to
 * signed-out visitors, so this cannot be the kit's signed-in `GET`. Stored names are random UUIDs.
 * The kit resolves the name inside `FILES_DIR` and refuses anything that escapes it.
 */
export const GET: RequestHandler = ({ params, request }) =>
	streamStoredFile(params.name, request, 'private');
