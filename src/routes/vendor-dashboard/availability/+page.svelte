<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import { goto } from '$app/navigation';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import AvailabilityCalendar from '$lib/components/AvailabilityCalendar.svelte';

	let { data } = $props();

	let pending = $state<string[]>([]);

	function showMonth(month: string) {
		goto(`?month=${month.slice(0, 7)}`, { keepFocus: true, noScroll: true, replaceState: true });
	}

	/** Posts one day to `?/toggle`; the calendar updates from the reloaded data. */
	async function toggle(day: string) {
		pending = [...pending, day];
		const body = new FormData();
		body.set('day', day);
		try {
			const res = await fetch('?/toggle', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
			const result = deserialize(await res.text());
			if (result.type === 'failure') {
				toast.error((result.data as { message?: { text: string } })?.message?.text ?? 'Could not save');
			}
			await invalidateAll();
		} finally {
			pending = pending.filter((d) => d !== day);
		}
	}
</script>

<div class="space-y-6">
	<PageHeader
		title="Availability"
		tabTitle="Availability — Vendor Dashboard"
		description="Tap a day to mark it unavailable (or available again). Days with a confirmed booking are shown in gold. Couples see this on your public page and can't request blocked days."
	/>

	<div class="max-w-md">
		<AvailabilityCalendar
			month={data.month}
			blocked={data.blocked}
			booked={data.booked}
			onMonth={showMonth}
			onToggle={toggle}
			{pending}
		/>
	</div>
</div>
