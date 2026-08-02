import { isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { serviceCategories, vendorServices } from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import { contentCrud } from '$lib/server/crud';
import { vendorServiceAddSchema, vendorServiceEditSchema } from '$lib/schemas/vendor-services';
import type { PageServerLoad } from './$types';

const crud = contentCrud({
	table: vendorServices,
	label: 'Service',
	addSchema: vendorServiceAddSchema,
	editSchema: vendorServiceEditSchema,
	fileFields: ['featuredImage'],
	scope: {
		field: 'vendorId',
		resolve: async (locals) => (await requireVendor(locals, '/vendor-dashboard/services')).id
	}
});

// Not annotated with `PageServerLoad` — see the comment in packages/+page.server.ts.
export const load = async (event: Parameters<PageServerLoad>[0]) => {
	const [base, categories] = await Promise.all([
		crud.load(event),
		db
			.select({ value: serviceCategories.id, name: serviceCategories.name })
			.from(serviceCategories)
			.where(isNull(serviceCategories.deletedAt))
	]);
	return { ...base, categories };
};

export const actions = crud.actions;
