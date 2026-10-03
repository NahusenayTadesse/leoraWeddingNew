<script lang="ts">
	import { Input } from '$lib/components/ui/input/index.js';

	/** Client-side text filter for pre-loaded lists. */
	let { value = $bindable(''), placeholder = 'Search…' }: { value?: string; placeholder?: string } = $props();
</script>

<Input bind:value {placeholder} class="max-w-xs" aria-label={placeholder} />
