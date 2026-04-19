<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Input } from '$lib/components/ui/input';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { MapPin, Phone, Mail, Globe, Search } from '@lucide/svelte';

	let { data } = $props();

	// Local State for filters
	let searchQuery = $state('');
	let selectedCategory = $state('all');

	// Reactive filtered list
	const filteredVendors = $derived(
		data.customersList.filter((vendor) => {
			const matchesSearch =
				vendor.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
				vendor.email?.toLowerCase().includes(searchQuery.toLowerCase());
			const matchesCategory =
				selectedCategory === 'all' || vendor.vendorCategory === selectedCategory;
			return matchesSearch && matchesCategory;
		})
	);

	// Get unique categories for the filter
	const categories = ['all', ...new Set(data.customersList.map((v) => v.vendorCategory))];
</script>

<div class="mx-auto max-w-7xl space-y-8 p-8">
	<div class="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
		<div>
			<h1 class="text-3xl font-extrabold tracking-tight">Vendor Directory</h1>
			<p class="text-muted-foreground">
				Browse and manage our network of {data.customersList.length} partners.
			</p>
		</div>

		<div class="flex flex-col gap-3 sm:flex-row">
			<div class="relative w-full sm:w-64">
				<Search class="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground" />
				<Input placeholder="Search vendors..." bind:value={searchQuery} class="pl-9" />
			</div>

			<select
				bind:value={selectedCategory}
				class="flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:outline-none sm:w-48"
			>
				{#each categories as category}
					<option value={category}>{category?.charAt(0)?.toUpperCase() + category?.slice(1)}</option
					>
				{/each}
			</select>
		</div>
	</div>

	{#if filteredVendors.length > 0}
		<div class="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
			{#each filteredVendors as vendor (vendor.id)}
				<Card.Root class="overflow-hidden border-muted transition-shadow hover:shadow-lg">
					<Card.Header class="bg-muted/20 pb-4">
						<div class="flex items-start justify-between gap-2">
							<div>
								<Card.Title class="text-xl font-bold">{vendor.name}</Card.Title>
								<Badge variant="outline" class="mt-2 bg-background">
									{vendor.vendorCategory}
								</Badge>
							</div>
							<div class="text-right">
								<span class="text-[10px] font-bold text-primary uppercase">
									{vendor.numberOfServices} Services
								</span>
							</div>
						</div>
					</Card.Header>

					<Card.Content class="space-y-4 pt-6">
						<div class="space-y-2 text-sm">
							<div class="flex items-center gap-2 text-muted-foreground">
								<Mail class="size-4" />
								<span class="truncate">{vendor.email ?? 'No email provided'}</span>
							</div>
							<div class="flex items-center gap-2 text-muted-foreground">
								<Phone class="size-4" />
								{vendor.phone}
							</div>
						</div>

						<hr class="border-muted" />

						<div class="space-y-1">
							<div class="flex items-start gap-2">
								<MapPin class="mt-1 size-4 text-primary" />
								<div class="text-sm">
									<p class="font-medium">{vendor.address.subcity}</p>
									<p class="text-xs text-muted-foreground">
										{vendor.address.street}, Kebele {vendor.address.kebele}
									</p>
								</div>
							</div>
						</div>
					</Card.Content>

					<Card.Footer class="flex items-center justify-between border-t bg-muted/10 py-3">
						<span class="text-[11px] text-muted-foreground italic">
							Joined {vendor.createdAt}
						</span>
						<Button variant="ghost" size="sm" href={vendor.address.googleMapsUrl} target="_blank">
							<Globe class="mr-2 size-4" />
							Map
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<div
			class="flex flex-col items-center justify-center rounded-xl border-2 border-dashed py-20 text-center"
		>
			<p class="text-lg font-medium">No vendors match your search</p>
			<Button
				variant="link"
				onclick={() => {
					searchQuery = '';
					selectedCategory = 'all';
				}}
			>
				Clear all filters
			</Button>
		</div>
	{/if}
</div>
