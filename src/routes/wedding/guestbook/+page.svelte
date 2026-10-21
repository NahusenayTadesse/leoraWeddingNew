<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import { toast } from 'svelte-sonner';
	import { assetUrl } from '$lib/assetUrl';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	const photos = $derived(data.posts.filter((p) => p.kind === 'photo'));
	const blessings = $derived(data.posts.filter((p) => p.kind === 'blessing'));
	const songs = $derived(data.posts.filter((p) => p.kind === 'song'));

	async function copySongs() {
		const list = songs
			.filter((s) => !s.hidden)
			.map((s) => `${s.body} (${s.authorName})`)
			.join('\n');
		try {
			await navigator.clipboard.writeText(list);
			toast.success(m.partner_copied());
		} catch {
			// Clipboard blocked: the list is on screen.
		}
	}
</script>

<svelte:head>
	<title>{m.gb_title()} — Leora Events</title>
</svelte:head>

{#snippet hideButton(post: (typeof data.posts)[number])}
	<ActionForm action="?/hide" fields={{ id: post.id, hidden: post.hidden ? 'no' : 'yes' }}>
		{#snippet children({ busy })}
			<Button type="submit" size="sm" variant="ghost" disabled={!!busy}>
				{post.hidden ? m.gb_show() : m.gb_hide()}
			</Button>
		{/snippet}
	</ActionForm>
{/snippet}

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.gb_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.gb_lead()}</p>
	</div>

	{#if data.wallUrl}
		<Card.Root>
			<Card.Content class="flex flex-wrap items-center gap-5 py-5">
				{#if data.wallQr}
					<img src={data.wallQr} alt={m.gb_wall_link()} width="120" height="120" class="rounded" />
				{/if}
				<div class="min-w-0 flex-1 space-y-2">
					<p class="font-medium">{m.gb_wall_link()}</p>
					<p class="text-sm text-muted-foreground">{m.gb_wall_hint()}</p>
					<p class="truncate text-xs text-muted-foreground">{data.wallUrl}</p>
					<div class="flex flex-wrap gap-2">
						<Button size="sm" variant="outline" href="{data.wallUrl}&show=1" target="_blank">
							{m.gb_open_show()}
						</Button>
						<ActionForm action="?/newWallLink">
							{#snippet children({ busy })}
								<Button type="submit" size="sm" variant="ghost" disabled={!!busy}>
									{m.gb_new_link()}
								</Button>
							{/snippet}
						</ActionForm>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<Tabs.Root value="photos">
		<Tabs.List>
			<Tabs.Trigger value="photos">{m.gb_photos()} ({photos.length})</Tabs.Trigger>
			<Tabs.Trigger value="blessings">{m.gb_blessings()} ({blessings.length})</Tabs.Trigger>
			<Tabs.Trigger value="songs">{m.gb_songs()} ({songs.length})</Tabs.Trigger>
		</Tabs.List>

		<Tabs.Content value="photos" class="mt-4">
			{#if photos.length === 0}
				<p class="text-sm text-muted-foreground">{m.gb_none()}</p>
			{:else}
				<ul class="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
					{#each photos as post (post.id)}
						<li class="overflow-hidden rounded-lg border bg-card {post.hidden ? 'opacity-50' : ''}">
							<img
								src={assetUrl(post.photo)}
								alt={post.body ?? post.authorName}
								class="aspect-square w-full object-cover"
								loading="lazy"
							/>
							<div class="flex items-center justify-between gap-2 p-2 text-xs">
								<span class="truncate">{post.authorName}</span>
								{@render hideButton(post)}
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</Tabs.Content>

		<Tabs.Content value="blessings" class="mt-4 grid gap-3">
			{#each blessings as post (post.id)}
				<Card.Root class="p-4 {post.hidden ? 'opacity-50' : ''}">
					<p class="whitespace-pre-line">{post.body}</p>
					<div class="mt-2 flex items-center justify-between text-xs text-muted-foreground">
						<span>— {post.authorName}</span>
						{@render hideButton(post)}
					</div>
				</Card.Root>
			{:else}
				<p class="text-sm text-muted-foreground">{m.gb_none()}</p>
			{/each}
		</Tabs.Content>

		<Tabs.Content value="songs" class="mt-4 space-y-3">
			{#if songs.length}
				<Button size="sm" variant="outline" onclick={copySongs}>{m.gb_copy_songs()}</Button>
			{/if}
			<ul class="divide-y rounded-lg border bg-card">
				{#each songs as post (post.id)}
					<li
						class="flex items-center justify-between gap-2 px-3 py-2 text-sm {post.hidden
							? 'opacity-50'
							: ''}"
					>
						<span>{post.body} <span class="text-muted-foreground">· {post.authorName}</span></span>
						<span class="flex items-center gap-2">
							{#if post.hidden}<Badge variant="secondary">{m.gb_hidden()}</Badge>{/if}
							{@render hideButton(post)}
						</span>
					</li>
				{:else}
					<li class="px-3 py-2 text-sm text-muted-foreground">{m.gb_none()}</li>
				{/each}
			</ul>
		</Tabs.Content>
	</Tabs.Root>
</div>
