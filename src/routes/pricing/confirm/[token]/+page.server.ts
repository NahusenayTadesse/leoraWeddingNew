import { redirect } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

/**
 * The old Chapa return page. Its token named the plan to activate and could be edited to a
 * pricier one; checkouts now return to /payments/return and settle from the payment row.
 * Kept only so links from checkouts started before the change land somewhere sensible.
 */
export const load: PageServerLoad = async () => redirect(303, '/pricing');
