// Updated subcity snippet

import { mysqlTable, int, varchar, unique } from 'drizzle-orm/mysql-core';
import { secureFields as lesserFields } from './common';
export const region = mysqlTable('region', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	...lesserFields
});

/**
 * Place names are unique within their parent, not globally. The previous
 * global UNIQUE on `name` meant the second region to add a city sharing a name
 * with one already entered elsewhere was rejected outright — and Ethiopian
 * place names repeat across regions constantly.
 */
export const city = mysqlTable(
	'city',
	{
		id: int('id').primaryKey().autoincrement(),
		regionId: int('region_id')
			.notNull()
			.references(() => region.id), // Relationship link
		name: varchar('name', { length: 50 }).notNull(),
		...lesserFields
	},
	(table) => [unique('city_region_name_uq').on(table.regionId, table.name)]
);

export const subcity = mysqlTable(
	'subcity',
	{
		id: int('sc_id').primaryKey().autoincrement(),
		cityId: int('city_id')
			.notNull()
			.references(() => city.id), // Relationship link
		name: varchar('name', { length: 50 }).notNull(),
		...lesserFields
	},
	(table) => [unique('subcity_city_name_uq').on(table.cityId, table.name)]
);

export const address = mysqlTable('address', {
	id: int('id').primaryKey().autoincrement(),
	subcityId: int('subcity_id')
		.notNull()
		.references(() => subcity.id), // Relationship link
	street: varchar('street', { length: 100 }),
	kebele: varchar('kebele', { length: 100 }),
	buildingNumber: varchar('building_number', { length: 10 }),
	floor: int('floor').notNull().default(0),
	houseNumber: int('house_number').notNull().default(0),
	googleMapsUrl: varchar('google_maps_url', { length: 255 }),
	...lesserFields
});
