<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import { tick } from 'svelte';
	import { Bot, Send, X, BotMessageSquare, Loader } from '@lucide/svelte';

	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Input } from '@nahu/admin-kit/components/ui/input/index.js';
	import * as Avatar from '@nahu/admin-kit/components/ui/avatar/index.js';

	type ChatMessage = {
		role: 'user' | 'assistant';
		content: string;
	};

	let open = $state(false);
	let input = $state('');
	let loading = $state(false);
	let scrollContainer: HTMLDivElement | undefined = $state();

	let messages: ChatMessage[] = $state([
		{
			role: 'assistant',
			content: m.chat_hello()
		}
	]);

	const quickLinks = [
		{ label: m.chat_find(), href: '/vendors' },
		{ label: m.chat_budget(), href: '/budget-estimator' },
		{ label: m.chat_contact(), href: '/contact-us' }
	];

	async function scrollToBottom() {
		await tick();

		if (scrollContainer) {
			scrollContainer.scrollTop = scrollContainer.scrollHeight;
		}
	}

	async function sendMessage() {
		const content = input.trim();

		if (!content || loading) return;

		messages = [...messages, { role: 'user', content }];
		input = '';
		loading = true;

		await scrollToBottom();

		try {
			const response = await fetch('/api/chat', {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json'
				},
				body: JSON.stringify({ messages })
			});

			const data = await response.json();

			if (response.status === 429) {
				messages = [
					...messages,
					{
						role: 'assistant',
						content: data.error ?? m.chat_limit()
					}
				];

				return;
			}

			if (!response.ok) {
				throw new Error(data.error ?? m.chat_failed());
			}

			messages = [
				...messages,
				{
					role: 'assistant',
					content: data.reply ?? m.chat_sorry()
				}
			];
		} catch (error) {
			messages = [
				...messages,
				{
					role: 'assistant',
					content: error instanceof Error ? error.message : m.chat_error()
				}
			];
		} finally {
			loading = false;
			await scrollToBottom();
		}
	}

	function handleKeydown(event: KeyboardEvent) {
		if (event.key === 'Enter' && !event.shiftKey) {
			event.preventDefault();
			sendMessage();
		}
	}

	/**
	 * Chat text → safe HTML. Everything is escaped first (replies quote vendor-written text, so
	 * they must never carry markup), then only **bold** and [links](…) are turned back on, and
	 * only for site paths or https URLs.
	 */
	function renderMessage(text: string): string {
		const escaped = text
			.replace(/&/g, '&amp;')
			.replace(/</g, '&lt;')
			.replace(/>/g, '&gt;')
			.replace(/"/g, '&quot;')
			.replace(/'/g, '&#39;');
		return escaped
			.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
			.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (match, label: string, href: string) =>
				/^(\/(?!\/)|https:\/\/)/.test(href)
					? `<a class="underline underline-offset-4" href="${href}">${label}</a>`
					: label
			)
			.replace(/\n/g, '<br>');
	}
</script>

<div class="fixed bottom-22 left-5 z-50 lg:bottom-5">
	{#if open}
		<Card.Root
			class="mb-4 flex h-[min(42rem,calc(100vh-6rem))] w-[calc(100vw-2.5rem)] max-w-sm flex-col overflow-hidden border bg-background shadow-2xl sm:w-96"
		>
			<Card.Header class="border-b bg-card">
				<div class="flex items-center justify-between gap-3">
					<div class="flex items-center gap-3">
						<Avatar.Root class="h-10 w-10 border bg-primary text-primary-foreground">
							<Avatar.Fallback>
								<Bot class="h-5 w-5" />
							</Avatar.Fallback>
						</Avatar.Root>

						<div>
							<Card.Title class="text-base">{m.chat_title()}</Card.Title>
							<Card.Description>{m.chat_desc()}</Card.Description>
						</div>
					</div>

					<Button
						type="button"
						variant="ghost"
						size="icon"
						aria-label={m.chat_close()}
						onclick={() => (open = false)}
					>
						<X class="h-4 w-4" />
					</Button>
				</div>
			</Card.Header>

			<div class="border-b px-4 py-3">
				<div class="flex flex-wrap gap-2">
					{#each quickLinks as link (link.href)}
						<a
							href={link.href}
							class="rounded-full border bg-secondary px-3 py-1 text-xs font-medium text-secondary-foreground transition-colors hover:bg-accent hover:text-accent-foreground"
						>
							{link.label}
						</a>
					{/each}
				</div>
			</div>

			<div bind:this={scrollContainer} class="min-h-0 flex-1 overflow-y-auto p-4">
				<div class="space-y-4">
					{#each messages as message, i (i)}
						<div
							class="flex"
							class:justify-end={message.role === 'user'}
							class:justify-start={message.role === 'assistant'}
						>
							<div
								class="max-w-[85%] overflow-hidden rounded-2xl px-4 py-2 text-sm leading-relaxed [overflow-wrap:anywhere] break-words"
								class:bg-primary={message.role === 'user'}
								class:text-primary-foreground={message.role === 'user'}
								class:bg-muted={message.role === 'assistant'}
								class:text-muted-foreground={message.role === 'assistant'}
							>
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- escaped first; see renderMessage -->
								{@html renderMessage(message.content)}
							</div>
						</div>
					{/each}

					{#if loading}
						<div class="flex justify-start">
							<div
								class="flex items-center gap-2 rounded-2xl bg-muted px-4 py-2 text-sm text-muted-foreground"
							>
								<Loader class="h-4 w-4 animate-spin" />
								{m.chat_planning()}
							</div>
						</div>
					{/if}
				</div>
			</div>

			<form
				class="border-t p-4"
				onsubmit={(event) => {
					event.preventDefault();
					sendMessage();
				}}
			>
				<div class="flex gap-2">
					<Input
						bind:value={input}
						placeholder={m.chat_type()}
						disabled={loading}
						onkeydown={handleKeydown}
					/>

					<Button
						type="submit"
						size="icon"
						disabled={loading || !input.trim()}
						aria-label={m.chat_send()}
					>
						<Send class="h-4 w-4" />
					</Button>
				</div>
			</form>
		</Card.Root>
	{/if}

	<Button
		type="button"
		size="lg"
		class="rounded-2xl px-4 py-8 shadow-2xl"
		aria-label={open ? m.chat_close() : undefined}
		onclick={() => (open = !open)}
	>
		{#if open}
			<X class="h-8! w-8!" />
		{:else}
			<BotMessageSquare class="h-8! w-8!" />
			{m.chat_ask()}
		{/if}
	</Button>
</div>
