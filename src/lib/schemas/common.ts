import { z } from 'zod/v4';

/** Every content table is keyed by an autoincrement id. Shared by the server and the dialogs. */
export const idSchema = z.object({ id: z.coerce.number() });
