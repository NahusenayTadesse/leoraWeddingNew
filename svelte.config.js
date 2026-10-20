import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		adapter: adapter(),
		/**
		 * SvelteKit hashes its own inline scripts (mode 'auto'), so no 'unsafe-inline' for scripts.
		 * Styles keep 'unsafe-inline': Svelte transitions and `style=` attributes need it.
		 * Images allow any https source: vendor galleries and seeds use external hosts.
		 * form-action includes Chapa because a payment form redirects (303) to its checkout.
		 */
		csp: {
			mode: 'auto',
			directives: {
				'default-src': ['self'],
				'script-src': ['self'],
				'style-src': ['self', 'unsafe-inline', 'https://fonts.googleapis.com'],
				'font-src': ['self', 'data:', 'https://fonts.gstatic.com'],
				'img-src': ['self', 'data:', 'blob:', 'https:'],
				'connect-src': ['self'],
				'frame-src': [
					'https://www.youtube-nocookie.com',
					'https://www.youtube.com',
					'https://www.google.com',
					'https://maps.google.com'
				],
				'form-action': ['self', 'https://checkout.chapa.co', 'https://*.chapa.co'],
				'frame-ancestors': ['none'],
				'base-uri': ['self'],
				'object-src': ['none']
			}
		}
	}
};

export default config;
