<script lang="ts">
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';

	const quickLinks = [
		['Planning Dashboard', '/dashboard'],
		['Pricing', '/pricing'],
		['Contact Us', '/contact-us']
	];

	// 404 gets the friendly wedding-specific copy from the PHP page; anything
	// else shows the real error so a 500 isn't disguised as a missing page.
	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title>{isNotFound ? "Page Not Found" : `Error ${page.status}`} — Leora Events</title>
</svelte:head>

<section class="mx-auto flex max-w-[640px] flex-col items-center px-5 py-24 text-center sm:px-8">
	<p class="font-display text-primary text-7xl font-extrabold sm:text-8xl">{page.status}</p>

	<h1 class="font-display mt-4 text-2xl font-extrabold text-balance sm:text-3xl">
		{isNotFound ? "This page couldn't be found" : 'Something went wrong'}
	</h1>

	<p class="text-muted-foreground mt-3 max-w-md text-[15px] leading-relaxed">
		{#if isNotFound}
			The link may be broken, or the page may have moved. Let's get you back to planning your
			perfect day.
		{:else}
			{page.error?.message ?? 'An unexpected error occurred. Please try again in a moment.'}
		{/if}
	</p>

	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<Button href="/" size="lg">Back to Homepage</Button>
		<Button href="/vendors" variant="outline" size="lg">Browse Marketplace</Button>
	</div>

	<nav class="text-muted-foreground mt-10 flex flex-wrap items-center justify-center gap-x-2 text-[13px]">
		{#each quickLinks as [label, href], i (href)}
			{#if i > 0}<span aria-hidden="true">·</span>{/if}
			<a {href} class="hover:text-foreground transition-colors">{label}</a>
		{/each}
	</nav>
</section>
