import { vendorPackages } from '$lib/server/db/schema';
import { requireVendor } from '$lib/server/vendor';
import { contentCrud } from '$lib/server/crud';
import { vendorPackageAddSchema, vendorPackageEditSchema } from '$lib/schemas/vendor-packages';

const crud = contentCrud({
	table: vendorPackages,
	label: 'Package',
	addSchema: vendorPackageAddSchema,
	editSchema: vendorPackageEditSchema,
	listFields: ['inclusions'],
	moneyFields: ['price'],
	scope: {
		field: 'vendorId',
		resolve: async (locals) => (await requireVendor(locals, '/vendor-dashboard/packages')).id
	}
});

// Not annotated with `PageServerLoad`: that widens `rows` to `Record<string,
// any>[]` for every importer of `./$types`, since SvelteKit's generated
// `PageData` reflects this export's *declared* type, not `crud.load`'s
// actual (precise, per-table) inferred return type.
export const load = crud.load;
export const actions = crud.actions;
