import manifest from '../../../static/demo/manifest.json';
import type { PageLoad } from './$types';

type Credit = { file: string; title: string; author: string; license: string; source: string };

/** Who took each demo photo, and under which licence (CC0, public domain, CC BY, CC BY-SA). */
export const load: PageLoad = () => ({
	credits: Object.values(manifest as Record<string, Credit[]>).flat()
});
