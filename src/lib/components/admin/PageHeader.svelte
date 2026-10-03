<script lang="ts">
	import type { Snippet } from 'svelte';
	let {
		title,
		description,
		children
	}: { title: string; description?: string; children?: Snippet } = $props();
</script>

<svelte:head><title>{title} — Admin Console</title></svelte:head>

<div class="flex flex-wrap items-end justify-between gap-3">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{title}</h1>
		{#if description}<p class="text-muted-foreground text-sm">{description}</p>{/if}
	</div>
	{@render children?.()}
</div>
