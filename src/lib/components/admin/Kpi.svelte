<script lang="ts">
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import type { Component } from 'svelte';

	let {
		label,
		value,
		hint,
		icon: Icon,
		href,
		alert = false,
		delta = undefined
	}: {
		label: string;
		value: string | number;
		hint?: string;
		icon?: Component<{ class?: string }>;
		href?: string;
		alert?: boolean;
		/** Percent change against the previous period; null when there is nothing to compare. */
		delta?: number | null;
	} = $props();
</script>

<svelte:element this={href ? 'a' : 'div'} {href} class="block">
	<Card.Root
		class="h-full transition-colors hover:border-primary/50 {alert ? 'border-amber-500/60' : ''}"
	>
		<Card.Content class="flex items-start justify-between gap-3 py-5">
			<div class="min-w-0">
				<p class="text-xs font-medium tracking-wide text-muted-foreground uppercase">{label}</p>
				<p class="mt-1 text-xl font-bold break-words sm:text-2xl">{value}</p>
				{#if hint}<p class="mt-1 text-xs text-muted-foreground">{hint}</p>{/if}
				{#if delta !== undefined}
					<p
						class={[
							'mt-1 text-xs font-medium',
							delta === null || delta === 0
								? 'text-muted-foreground'
								: delta > 0
									? 'text-emerald-600'
									: 'text-destructive'
						]}
					>
						{delta === null
							? 'New this month'
							: `${delta > 0 ? '↑' : delta < 0 ? '↓' : '→'} ${Math.abs(delta)}%`}
						<span class="font-normal text-muted-foreground">vs previous 30 days</span>
					</p>
				{/if}
			</div>
			{#if Icon}<Icon class="size-6 shrink-0 text-muted-foreground" />{/if}
		</Card.Content>
	</Card.Root>
</svelte:element>
