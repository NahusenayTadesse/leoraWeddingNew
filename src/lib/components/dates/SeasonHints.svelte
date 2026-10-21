<script lang="ts">
	/** What a wedding date falls in: fasts, the popular season, the rains. Nothing on an ordinary day. */
	import { seasonNotes, type SeasonNote } from '@nahu/admin-kit/ethiopianSeasons';
	import { m } from '$lib/paraglide/messages.js';
	import { CloudRain, Sparkles, UtensilsCrossed } from '@lucide/svelte';

	let { date, class: className = '' }: { date: string | null | undefined; class?: string } =
		$props();

	const TEXT: Record<SeasonNote['key'], () => string> = {
		advent: m.season_advent,
		lent: m.season_lent,
		apostles: m.season_apostles,
		filseta: m.season_filseta,
		ramadan: m.season_ramadan,
		after_timket: m.season_after_timket,
		after_fasika: m.season_after_fasika,
		kiremt: m.season_kiremt
	};
	const ICON = { fast: UtensilsCrossed, popular: Sparkles, rainy: CloudRain };

	const notes = $derived(seasonNotes(date));
</script>

{#if notes.length}
	<ul class="space-y-1 text-xs {className}">
		{#each notes as note (note.key)}
			{@const Icon = ICON[note.kind]}
			<li
				class="flex items-start gap-1.5 {note.kind === 'fast'
					? 'text-amber-700 dark:text-amber-400'
					: 'text-muted-foreground'}"
			>
				<Icon class="mt-0.5 size-3.5 shrink-0" />{TEXT[note.key]()}
			</li>
		{/each}
	</ul>
{/if}
