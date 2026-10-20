<script lang="ts">
	import { ChevronLeftIcon, ChevronRightIcon } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';

	/**
	 * A month of days coloured by state. Read-only on a vendor's public page; with `onToggle`,
	 * the vendor's own calendar, where tapping a free or blocked day flips it.
	 */
	type Props = {
		/** First day of the shown month, `YYYY-MM-01`. */
		month: string;
		blocked: string[];
		booked: string[];
		onMonth: (month: string) => void;
		onToggle?: (day: string) => void;
		/** Days currently being saved. */
		pending?: string[];
	};

	let { month, blocked, booked, onMonth, onToggle, pending = [] }: Props = $props();

	const pad = (n: number) => String(n).padStart(2, '0');
	const iso = (y: number, mo: number, d: number) => `${y}-${pad(mo + 1)}-${pad(d)}`;
	const today = (() => {
		const d = new Date();
		return iso(d.getFullYear(), d.getMonth(), d.getDate());
	})();

	const view = $derived.by(() => {
		const [y, mo] = month.split('-').map(Number);
		const first = new Date(y, mo - 1, 1);
		const daysIn = new Date(y, mo, 0).getDate();
		// Monday-first grid.
		const lead = (first.getDay() + 6) % 7;
		const cells: (string | null)[] = Array(lead).fill(null);
		for (let d = 1; d <= daysIn; d++) cells.push(iso(y, mo - 1, d));
		return {
			cells,
			label: first.toLocaleDateString(getLocale() === 'am' ? 'am-ET' : 'en-GB', {
				month: 'long',
				year: 'numeric'
			}),
			prev: iso(mo === 1 ? y - 1 : y, mo === 1 ? 11 : mo - 2, 1),
			next: iso(mo === 12 ? y + 1 : y, mo === 12 ? 0 : mo, 1)
		};
	});

	const blockedSet = $derived(new Set(blocked));
	const bookedSet = $derived(new Set(booked));
	const weekdays = $derived(
		Array.from({ length: 7 }, (_, i) =>
			new Date(2024, 0, 1 + i).toLocaleDateString(getLocale() === 'am' ? 'am-ET' : 'en-GB', {
				weekday: 'short'
			})
		)
	);
</script>

<div class="rounded-xl border p-4">
	<div class="mb-3 flex items-center justify-between">
		<button
			type="button"
			class="rounded-md p-1.5 hover:bg-muted"
			onclick={() => onMonth(view.prev)}
			aria-label={m.avail_prev()}
		>
			<ChevronLeftIcon class="size-4" />
		</button>
		<p class="font-semibold">{view.label}</p>
		<button
			type="button"
			class="rounded-md p-1.5 hover:bg-muted"
			onclick={() => onMonth(view.next)}
			aria-label={m.avail_next()}
		>
			<ChevronRightIcon class="size-4" />
		</button>
	</div>

	<div class="grid grid-cols-7 gap-1 text-center text-xs">
		{#each weekdays as w (w)}
			<div class="py-1 font-medium text-muted-foreground">{w}</div>
		{/each}
		{#each view.cells as day, i (day ?? `blank-${i}`)}
			{#if !day}
				<div></div>
			{:else}
				{@const isBooked = bookedSet.has(day)}
				{@const isBlocked = blockedSet.has(day)}
				{@const past = day < today}
				{@const state = isBooked
					? m.avail_booked()
					: isBlocked
						? m.avail_blocked()
						: m.avail_free()}
				<button
					type="button"
					disabled={!onToggle || past || isBooked || pending.includes(day)}
					onclick={() => onToggle?.(day)}
					title="{day}: {state}"
					aria-label="{day}: {state}"
					class={[
						'aspect-square rounded-md text-sm tabular-nums transition-colors disabled:cursor-default',
						past && 'opacity-40',
						isBooked
							? 'bg-(--leora-gold) font-semibold text-black'
							: isBlocked
								? 'bg-muted text-muted-foreground line-through'
								: 'hover:bg-accent',
						day === today && 'ring-1 ring-foreground/40',
						pending.includes(day) && 'animate-pulse'
					]}
				>
					{Number(day.slice(8))}
				</button>
			{/if}
		{/each}
	</div>

	<div class="mt-3 flex flex-wrap gap-4 text-xs text-muted-foreground">
		<span class="flex items-center gap-1.5"
			><span class="size-3 rounded-sm bg-(--leora-gold)"></span>{m.avail_booked()}</span
		>
		<span class="flex items-center gap-1.5"
			><span class="size-3 rounded-sm bg-muted"></span>{m.avail_blocked()}</span
		>
		<span class="flex items-center gap-1.5"
			><span class="size-3 rounded-sm border"></span>{m.avail_free()}</span
		>
	</div>
</div>
