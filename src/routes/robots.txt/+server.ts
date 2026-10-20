import type { RequestHandler } from './$types';

/** Crawlers may index the public site; signed-in areas and APIs are off limits. */
export const GET: RequestHandler = ({ url }) =>
	new Response(
		[
			'User-agent: *',
			'Disallow: /admin',
			'Disallow: /wedding',
			'Disallow: /dashboard',
			'Disallow: /vendor-dashboard',
			'Disallow: /vendor-onboarding',
			'Disallow: /account',
			'Disallow: /api/',
			'Disallow: /receipts/',
			'Disallow: /contracts/',
			'Disallow: /payments/',
			'Disallow: /notifications',
			'',
			`Sitemap: ${url.origin}/sitemap.xml`,
			''
		].join('\n'),
		{
			headers: {
				'content-type': 'text/plain; charset=utf-8',
				'cache-control': 'public, max-age=3600'
			}
		}
	);
