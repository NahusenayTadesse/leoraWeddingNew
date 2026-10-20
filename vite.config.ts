import devtoolsJson from 'vite-plugin-devtools-json';
import tailwindcss from '@tailwindcss/vite';
import { sveltekit } from '@sveltejs/kit/vite';
import { adminKit } from '@nahu/admin-kit/vite';
import { paraglideVitePlugin } from '@inlang/paraglide-js';
import { defineConfig } from 'vitest/config';

/**
 * Under vitest, SvelteKit's `$env` is read from .env when this config loads — before a project's
 * `test.env` applies — so the test database must be set here. Without this, DB tests would use
 * whatever DATABASE_URL .env holds (possibly a shared server). tests/db-setup.ts also refuses
 * any database whose name doesn't end in _test.
 */
if (process.env.VITEST) {
	process.env.DATABASE_URL = process.env.TEST_DATABASE_URL ?? 'mysql://dev@localhost:3306/leora_test';
	process.env.CHAPA_SECRET_KEY = 'CHASECK_TEST-unit-tests';
	process.env.SECRET_KEY = 'CHASECK_TEST-unit-tests';
	process.env.GEMINI_KEY = '';
	process.env.SMTP_HOST = '';
	process.env.FILES_DIR = '.tempFiles-test';
	process.env.RUN_JOBS = 'false';
}

export default defineConfig({
	plugins: [
		tailwindcss(),
		sveltekit(),
		paraglideVitePlugin({
			project: './project.inlang',
			outdir: './src/lib/paraglide',
			emitTsDeclarations: true,
			// No locale in the URL: the visitor's choice (cookie), else their browser language.
			strategy: ['cookie', 'preferredLanguage', 'baseLocale']
		}),
		adminKit(),
		devtoolsJson()
	],
	test: {
		expect: { requireAssertions: true },
		projects: [
			{
				extends: './vite.config.ts',
				test: {
					name: 'unit',
					environment: 'node',
					include: ['src/**/*.test.ts'],
					exclude: ['src/**/*.db.test.ts']
				}
			},
			{
				// Against a real MariaDB (`leora_test`), one file at a time: tests empty the tables they use.
				extends: './vite.config.ts',
				test: {
					name: 'db',
					environment: 'node',
					include: ['src/**/*.db.test.ts'],
					globalSetup: ['./tests/db-global-setup.ts'],
					setupFiles: ['./tests/db-setup.ts'],
					fileParallelism: false,
					testTimeout: 20_000,
					env: {
						DATABASE_URL: process.env.TEST_DATABASE_URL ?? 'mysql://dev@localhost:3306/leora_test',
						CHAPA_SECRET_KEY: 'CHASECK_TEST-unit-tests',
						FILES_DIR: '.tempFiles-test',
						RUN_JOBS: 'false'
					}
				}
			}
		]
	}
});
