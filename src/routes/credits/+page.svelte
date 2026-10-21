<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();
</script>

<svelte:head>
	<title>{m.credits_title()} — Leora Events</title>
</svelte:head>

<main class="mx-auto max-w-5xl px-5 py-14">
	<h1 class="font-display text-3xl font-extrabold">{m.credits_title()}</h1>
	<p class="mt-2 max-w-2xl text-sm text-muted-foreground">{m.credits_lead()}</p>
	<ul class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
		{#each data.credits as c (c.file)}
			<li class="overflow-hidden rounded-xl border bg-card text-xs">
				<img
					src="/demo/{c.file}"
					alt={c.title}
					loading="lazy"
					class="aspect-[4/3] w-full object-cover"
				/>
				<div class="space-y-0.5 p-3">
					<p class="truncate font-medium" title={c.title}>{c.title}</p>
					<p class="truncate text-muted-foreground">{c.author} · {c.license}</p>
					<a
						href={c.source}
						target="_blank"
						rel="noopener noreferrer"
						class="text-primary underline"
					>
						Wikimedia Commons
					</a>
				</div>
			</li>
		{/each}
	</ul>
</main>
