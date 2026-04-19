import type { PageServerLoad } from './$types';
import { db } from '$lib/server/db';
import {
	vendors as customers,
	user,
	vendorCategories,
	subcity,
	address,
	vendorServices
} from '$lib/server/db/schema';
import { eq, count, sql } from 'drizzle-orm';

export const load: PageServerLoad = async () => {
	// const form = await superValidate(zod4(addCustomer));
	const customersList = await db
		.select({
			id: customers.id,
			name: customers.businessName,
			phone: customers.phone,
			email: user.email,
			vendorCategory: vendorCategories.name,
			numberOfServices: count(vendorServices.id),
			address: {
				subcity: subcity.name,
				street: address.street,
				kebele: address.kebele,
				buildingNumber: address.buildingNumber,
				floor: address.floor,
				houseNumber: address.houseNumber,
				googleMapsUrl: address.googleMapsUrl
			},
			subcity: subcity.name,
			daysSinceJoined: sql<number>`DATEDIFF(CURRENT_DATE, ${customers.createdAt})`,
			createdAt: sql<string>`DATE_FORMAT(${customers.createdAt}, '%d %M %Y')`
		})
		.from(customers)
		.leftJoin(user, eq(customers.userId, user.id))
		.leftJoin(vendorCategories, eq(customers.vendorCategory, vendorCategories.id))
		.leftJoin(vendorServices, eq(customers.id, vendorServices.vendorId))
		.leftJoin(address, eq(customers.id, address.id))
		.leftJoin(subcity, eq(address.subcityId, subcity.id))
		.groupBy(
			customers.id,
			user.name,
			customers.createdAt,
			customers.businessName,
			address.street,
			address.kebele,
			address.buildingNumber,
			address.floor,
			address.houseNumber,
			address.googleMapsUrl
		);

	return {
		customersList
	};
};
