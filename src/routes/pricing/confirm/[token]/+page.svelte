<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { CircleCheck, CircleX, Clock } from '@lucide/svelte';
	import { formatETB } from '$lib/money';

	let { data } = $props();
</script>

<div class="mx-auto max-w-2xl px-4 py-16 text-center">
	{#if data.status === 'completed'}
		<CircleCheck class="mx-auto size-16 text-emerald-600" />
		<h1 class="mt-4 text-2xl font-semibold tracking-tight">You're upgraded</h1>
		<p class="text-muted-foreground mt-2">
			Your {data.planName} plan is active — {formatETB(data.amount)} charged.
		</p>
		<div class="mt-8 flex justify-center gap-3">
			<Button href="/dashboard">Go to your dashboard</Button>
		</div>
	{:else if data.status === 'failed'}
		<CircleX class="text-destructive mx-auto size-16" />
		<h1 class="mt-4 text-2xl font-semibold tracking-tight">Payment failed</h1>
		<p class="text-muted-foreground mt-2">
			The {data.planName} upgrade wasn't paid. No charge was made — you can try again.
		</p>
		<div class="mt-8 flex justify-center gap-3">
			<Button href="/pricing">Back to pricing</Button>
		</div>
	{:else}
		<Clock class="mx-auto size-16 text-amber-500" />
		<h1 class="mt-4 text-2xl font-semibold tracking-tight">Payment still processing</h1>
		<p class="text-muted-foreground mt-2">
			We haven't heard back from Chapa yet for your {data.planName} upgrade. Refresh this page in
			a moment.
		</p>
		<div class="mt-8 flex justify-center gap-3">
			<Button onclick={() => location.reload()}>Refresh</Button>
		</div>
	{/if}
</div>
