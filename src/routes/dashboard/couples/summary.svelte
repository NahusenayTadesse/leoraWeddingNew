<script lang="ts">
	import { Calendar, Users, DollarSign, PackageOpen, Info } from '@lucide/svelte';
	import * as Popover from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import { Badge } from '$lib/components/ui/badge';

	let { weddingDate, weddingStyle, totalBudget, expectedGuests, pendingOrders } = $props();

	// Format date nicely
	const formattedDate = $derived(
		new Date(weddingDate).toLocaleDateString('en-US', {
			month: 'long',
			day: 'numeric',
			year: 'numeric'
		})
	);

	// Format currency
	const formattedBudget = $derived(
		new Intl.NumberFormat('en-US', {
			style: 'currency',
			currency: 'ETB'
		}).format(totalBudget)
	);
</script>

<Popover.Root>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button {...props} variant="outline" size="sm" class="gap-2">
				<Info class="h-4 w-4" />
				View Details
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 p-0">
		<div class="flex flex-col p-4 pb-3">
			<h4 class="leading-none font-semibold tracking-tight">{weddingStyle} Wedding</h4>
			<p class="mt-1 text-sm text-muted-foreground">{formattedDate}</p>
		</div>

		<Separator />

		<div class="grid grid-cols-2 gap-4 p-4">
			<div class="flex flex-col gap-1">
				<div
					class="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>
					<Users class="h-3 w-3" /> Guests
				</div>
				<p class="text-lg font-bold">{expectedGuests}</p>
			</div>
			<div class="flex flex-col gap-1">
				<div
					class="flex items-center gap-2 text-xs font-medium tracking-wider text-muted-foreground uppercase"
				>
					<DollarSign class="h-3 w-3" /> Budget
				</div>
				<p class="text-lg font-bold">{formattedBudget}</p>
			</div>
		</div>

		<div class="flex items-center justify-between bg-muted/50 p-4 py-3">
			<div class="flex items-center gap-2 text-sm font-medium text-muted-foreground">
				<PackageOpen class="h-4 w-4" />
				Pending Orders
			</div>
			<Badge variant={pendingOrders > 0 ? 'destructive' : 'secondary'}>
				{pendingOrders}
			</Badge>
		</div>
	</Popover.Content>
</Popover.Root>
