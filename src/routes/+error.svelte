<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { page } from '$app/state';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	const quickLinks = [
		[m.err_planning_dashboard(), '/dashboard'],
		[m.nav_pricing(), '/pricing'],
		[m.footer_contact(), '/contact-us']
	];

	// 404 gets the friendly wedding-specific copy from the PHP page; anything
	// else shows the real error so a 500 isn't disguised as a missing page.
	const isNotFound = $derived(page.status === 404);
</script>

<svelte:head>
	<title
		>{isNotFound ? m.err_not_found_title() : m.err_title({ status: page.status })} — Leora Events</title
	>
</svelte:head>

<section class="mx-auto flex max-w-[640px] flex-col items-center px-5 py-24 text-center sm:px-8">
	<p class="font-display text-7xl font-extrabold text-primary sm:text-8xl">{page.status}</p>

	<h1 class="mt-4 font-display text-2xl font-extrabold text-balance sm:text-3xl">
		{isNotFound ? m.err_not_found_heading() : m.err_heading()}
	</h1>

	<p class="mt-3 max-w-md text-[15px] leading-relaxed text-muted-foreground">
		{#if isNotFound}
			{m.err_not_found_body()}
		{:else}
			{page.error?.message ?? m.err_body()}
		{/if}
	</p>

	<div class="mt-8 flex flex-wrap justify-center gap-3">
		<Button href="/" size="lg">{m.err_home()}</Button>
		<Button href="/vendors" variant="outline" size="lg">{m.err_browse()}</Button>
	</div>

	<nav
		class="mt-10 flex flex-wrap items-center justify-center gap-x-2 text-[13px] text-muted-foreground"
	>
		{#each quickLinks as [label, href], i (href)}
			{#if i > 0}<span aria-hidden="true">·</span>{/if}
			<a {href} class="transition-colors hover:text-foreground">{label}</a>
		{/each}
	</nav>
</section>
