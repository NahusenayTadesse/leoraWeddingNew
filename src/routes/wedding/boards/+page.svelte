<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { LayoutGrid, X } from '@lucide/svelte';
	import { assetUrl } from '$lib/assetUrl';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	async function copy(url: string | null) {
		if (!url) return;
		try {
			await navigator.clipboard.writeText(url);
			toast.success(m.partner_copied());
		} catch {
			// Clipboard blocked: the link is shown under the board name.
		}
	}
</script>

<svelte:head>
	<title>{m.boards_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div class="max-w-2xl">
			<h1 class="text-2xl font-semibold tracking-tight">{m.boards_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.boards_lead()}</p>
		</div>
		<ActionForm action="?/create" class="flex gap-2">
			{#snippet children({ busy })}
				<input
					name="name"
					required
					maxlength="80"
					placeholder={m.boards_name()}
					aria-label={m.boards_name()}
					class="h-9 w-44 rounded-md border bg-background px-3 text-sm"
				/>
				<Button type="submit" disabled={!!busy}>{m.boards_create()}</Button>
			{/snippet}
		</ActionForm>
	</div>

	{#if data.boards.length === 0}
		<Card.Root class="p-10 text-center text-sm text-muted-foreground">
			<LayoutGrid class="mx-auto mb-2 size-8" />{m.boards_empty()}
		</Card.Root>
	{/if}

	{#each data.boards as board (board.id)}
		<Card.Root>
			<Card.Header class="flex flex-row flex-wrap items-center justify-between gap-2">
				<div class="min-w-0">
					<Card.Title>{board.name}</Card.Title>
					{#if board.shareUrl}
						<p class="truncate text-xs text-muted-foreground">{board.shareUrl}</p>
					{/if}
				</div>
				<div class="flex flex-wrap gap-2">
					{#if board.shareUrl}
						<Button size="sm" variant="outline" onclick={() => copy(board.shareUrl)}>
							{m.boards_share()}
						</Button>
					{:else}
						<ActionForm
							action="?/share"
							fields={{ id: board.id }}
							submit={() =>
								async ({ update }) => {
									await update();
									await invalidateAll();
								}}
						>
							{#snippet children({ busy })}
								<Button type="submit" size="sm" variant="outline" disabled={!!busy}>
									{m.boards_share()}
								</Button>
							{/snippet}
						</ActionForm>
					{/if}
					<ActionForm action="?/remove" fields={{ id: board.id }}>
						{#snippet children({ busy })}
							<Button
								type="submit"
								size="sm"
								variant="ghost"
								class="text-destructive"
								disabled={!!busy}
							>
								{m.boards_delete()}
							</Button>
						{/snippet}
					</ActionForm>
				</div>
			</Card.Header>
			<Card.Content class="space-y-3">
				{#if board.items.length}
					<ul class="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-6">
						{#each board.items as item (item.id)}
							<li class="group relative overflow-hidden rounded-lg border">
								<img
									src={assetUrl(item.image)}
									alt={item.note ?? item.vendorName ?? board.name}
									class="aspect-square w-full object-cover"
									loading="lazy"
								/>
								{#if item.vendorName}
									<a
										href="/vendors/{item.vendorId}"
										class="absolute inset-x-0 bottom-0 truncate bg-black/50 px-2 py-1 text-xs text-white"
										>{item.vendorName}</a
									>
								{/if}
								<ActionForm
									action="?/removeItem"
									fields={{ id: item.id }}
									class="absolute top-1 right-1"
								>
									{#snippet children({ busy })}
										<button
											type="submit"
											disabled={!!busy}
											aria-label={m.boards_remove()}
											class="rounded-full bg-background/90 p-1"
										>
											<X class="size-3.5" />
										</button>
									{/snippet}
								</ActionForm>
							</li>
						{/each}
					</ul>
				{/if}
				<ActionForm
					action="?/upload"
					enctype="multipart/form-data"
					fields={{ boardId: board.id }}
					class="flex flex-wrap items-center gap-2 text-sm"
				>
					{#snippet children({ busy })}
						<label class="flex items-center gap-2">
							<span class="text-muted-foreground">{m.boards_add_photo()}</span>
							<input name="photo" type="file" accept="image/*" required class="text-xs" />
						</label>
						<Button type="submit" size="sm" variant="outline" disabled={!!busy}>
							{m.boards_save()}
						</Button>
					{/snippet}
				</ActionForm>
			</Card.Content>
		</Card.Root>
	{/each}
</div>
