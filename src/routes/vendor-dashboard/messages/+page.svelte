<script lang="ts">
	import { enhance as formEnhance } from '$app/forms';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import { MessageSquare, Send } from '@lucide/svelte';

	let { data, form } = $props();

	let body = $state('');
	let sending = $state(false);

	const initials = (name: string) =>
		name
			.split(' ')
			.map((w) => w[0])
			.slice(0, 2)
			.join('')
			.toUpperCase();

	function formatTime(date: Date) {
		const d = new Date(date);
		const now = new Date();
		const sameDay = d.toDateString() === now.toDateString();
		if (sameDay) return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });

		const days = Math.floor((now.getTime() - d.getTime()) / 86_400_000);
		if (days < 1) return 'Today';
		if (days < 7) return `${days}d`;
		return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Messages · Vendor Dashboard</title>
</svelte:head>

<div class="mb-6">
	<h1 class="text-2xl font-semibold tracking-tight">Messages</h1>
	<p class="text-muted-foreground mt-1 text-sm">Conversations with couples about your services.</p>
</div>

<Card.Root class="grid h-[70vh] min-h-[480px] grid-cols-1 gap-0 overflow-hidden p-0 md:grid-cols-[300px_1fr]">
	<!-- Thread list -->
	<div
		class={cn(
			'flex min-h-0 flex-col overflow-y-auto border-b md:border-r md:border-b-0',
			data.activeCoupleId ? 'hidden md:flex' : 'flex'
		)}
	>
		<div class="text-muted-foreground border-b px-4 py-3 text-xs font-semibold tracking-wide uppercase">
			Inbox
		</div>

		{#if data.threads.length === 0}
			<div class="text-muted-foreground flex flex-1 items-center justify-center px-6 text-center text-sm">
				No conversations yet. Reply to a couple from your bookings to get started.
			</div>
		{:else}
			{#each data.threads as thread (thread.coupleId)}
				<a
					href="?couple={thread.coupleId}"
					class={cn(
						'hover:bg-accent flex gap-3 border-b px-4 py-3.5 transition-colors',
						data.activeCoupleId === thread.coupleId && 'bg-accent'
					)}
				>
					<div
						class="bg-muted flex size-9 shrink-0 items-center justify-center rounded-full border text-xs font-bold"
					>
						{initials(thread.coupleName)}
					</div>
					<div class="min-w-0 flex-1">
						<div class="flex items-center justify-between gap-2">
							<h4 class="truncate text-sm font-medium">{thread.coupleName}</h4>
							<time class="text-muted-foreground shrink-0 text-[11px]">{formatTime(thread.lastAt)}</time>
						</div>
						<p class="text-muted-foreground mt-0.5 truncate text-xs">{thread.lastMessage}</p>
					</div>
					{#if thread.unread > 0}
						<span class="bg-primary mt-1.5 size-2 shrink-0 rounded-full"></span>
					{/if}
				</a>
			{/each}
		{/if}
	</div>

	<!-- Thread view -->
	<div class={cn('flex min-h-0 flex-col', !data.activeCoupleId && 'hidden md:flex')}>
		{#if data.activeThread}
			<div class="flex items-center justify-between border-b px-5 py-3.5">
				<div class="min-w-0">
					<a href="?" class="text-muted-foreground mb-1 inline-block text-xs md:hidden">← Back</a>
					<h3 class="truncate text-sm font-semibold">{data.activeThread.couple.coupleName}</h3>
				</div>
			</div>

			<div class="flex-1 space-y-3 overflow-y-auto p-5">
				{#if data.activeThread.messages.length === 0}
					<div class="text-muted-foreground flex h-full items-center justify-center text-center text-sm">
						Start the conversation with {data.activeThread.couple.coupleName}.
					</div>
				{:else}
					{#each data.activeThread.messages as message (message.id)}
						{@const mine = message.senderId === data.vendor.userId}
						<div class={cn('flex', mine ? 'justify-end' : 'justify-start')}>
							<div
								class={cn(
									'max-w-[70%] rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed',
									mine
										? 'bg-primary text-primary-foreground rounded-br-sm'
										: 'bg-muted rounded-bl-sm'
								)}
							>
								{message.body}
								<time class={cn('mt-1 block text-[10px] opacity-70')}>
									{formatTime(message.createdAt)}
								</time>
							</div>
						</div>
					{/each}
				{/if}
			</div>

			<form
				method="POST"
				action="?/send"
				use:formEnhance={() => {
					sending = true;
					return async ({ update }) => {
						sending = false;
						body = '';
						await update();
					};
				}}
				class="flex gap-2 border-t p-3.5"
			>
				<input type="hidden" name="coupleId" value={data.activeThread.couple.coupleId} />
				<Input name="body" bind:value={body} placeholder="Type a message..." autocomplete="off" />
				<Button type="submit" disabled={sending || !body.trim()}>
					<Send class="size-4" />
				</Button>
			</form>

			{#if form?.error}
				<p class="text-destructive px-3.5 pb-3 text-xs">{form.error}</p>
			{/if}
		{:else}
			<div class="text-muted-foreground flex flex-1 flex-col items-center justify-center gap-2 text-sm">
				<MessageSquare class="size-8" />
				Select a conversation to view messages
			</div>
		{/if}
	</div>
</Card.Root>
