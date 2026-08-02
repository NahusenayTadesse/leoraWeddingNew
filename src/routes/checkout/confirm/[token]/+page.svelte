<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CircleCheck, CircleX, Clock, Package } from '@lucide/svelte';
	import { formatETB } from '$lib/money';

	let { data } = $props();
</script>

<div class="mx-auto max-w-2xl px-4 py-16 text-center">
	{#if data.status === 'paid'}
		<CircleCheck class="mx-auto size-16 text-emerald-600" />
		<h1 class="mt-4 text-2xl font-semibold tracking-tight">Payment successful</h1>
		<p class="text-muted-foreground mt-2">
			Order #{data.orderId} is confirmed. The vendors will be in touch shortly.
		</p>
	{:else if data.status === 'failed'}
		<CircleX class="text-destructive mx-auto size-16" />
		<h1 class="mt-4 text-2xl font-semibold tracking-tight">Payment failed</h1>
		<p class="text-muted-foreground mt-2">
			Order #{data.orderId} was not paid. No charge was made — you can try again from your cart.
		</p>
	{:else}
		<Clock class="mx-auto size-16 text-amber-500" />
		<h1 class="mt-4 text-2xl font-semibold tracking-tight">Payment still processing</h1>
		<p class="text-muted-foreground mt-2">
			We haven't heard back from Chapa yet for order #{data.orderId}. Refresh this page in a
			moment.
		</p>
	{/if}

	{#if data.items.length > 0}
		<div class="mt-8 rounded-xl border bg-card p-6 text-left">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-semibold">
				<Package class="size-5" /> Order summary
			</h2>
			<ul class="divide-y">
				{#each data.items as item (item.id)}
					<li class="flex items-center justify-between gap-3 py-3">
						<div class="min-w-0">
							<p class="truncate font-medium">{item.serviceTitle ?? 'Service'}</p>
							<p class="text-muted-foreground text-sm">
								{item.vendorName} · {item.amount} · x{item.quantity}
							</p>
						</div>
						<span class="shrink-0 font-medium">{formatETB(item.price * item.quantity)}</span>
					</li>
				{/each}
			</ul>
			<div class="mt-4 flex items-center justify-between border-t pt-4 text-lg font-semibold">
				<span>Total</span>
				<span>{formatETB(data.total)}</span>
			</div>
		</div>
	{/if}

	<div class="mt-8 flex justify-center gap-3">
		{#if data.status === 'failed'}
			<Button href="/checkout">Try again</Button>
		{:else if data.status === 'pending'}
			<Button onclick={() => location.reload()}>Refresh</Button>
		{/if}
		<Button href="/shop" variant="outline">Continue browsing</Button>
	</div>
</div>
