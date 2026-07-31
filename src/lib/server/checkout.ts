import { db } from '$lib/server/db';
import {
	vendorServices,
	vendors,
	prices,
	discounts,
	orders,
	vendorOrders,
	orderItems
} from '$lib/server/db/schema';
import { and, eq, inArray, isNull } from 'drizzle-orm';
import type { CartLine } from '$lib/schemas/checkout';

export type PricedLine = {
	productId: number;
	amount: string;
	quantity: number;
	title: string;
	vendorId: number;
	vendorName: string;
	currency: string;
	listPrice: number;
	discount: number;
	unitPrice: number;
	lineTotal: number;
};

export type CartIssue = {
	productId: number;
	amount: string;
	title?: string;
	reason: string;
};

export type PricingResult = {
	lines: PricedLine[];
	issues: CartIssue[];
	total: number;
};

/**
 * Re-prices every cart line from the database. Client prices are never trusted.
 * Lines whose service or package no longer exists come back as issues.
 */
export async function priceCart(lines: CartLine[]): Promise<PricingResult> {
	if (lines.length === 0) return { lines: [], issues: [], total: 0 };

	const ids = [...new Set(lines.map((l) => l.productId))];

	const [rows, discountRows] = await Promise.all([
		db
			.select({
				serviceId: vendorServices.id,
				title: vendorServices.title,
				currency: vendorServices.currency,
				vendorId: vendors.id,
				vendorName: vendors.businessName,
				vendorActive: vendors.isActive,
				vendorDeleted: vendors.deletedAt,
				price: prices.price,
				amount: prices.amount
			})
			.from(vendorServices)
			.innerJoin(vendors, eq(vendorServices.vendorId, vendors.id))
			.leftJoin(prices, eq(prices.serviceId, vendorServices.id))
			.where(
				and(
					inArray(vendorServices.id, ids),
					eq(vendorServices.isActive, true),
					isNull(vendorServices.deletedAt)
				)
			),
		db
			.select({ productId: discounts.productId, amount: discounts.amount })
			.from(discounts)
			.where(
				and(
					inArray(discounts.productId, ids),
					eq(discounts.isActive, true),
					isNull(discounts.deletedAt)
				)
			)
	]);

	// Largest discount wins when a service has several.
	const discountByProduct = new Map<number, number>();
	for (const d of discountRows) {
		if (d.productId == null) continue;
		const value = Number(d.amount ?? 0);
		if (!Number.isFinite(value) || value <= 0) continue;
		discountByProduct.set(d.productId, Math.max(discountByProduct.get(d.productId) ?? 0, value));
	}

	const priced: PricedLine[] = [];
	const issues: CartIssue[] = [];

	for (const line of lines) {
		const forService = rows.filter((r) => r.serviceId === line.productId);

		if (forService.length === 0) {
			issues.push({
				productId: line.productId,
				amount: line.amount,
				reason: 'This service is no longer available.'
			});
			continue;
		}

		const meta = forService[0];

		if (!meta.vendorActive || meta.vendorDeleted) {
			issues.push({
				productId: line.productId,
				amount: line.amount,
				title: meta.title,
				reason: 'This vendor is no longer taking orders.'
			});
			continue;
		}

		const match = forService.find((r) => r.amount === line.amount && r.price != null);

		if (!match) {
			issues.push({
				productId: line.productId,
				amount: line.amount,
				title: meta.title,
				reason: 'That package is no longer offered.'
			});
			continue;
		}

		const listPrice = Number(match.price);
		const discount = Math.min(discountByProduct.get(line.productId) ?? 0, listPrice);
		const unitPrice = Math.max(0, listPrice - discount);

		priced.push({
			productId: line.productId,
			amount: line.amount,
			quantity: line.quantity,
			title: meta.title,
			vendorId: meta.vendorId,
			vendorName: meta.vendorName,
			currency: meta.currency ?? 'ETB',
			listPrice,
			discount,
			unitPrice,
			lineTotal: unitPrice * line.quantity
		});
	}

	return {
		lines: priced,
		issues,
		total: priced.reduce((sum, l) => sum + l.lineTotal, 0)
	};
}

/** Creates the order, one vendor sub-order per vendor, and the items. All or nothing. */
export async function createOrder(coupleId: number, userId: string, lines: PricedLine[]) {
	const total = lines.reduce((sum, l) => sum + l.lineTotal, 0);

	return db.transaction(async (tx) => {
		const [order] = await tx
			.insert(orders)
			.values({
				coupleId,
				totalAmount: total.toFixed(2),
				status: 'pending',
				createdBy: userId,
				updatedBy: userId
			})
			.$returningId();

		const byVendor = new Map<number, PricedLine[]>();
		for (const line of lines) {
			const bucket = byVendor.get(line.vendorId);
			if (bucket) bucket.push(line);
			else byVendor.set(line.vendorId, [line]);
		}

		for (const [vendorId, vendorLines] of byVendor) {
			const subtotal = vendorLines.reduce((sum, l) => sum + l.lineTotal, 0);

			const [vendorOrder] = await tx
				.insert(vendorOrders)
				.values({
					orderId: order.id,
					vendorId,
					subtotal: subtotal.toFixed(2),
					status: 'pending',
					createdBy: userId,
					updatedBy: userId
				})
				.$returningId();

			await tx.insert(orderItems).values(
				vendorLines.map((l) => ({
					vendorOrderId: vendorOrder.id,
					productId: l.productId,
					quantity: l.quantity,
					amount: l.amount,
					price: l.unitPrice.toFixed(2),
					createdBy: userId,
					updatedBy: userId
				}))
			);
		}

		return order.id;
	});
}