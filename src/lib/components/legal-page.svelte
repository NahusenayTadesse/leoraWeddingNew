<script lang="ts">
	import type { Snippet } from 'svelte';

	let {
		title,
		updated,
		children
	}: { title: string; updated: string; children: Snippet } = $props();
</script>

<article class="mx-auto max-w-[760px] px-5 py-16 sm:px-8">
	<h1 class="font-display text-3xl font-extrabold sm:text-4xl">{title}</h1>
	<p class="text-muted-foreground mt-2 text-[13.5px]">Last updated: {updated}</p>

	<div class="legal mt-10">
		{@render children()}
	</div>
</article>

<style>
	/*
	 * Long-form legal copy is the one place a descendant stylesheet beats
	 * per-element utilities: the markup is a plain sequence of headings, lists
	 * and paragraphs, and repeating the same six classes on every one of forty
	 * elements makes the content unreadable in source.
	 */
	.legal :global(h2) {
		font-family: var(--font-display);
		font-size: 1.0625rem;
		font-weight: 700;
		margin-top: 2.25rem;
		margin-bottom: 0.625rem;
	}
	.legal :global(h2:first-child) {
		margin-top: 0;
	}
	.legal :global(p) {
		color: var(--muted-foreground);
		font-size: 0.9063rem;
		line-height: 1.7;
		margin-bottom: 0.875rem;
	}
	.legal :global(ul) {
		color: var(--muted-foreground);
		font-size: 0.9063rem;
		line-height: 1.7;
		margin-bottom: 0.875rem;
		padding-left: 1.125rem;
		list-style: disc;
	}
	.legal :global(li) {
		margin-bottom: 0.375rem;
	}
	.legal :global(a) {
		color: var(--accent-foreground);
		text-decoration: underline;
		text-underline-offset: 2px;
	}
	.legal :global(table) {
		width: 100%;
		border-collapse: collapse;
		font-size: 0.875rem;
		margin-bottom: 1.25rem;
	}
	.legal :global(th),
	.legal :global(td) {
		border-bottom: 1px solid var(--border);
		padding: 0.625rem 0.5rem;
		text-align: left;
		vertical-align: top;
	}
	.legal :global(th) {
		font-size: 0.7188rem;
		font-weight: 700;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--muted-foreground);
	}
	.legal :global(td) {
		color: var(--muted-foreground);
	}
	.legal :global(td:first-child) {
		color: var(--foreground);
		font-weight: 600;
		white-space: nowrap;
	}
</style>
