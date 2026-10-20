import { and, eq, isNull } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { vendors, vendorServices } from '$lib/server/db/schema';
import { isListable } from '$lib/server/services';
import type { RequestHandler } from './$types';

const STATIC = [
	'/',
	'/vendors',
	'/shop',
	'/pricing',
	'/budget-estimator',
	'/card',
	'/about-us',
	'/contact-us',
	'/privacy',
	'/terms'
];

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Public pages plus every listed vendor and service, for search engines. */
export const GET: RequestHandler = async ({ url }) => {
	const [vendorRows, serviceRows] = await Promise.all([
		db
			.select({ id: vendors.id, updatedAt: vendors.updatedAt })
			.from(vendors)
			.where(
				and(eq(vendors.status, 'approved'), eq(vendors.isActive, true), isNull(vendors.deletedAt))
			),
		db
			.select({ id: vendorServices.id, updatedAt: vendorServices.updatedAt })
			.from(vendorServices)
			.innerJoin(vendors, eq(vendors.id, vendorServices.vendorId))
			.where(isListable)
	]);

	const entry = (path: string, lastmod?: Date | null) =>
		`<url><loc>${xmlEscape(url.origin + path)}</loc>${lastmod ? `<lastmod>${new Date(lastmod).toISOString().slice(0, 10)}</lastmod>` : ''}</url>`;

	const body = [
		'<?xml version="1.0" encoding="UTF-8"?>',
		'<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
		...STATIC.map((p) => entry(p)),
		...vendorRows.map((v) => entry(`/vendors/${v.id}`, v.updatedAt)),
		...serviceRows.map((s) => entry(`/shop/single/${s.id}`, s.updatedAt)),
		'</urlset>'
	].join('\n');

	return new Response(body, {
		headers: {
			'content-type': 'application/xml; charset=utf-8',
			'cache-control': 'public, max-age=3600'
		}
	});
};
