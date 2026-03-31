// Updated subcity snippet

import { mysqlTable, int, varchar } from 'drizzle-orm/mysql-core';
import { secureFields as lesserFields } from './auth.schema';
export const region = mysqlTable('region', {
	id: int('id').primaryKey().autoincrement(),
	name: varchar('name', { length: 50 }).notNull().unique(),
	...lesserFields
});

export const city = mysqlTable('city', {
	id: int('id').primaryKey().autoincrement(),
	regionId: int('region_id')
		.notNull()
		.references(() => region.id), // Relationship link
	name: varchar('name', { length: 50 }).notNull().unique(),
	...lesserFields
});

export const subcity = mysqlTable('subcity', {
	id: int('sc_id').primaryKey().autoincrement(),
	cityId: int('city_id')
		.notNull()
		.references(() => city.id), // Relationship link
	name: varchar('name', { length: 50 }).notNull().unique(),
	...lesserFields
});

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
