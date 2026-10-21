<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { assetUrl } from '$lib/assetUrl';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// New photos arrive while people look: check every 20 seconds.
	$effect(() => {
		const timer = setInterval(() => invalidateAll(), 20_000);
		return () => clearInterval(timer);
	});

	// Slideshow (for the hall's screen): one photo at a time, a new one every 6 seconds.
	let index = $state(0);
	$effect(() => {
		if (!data.show) return;
		const timer = setInterval(() => (index = index + 1), 6_000);
		return () => clearInterval(timer);
	});
	const slide = $derived(data.photos.length ? data.photos[index % data.photos.length] : null);
	const blessing = $derived(
		data.blessings.length ? data.blessings[index % data.blessings.length] : null
	);

	const showUrl = $derived.by(() => {
		const u = new URL(page.url);
		u.searchParams.set('show', '1');
		return `${u.pathname}${u.search}`;
	});
</script>

<svelte:head>
	<title>{m.wall_title()} · {data.names}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.show}
	<main class="show">
		{#if slide?.photo}
			{#key slide.id}
				<img src={assetUrl(slide.photo)} alt={slide.body ?? slide.authorName} />
			{/key}
			<p class="credit">{slide.body ? `${slide.body} · ` : ''}{slide.authorName}</p>
		{:else}
			<p class="empty">{m.wall_empty()}</p>
		{/if}
		{#if blessing}
			<p class="blessing">“{blessing.body}” — {blessing.authorName}</p>
		{/if}
		<p class="names">{data.names}</p>
	</main>
{:else}
	<main class="wall theme-{data.theme}">
		<header>
			<h1>{data.names}</h1>
			<p>{m.wall_lead()}</p>
			<a class="show-link" href={showUrl}>{m.wall_show()}</a>
		</header>

		<ActionForm action="?/post" enctype="multipart/form-data" class="upload">
			{#snippet children({ busy })}
				<input type="hidden" name="kind" value="photo" />
				<label>
					<span>{m.wall_photo()}</span>
					<input name="photo" type="file" accept="image/*" required />
				</label>
				<label>
					<span>{m.gift_name()}</span>
					<input name="authorName" required maxlength="120" value={data.guestName} />
				</label>
				<label>
					<span>{m.wall_caption()}</span>
					<input name="body" maxlength="200" />
				</label>
				<button type="submit" disabled={!!busy}>{m.wall_upload()}</button>
			{/snippet}
		</ActionForm>

		{#if data.photos.length === 0}
			<p class="empty">{m.wall_empty()}</p>
		{:else}
			<ul class="grid">
				{#each data.photos as photo (photo.id)}
					<li>
						<img src={assetUrl(photo.photo)} alt={photo.body ?? photo.authorName} loading="lazy" />
						<p>{photo.body ? `${photo.body} · ` : ''}{photo.authorName}</p>
					</li>
				{/each}
			</ul>
		{/if}
	</main>
{/if}

<style>
	.wall {
		min-height: 100dvh;
		padding: 24px 16px 48px;
		background: #efe8dc;
		color: #2b2118;
	}
	.theme-royal {
		background: #061428;
		color: #f4ead5;
	}
	.theme-garden {
		background: #e3ebdd;
	}
	header {
		max-width: 960px;
		margin: 0 auto;
		text-align: center;
	}
	h1 {
		font-size: 1.75rem;
		font-weight: 800;
	}
	header p {
		margin-top: 4px;
		opacity: 0.75;
	}
	.show-link {
		display: inline-block;
		margin-top: 8px;
		font-size: 0.85rem;
		text-decoration: underline;
	}
	.wall :global(.upload) {
		display: grid;
		gap: 10px;
		max-width: 520px;
		margin: 20px auto;
		padding: 16px;
		border-radius: 16px;
		background: rgb(255 255 255 / 0.7);
		color: #2b2118;
	}
	.wall :global(.upload label) {
		display: grid;
		gap: 4px;
		font-size: 0.85rem;
		font-weight: 600;
	}
	.wall :global(.upload input) {
		font-weight: 400;
		padding: 8px 10px;
		border-radius: 10px;
		border: 1px solid rgb(0 0 0 / 0.15);
		background: white;
	}
	.wall :global(.upload button) {
		padding: 10px;
		border-radius: 999px;
		background: #8a5a2b;
		color: white;
		font-weight: 700;
	}
	.wall :global(.upload button:disabled) {
		opacity: 0.6;
	}
	.grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 10px;
		max-width: 960px;
		margin: 0 auto;
	}
	.grid li {
		overflow: hidden;
		border-radius: 12px;
		background: rgb(255 255 255 / 0.6);
	}
	.grid img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
	}
	.grid p {
		padding: 6px 8px;
		font-size: 0.75rem;
		color: #2b2118;
	}
	.empty {
		margin-top: 32px;
		text-align: center;
		opacity: 0.7;
	}
	.show {
		position: fixed;
		inset: 0;
		display: grid;
		place-items: center;
		background: #000;
		color: #fff;
		overflow: hidden;
	}
	.show img {
		max-width: 100vw;
		max-height: 100dvh;
		object-fit: contain;
		animation: fade 0.8s ease;
	}
	.credit,
	.blessing,
	.names {
		position: absolute;
		left: 0;
		right: 0;
		text-align: center;
		text-shadow: 0 1px 6px rgb(0 0 0 / 0.8);
	}
	.credit {
		bottom: 72px;
		font-size: 1.1rem;
	}
	.blessing {
		bottom: 28px;
		padding: 0 24px;
		font-size: 1.3rem;
		font-style: italic;
	}
	.names {
		top: 20px;
		font-size: 1.4rem;
		font-weight: 800;
	}
	@keyframes fade {
		from {
			opacity: 0;
		}
	}
	@media (prefers-reduced-motion: reduce) {
		.show img {
			animation: none;
		}
	}
</style>
