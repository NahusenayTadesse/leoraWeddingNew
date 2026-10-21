<script lang="ts">
	import { assetUrl } from '$lib/assetUrl';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{data.board.name} · {m.boards_title()}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto max-w-5xl px-4 py-10">
	<p class="text-xs font-semibold tracking-widest text-muted-foreground uppercase">
		{m.boards_shared_by()}
	</p>
	<h1 class="mt-1 text-3xl font-semibold tracking-tight">{data.board.name}</h1>
	<ul class="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
		{#each data.board.items as item (item.id)}
			<li class="overflow-hidden rounded-lg border">
				<img
					src={assetUrl(item.image)}
					alt={item.note ?? data.board.name}
					class="aspect-square w-full object-cover"
					loading="lazy"
				/>
				{#if item.note}<p class="p-2 text-xs">{item.note}</p>{/if}
			</li>
		{/each}
	</ul>
</main>
