<script lang="ts">
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import type { Snippet } from 'svelte';

	let {
		title,
		description,
		class: className = '',
		children
	}: { title: string; description?: string; class?: string; children: Snippet } = $props();
</script>

<Card.Root class={className}>
	<Card.Header>
		<Card.Title class="text-base">{title}</Card.Title>
		{#if description}<Card.Description>{description}</Card.Description>{/if}
	</Card.Header>
	<Card.Content>{@render children()}</Card.Content>
</Card.Root>
