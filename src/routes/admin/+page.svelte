<script lang="ts">
	import * as Card from '$lib/components/ui/card/index.js';
	import { Building2, Hourglass, CreditCard, Users } from '@lucide/svelte';

	let { data } = $props();

	const tiles = $derived([
		{ label: 'Pending vendors', value: data.stats.pendingVendors, icon: Hourglass, href: '/admin/vendors' },
		{ label: 'Approved vendors', value: data.stats.approvedVendors, icon: Building2, href: '/admin/vendors' },
		{ label: 'Subscription plans', value: data.stats.planCount, icon: CreditCard, href: '/admin/subscriptions' },
		{ label: 'Active subscribers', value: data.stats.activeSubscribers, icon: Users, href: '/admin/subscriptions' }
	]);
</script>

<svelte:head>
	<title>Admin Console — Leora</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">Admin console</h1>
		<p class="text-muted-foreground text-sm">Vendor approvals and subscription plan pricing.</p>
	</div>

	<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
		{#each tiles as tile (tile.label)}
			<a href={tile.href}>
				<Card.Root class="hover:border-primary/50 transition-colors">
					<Card.Content class="flex items-center gap-4 py-6">
						<tile.icon class="text-muted-foreground size-8" />
						<div>
							<p class="text-2xl font-bold">{tile.value}</p>
							<p class="text-muted-foreground text-sm">{tile.label}</p>
						</div>
					</Card.Content>
				</Card.Root>
			</a>
		{/each}
	</div>
</div>
