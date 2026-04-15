import { error, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { vendors } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';

import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ locals, parent }) => {
	// 1. Check authentication first
	const user = locals.user;

	if (!user) {
		redirect(302, '/login');
	}

	// 2. Get parent data once
	const { isVendor } = await parent();

	console.log(isVendor);

	if (user.role !== 'admin' && !isVendor) {
		error(403, 'Not Allowed');
	}

	const vendorId = isVendor
		? await db
				.select({ id: vendors.id })
				.from(vendors)
				.where(eq(vendors.userId, user.id))
				.then((res) => res[0].id)
		: null;

	console.log(vendorId);

	return {
		name: user.name,
		vendorId
	};
};
