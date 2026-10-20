<script lang="ts">
	import { LanguagesIcon } from '@lucide/svelte';
	import { getLocale, setLocale, locales } from '$lib/paraglide/runtime';
	import { m } from '$lib/paraglide/messages.js';

	/** English ⇄ አማርኛ. `setLocale` stores the choice in a cookie and reloads the page. */
	const NAMES: Record<string, string> = { en: 'English', am: 'አማርኛ' };
	const current = getLocale();
	const next = locales.find((l) => l !== current) ?? 'en';
</script>

<button
	type="button"
	onclick={() => setLocale(next)}
	class="flex items-center gap-1.5 rounded-md px-2 py-1.5 text-sm font-medium opacity-80 hover:opacity-100"
	title={m.lang_switch()}
	lang={next}
>
	<LanguagesIcon class="size-4" aria-hidden="true" />
	<span>{NAMES[next] ?? next}</span>
</button>
