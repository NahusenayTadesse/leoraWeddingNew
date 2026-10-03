<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Input } from '$lib/components/ui/input/index.js';

	let { data } = $props();
</script>

<div class="space-y-6">
	<PageHeader title="Settings" description="Platform-wide business rules." />

	<Card.Root class="max-w-xl">
		<Card.Header>
			<Card.Title class="text-base">Marketplace commission</Card.Title>
			<Card.Description>
				Taken from each confirmed vendor payment.
				{#if data.commission}Currently {data.commission.value}{data.commission.type === 'percentage' ? '%' : ' ETB flat'}.{:else}Not configured yet.{/if}
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<ActionForm action="?/commission" label="Save" variant="default" size="default">
				<select name="type" class="border-input bg-background h-9 rounded-md border px-3 text-sm" aria-label="Commission type">
					<option value="percentage" selected={data.commission?.type !== 'fixed'}>Percentage</option>
					<option value="fixed" selected={data.commission?.type === 'fixed'}>Fixed (ETB)</option>
				</select>
				<Input name="value" type="number" step="0.01" min="0" required value={data.commission?.value ?? 10} class="w-28" aria-label="Commission value" />
			</ActionForm>
		</Card.Content>
	</Card.Root>

	<p class="text-muted-foreground text-sm">
		Subscription plan prices live under <a href="/admin/subscriptions" class="underline">Subscriptions</a>; coupons under <a href="/admin/coupons" class="underline">Coupons</a>.
	</p>
</div>
