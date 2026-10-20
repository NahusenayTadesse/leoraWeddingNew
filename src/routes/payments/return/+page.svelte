<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { CircleCheckIcon, CircleXIcon, ClockIcon } from '@lucide/svelte';
	import { invalidateAll } from '$app/navigation';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	let checking = $state(false);

	// Chapa's own confirmation can lag the redirect by a few seconds: look again a few times.
	$effect(() => {
		if (data.status !== 'pending') return;
		let tries = 0;
		const timer = setInterval(async () => {
			if (++tries > 6) return clearInterval(timer);
			await invalidateAll();
		}, 5000);
		return () => clearInterval(timer);
	});

	async function recheck() {
		checking = true;
		await invalidateAll();
		checking = false;
	}
</script>

<svelte:head>
	<title>{m.pay_return_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<div class="flex flex-1 items-center justify-center px-4 py-16">
	<div class="w-full max-w-md rounded-2xl border bg-card p-8 text-center shadow-sm">
		{#if data.status === 'paid'}
			<CircleCheckIcon class="mx-auto mb-4 size-12 text-green-600" />
			<h1 class="mb-2 text-2xl font-bold">{m.pay_return_paid()}</h1>
			<p class="mb-6 text-muted-foreground">{m.pay_return_paid_body()}</p>
		{:else if data.status === 'failed'}
			<CircleXIcon class="mx-auto mb-4 size-12 text-destructive" />
			<h1 class="mb-2 text-2xl font-bold">{m.pay_return_failed()}</h1>
			<p class="mb-6 text-muted-foreground">{m.pay_return_failed_body()}</p>
		{:else}
			<ClockIcon class="mx-auto mb-4 size-12 text-amber-500" />
			<h1 class="mb-2 text-2xl font-bold">{m.pay_return_pending()}</h1>
			<p class="mb-6 text-muted-foreground">{m.pay_return_pending_body()}</p>
			<Button variant="outline" class="mb-3 w-full" onclick={recheck} disabled={checking}>
				{m.pay_return_refresh()}
			</Button>
		{/if}
		<Button href={data.returnPath} class="w-full">{m.pay_return_continue()}</Button>
	</div>
</div>
