<script lang="ts">
	import InvitationCard from '$lib/components/card/InvitationCard.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const p = $derived(data.page);
	const names = $derived([p.couple.brideName, p.couple.groomName].filter(Boolean).join(' & '));
</script>

<svelte:head>
	<title>{m.inv_title({ names })}</title>
	<meta name="robots" content="noindex" />
	<meta property="og:title" content={m.inv_title({ names })} />
	<meta property="og:description" content={p.card.headline || m.inv_default_headline()} />
</svelte:head>

<main class="invite-page theme-bg-{p.card.theme}">
	{#if p.isPreview}
		<p class="preview">{m.inv_preview()}</p>
	{/if}
	<InvitationCard
		theme={p.card.theme}
		brideName={p.couple.brideName}
		groomName={p.couple.groomName}
		headline={p.card.headline}
		message={p.card.message}
		coverImage={p.card.coverImage}
		countdownTo={p.countdownTo}
		city={p.city}
		mapUrl={p.card.mapUrl}
		events={p.events}
	>
		<p class="text-center text-sm opacity-70">{m.inv_general_hint()}</p>
	</InvitationCard>
</main>

<style>
	.invite-page {
		min-height: 100dvh;
		padding: 24px 12px 48px;
		background: #efe8dc;
	}
	.theme-bg-royal {
		background: #061428;
	}
	.theme-bg-garden {
		background: #e3ebdd;
	}
	.preview {
		max-width: 560px;
		margin: 0 auto 12px;
		padding: 8px 12px;
		border-radius: 10px;
		background: #fff3cd;
		color: #664d03;
		font-size: 0.85rem;
		text-align: center;
	}
</style>
