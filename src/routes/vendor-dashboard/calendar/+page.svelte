<script lang="ts">
	import Comp from './comp.svelte';
	let { data } = $props();

	import { getLocalTimeZone, today } from '@internationalized/date';
	import { Calendar } from '$lib/components/ui/calendar/index.js';

	let value = $derived([today(getLocalTimeZone())]);
</script>

<Calendar
	type="multiple"
	bind:value
	class="justify-self-center rounded-md border shadow-sm"
	captionLayout="dropdown"
/>
<Comp availability={data?.available} />
