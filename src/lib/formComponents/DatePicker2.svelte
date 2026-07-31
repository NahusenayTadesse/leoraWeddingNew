<script lang="ts">
	import { buttonVariants } from '$lib/components/ui/button/index.js';
	import { Calendar } from '$lib/components/ui/calendar';
	import * as Popover from '$lib/components/ui/popover/index.js';
	import { cn } from '$lib/utils.js';
	import {
		CalendarDate,
		type DateValue,
		getLocalTimeZone,
		today,
		parseDate
	} from '@internationalized/date';
	import { CalendarIcon } from '@lucide/svelte';

	let {
		data = $bindable(),
		oldDays = false,
		futureDays = true,
		year = false,
		placeholder = 'Pick a date'
	}: {
		data: string | null | undefined;
		/** allow dates before today */
		oldDays?: boolean;
		/** allow dates after today */
		futureDays?: boolean;
		year?: boolean;
		placeholder?: string;
	} = $props();

	const ISO = /^\d{4}-\d{2}-\d{2}$/;

	/** Never throws. Tolerates full ISO timestamps, null, empty string, junk. */
	function safeParse(v: unknown): CalendarDate | undefined {
		if (v == null) return undefined;
		const s = String(v).trim().slice(0, 10);
		if (!ISO.test(s)) return undefined;
		try {
			return parseDate(s);
		} catch {
			return undefined;
		}
	}

	const now = today(getLocalTimeZone());
	const minValue = $derived(oldDays ? undefined : now);
	const maxValue = $derived(futureDays ? undefined : now);

	let value = $state<CalendarDate | undefined>(safeParse(data));
	let anchor = $state<DateValue>(safeParse(data) ?? now);

	// prop -> local, guarded so it can't loop
	$effect(() => {
		const incoming = safeParse(data);
		if ((incoming?.toString() ?? '') !== (value?.toString() ?? '')) {
			value = incoming;
			if (incoming) anchor = incoming;
		}
	});

	// local -> prop, only on real interaction (no mount-time dirtying)
	function commit(v: DateValue | undefined) {
		data = v ? v.toString() : '';
	}

	const gregorian = new Intl.DateTimeFormat('en-US', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});
	const ethiopic = new Intl.DateTimeFormat('am-ET-u-ca-ethiopic', {
		year: 'numeric',
		month: 'long',
		day: 'numeric'
	});

	function fmt(f: Intl.DateTimeFormat, d: CalendarDate | undefined) {
		if (!d) return '';
		try {
			return f.format(d.toDate(getLocalTimeZone()));
		} catch {
			return '';
		}
	}

	const label = $derived(value ? fmt(gregorian, value) : placeholder);
	const ethLabel = $derived(fmt(ethiopic, value));
</script>

<Popover.Root>
	<Popover.Trigger
		class={cn(
			buttonVariants({ variant: 'outline', class: 'w-full justify-between font-normal' }),
			!value && 'text-muted-foreground'
		)}
	>
		<span class="flex items-center gap-2 truncate">
			<CalendarIcon class="size-4 shrink-0" />
			<span class="truncate">
				{label}{#if ethLabel}<span class="text-muted-foreground"> · {ethLabel}</span>{/if}
			</span>
		</span>
	</Popover.Trigger>

	<Popover.Content class="w-auto p-0">
		{#if ethLabel}
			<div class="border-b px-3 py-2 text-sm text-muted-foreground">
				Ethiopian date: <span class="font-semibold text-foreground">{ethLabel}</span>
			</div>
		{/if}

		<Calendar
			type="single"
			captionLayout={year ? 'dropdown-years' : 'label'}
			{minValue}
			{maxValue}
			preventDeselect
			bind:value
			bind:placeholder={anchor}
			onValueChange={commit}
		/>
	</Popover.Content>
</Popover.Root>