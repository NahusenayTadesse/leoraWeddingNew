<script lang="ts">
	import { Heart } from '@lucide/svelte';

	/** The word under "Leora": which dashboard this is. */
	let { area }: { area: string } = $props();
</script>

<a href="/" class="flex items-center gap-2 py-4">
	<span class="flex size-10 items-center justify-center rounded-full bg-primary">
		<Heart class="size-5 fill-primary-foreground text-primary-foreground" />
	</span>
	<span class="flex flex-col">
		<span class="font-display text-2xl font-semibold text-sidebar-foreground">Leora</span>
		<span class="text-xs tracking-widest text-primary uppercase">{area}</span>
	</span>
</a>
