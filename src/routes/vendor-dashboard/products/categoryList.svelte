<script lang="ts">
	import { Popover, PopoverContent, PopoverTrigger } from '$lib/components/ui/popover';
	import { Button } from '$lib/components/ui/button';
	import { ChevronDownIcon } from '@lucide/svelte';

	type SubItem = {
		id: number;
		name: string;
		description: string | null;
		serviceId: number;
	};

	const { subList = [] }: { subList: SubItem[] } = $props();
</script>

<Popover>
	<PopoverTrigger>
		{#snippet child({ props })}
			<Button variant="outline" size="sm" {...props} class="gap-2">
				View Subcategories
				<ChevronDownIcon class="size-4" />
			</Button>
		{/snippet}
	</PopoverTrigger>
	<PopoverContent class="w-56 p-0">
		<div class="flex flex-col divide-y">
			<div class="px-4 py-3">
				<p class="text-sm font-semibold text-foreground">Available Subcategories</p>
			</div>
			<div class="max-h-64 overflow-y-auto">
				{#if subList.length > 0}
					{#each subList as price (price.id)}
						<div
							class="flex flex-col items-start justify-between gap-2 px-4 py-2.5 transition-colors hover:bg-muted/50"
						>
							<span class="text-sm text-primary">{price.name}: </span>
							<span class="text-sm font-semibold">{price.description}</span>
						</div>
					{/each}
				{:else}
					<div class="px-4 py-6 text-center">
						<p class="text-sm text-muted-foreground">No Sub Category Available</p>
					</div>
				{/if}
			</div>
		</div>
	</PopoverContent>
</Popover>
