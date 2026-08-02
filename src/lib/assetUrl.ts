/**
 * Turns a stored file name into a URL the browser can load.
 *
 * Uploads are written to `FILES_DIR` and served by `src/routes/files/[name]`,
 * so a bare name like `contract-4f2a.pdf` becomes `/files/contract-4f2a.pdf`.
 * Values that are already a URL (remote images, data URIs, absolute paths) are
 * handed back untouched.
 */
export function assetUrl(name: string | null | undefined): string {
	if (!name) return '';
	if (/^[a-z][a-z0-9+.-]*:/i.test(name) || name.startsWith('//')) return name;
	if (name.startsWith('/')) return name;
	return `/files/${encodeURIComponent(name)}`;
}
