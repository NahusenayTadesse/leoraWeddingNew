<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const unread = $derived(data.items.filter((n) => !n.isRead).length);
</script>

<svelte:head>
	<title>{m.notif_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="mx-auto w-full max-w-2xl px-4 py-10">
	<div class="mb-6 flex items-center justify-between gap-4">
		<h1 class="text-2xl font-bold">{m.notif_title()}</h1>
		{#if unread}
			<ActionForm action="?/readAll">
				{#snippet children({ busy })}
					<Button type="submit" variant="outline" size="sm" disabled={!!busy}>
						{m.notif_read_all()}
					</Button>
				{/snippet}
			</ActionForm>
		{/if}
	</div>

	{#if data.items.length === 0}
		<p class="rounded-xl border p-10 text-center text-muted-foreground">{m.notif_empty()}</p>
	{:else}
		<ul class="divide-y rounded-xl border">
			{#each data.items as n (n.id)}
				<li>
					<ActionForm action="?/open" fields={{ id: n.id }}>
						<button
							type="submit"
							class="flex w-full items-start gap-3 p-4 text-left hover:bg-muted/50"
						>
							<span
								class={[
									'mt-1.5 size-2 shrink-0 rounded-full',
									n.isRead ? 'bg-transparent' : 'bg-(--leora-gold)'
								]}
								aria-hidden="true"
							></span>
							<span class="min-w-0 flex-1">
								<span class={['block', !n.isRead && 'font-semibold']}>{n.title}</span>
								{#if n.body}
									<span class="block text-sm text-muted-foreground">{n.body}</span>
								{/if}
								<span class="mt-1 block text-xs text-muted-foreground">
									{new Date(n.createdAt).toLocaleString()}
								</span>
							</span>
						</button>
					</ActionForm>
				</li>
			{/each}
		</ul>
	{/if}
</main>
