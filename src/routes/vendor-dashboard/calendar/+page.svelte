<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { enhance } from '$app/forms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import { ChevronLeft, ChevronRight, CircleCheck, CircleAlert, Trash2 } from '@lucide/svelte';

	let { data } = $props();

	const statusItems = [
		{ value: 'blocked', label: 'Block (unavailable)' },
		{ value: 'available', label: 'Mark available' },
		{ value: 'clear', label: 'Clear (back to default)' }
	];

	const bulk = superForm(data.bulkForm, { id: 'bulk', resetForm: false, invalidateAll: true });
	const { form: bulkData, errors: bulkErrors, enhance: bulkEnhance, submitting: bulkBusy, message: bulkMsg } = bulk;

	const range = superForm(data.rangeForm, { id: 'range', resetForm: false, invalidateAll: true });
	const { form: rangeData, errors: rangeErrors, enhance: rangeEnhance, submitting: rangeBusy, message: rangeMsg } = range;

	const WEEKDAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
	const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December'];

	const availabilityMap = $derived(
		new Map(data.availability.map((a) => [a.date, a]))
	);

	const bookingMap = $derived.by(() => {
		const m = new Map<string, typeof data.bookings>();
		for (const b of data.bookings) {
			if (!m.has(b.date)) m.set(b.date, []);
			m.get(b.date)!.push(b);
		}
		return m;
	});

	type Cell = {
		date: string;
		day: number;
		state: 'unset' | 'blocked' | 'available' | 'booked';
		past: boolean;
		isToday: boolean;
		bookings: typeof data.bookings;
	};

	const cells = $derived.by(() => {
		const { year, monthIndex, daysInMonth } = data.window;
		// Monday-first offset
		const lead = (new Date(Date.UTC(year, monthIndex, 1)).getUTCDay() + 6) % 7;
		const out: (Cell | null)[] = Array(lead).fill(null);

		for (let d = 1; d <= daysInMonth; d++) {
			const date = `${data.window.month}-${String(d).padStart(2, '0')}`;
			const booked = bookingMap.get(date) ?? [];
			const row = availabilityMap.get(date);
			let state: Cell['state'] = 'unset';
			if (booked.length) state = 'booked';
			else if (row) state = row.isAvailable ? 'available' : 'blocked';

			out.push({
				date,
				day: d,
				state,
				past: date < data.today,
				isToday: date === data.today,
				bookings: booked
			});
		}
		while (out.length % 7 !== 0) out.push(null);
		return out;
	});

	const monthLabel = $derived(`${MONTHS[data.window.monthIndex]} ${data.window.year}`);

	function cellClass(c: Cell) {
		const base =
			'relative flex h-20 w-full flex-col items-start justify-between rounded-md border p-2 text-left text-sm transition-colors focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none';
		if (c.past) return `${base} cursor-not-allowed border-dashed bg-muted/40 text-muted-foreground`;
		if (c.state === 'booked') return `${base} cursor-not-allowed border-primary bg-primary/15 text-primary`;
		if (c.state === 'blocked') return `${base} border-destructive/40 bg-destructive/10 text-destructive hover:bg-destructive/20`;
		if (c.state === 'available') return `${base} border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20`;
		return `${base} border-border bg-card hover:bg-accent hover:text-accent-foreground`;
	}
</script>

<div class="flex w-full flex-col gap-6 p-4 md:p-6">
	<div class="flex flex-wrap items-center justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Schedule</h1>
			<p class="text-sm text-muted-foreground">
				Manage the days {data.vendor.businessName} can take work.
			</p>
		</div>

		<div class="flex items-center gap-2">
			<Button variant="outline" size="icon" href="?month={data.window.prev}" aria-label="Previous month">
				<ChevronLeft class="size-4" />
			</Button>
			<span class="min-w-40 text-center font-medium">{monthLabel}</span>
			<Button variant="outline" size="icon" href="?month={data.window.next}" aria-label="Next month">
				<ChevronRight class="size-4" />
			</Button>
		</div>
	</div>

	<div class="flex flex-wrap items-center gap-4 text-xs text-muted-foreground">
		<span class="flex items-center gap-2"><span class="size-3 rounded-sm border bg-card"></span> Open (default)</span>
		<span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-emerald-500/40"></span> Confirmed open</span>
		<span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-destructive/40"></span> Blocked</span>
		<span class="flex items-center gap-2"><span class="size-3 rounded-sm bg-primary/40"></span> Booked (locked)</span>
	</div>

	<div class="grid gap-6 lg:grid-cols-[1fr_22rem]">
		<!-- Calendar -->
		<Card.Root>
			<Card.Content class="p-3 md:p-4">
				<div class="mb-2 grid grid-cols-7 gap-1 text-center text-xs font-medium text-muted-foreground">
					{#each WEEKDAYS as d (d)}<div>{d}</div>{/each}
				</div>

				<div class="grid grid-cols-7 gap-1">
					{#each cells as cell, i (cell?.date ?? `pad-${i}`)}
						{#if !cell}
							<div class="h-20 rounded-md bg-transparent"></div>
						{:else if cell.past || cell.state === 'booked'}
							<div class={cellClass(cell)}>
								<span class="font-medium" class:underline={cell.isToday}>{cell.day}</span>
								{#if cell.bookings.length}
									<span class="line-clamp-2 text-[10px] leading-tight">
										{cell.bookings[0].groomName ?? 'Booking'} &amp; {cell.bookings[0].brideName ?? ''}
										{#if cell.bookings.length > 1}<br />+{cell.bookings.length - 1} more{/if}
									</span>
								{/if}
							</div>
						{:else}
							<form method="POST" action="?/cycle" use:enhance class="contents">
								<input type="hidden" name="date" value={cell.date} />
								<button type="submit" class={cellClass(cell)} title="Click to change status">
									<span class="font-medium" class:underline={cell.isToday}>{cell.day}</span>
									<span class="text-[10px] uppercase tracking-wide">
										{cell.state === 'blocked' ? 'Blocked' : cell.state === 'available' ? 'Open' : ''}
									</span>
								</button>
							</form>
						{/if}
					{/each}
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Side panel -->
		<div class="flex flex-col gap-6">
			<Card.Root>
				<Card.Header>
					<Card.Title>Pick specific dates</Card.Title>
					<Card.Description>Select several days, then apply one status to all of them.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" action="?/setDates" use:bulkEnhance class="flex flex-col gap-2">
						<InputComp
							label="Dates"
							form={bulkData}
							errors={bulkErrors}
							name="dates"
							type="dateMultiple"
							oldDays={false}
							futureDays={true}
							year={true}
						/>
						<InputComp
							label="Status"
							form={bulkData}
							errors={bulkErrors}
							name="status"
							type="select"
							items={statusItems}
						/>
						<Button type="submit" class="mt-2 w-full" disabled={$bulkBusy}>
							{$bulkBusy ? 'Saving…' : 'Apply to selected dates'}
						</Button>

						{#if $bulkMsg}
							<p
								class="flex items-center gap-2 text-sm"
								class:text-destructive={$bulkMsg.type === 'error'}
								class:text-emerald-600={$bulkMsg.type === 'success'}
							>
								{#if $bulkMsg.type === 'error'}<CircleAlert class="size-4" />{:else}<CircleCheck class="size-4" />{/if}
								{$bulkMsg.text}
							</p>
						{/if}
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Block a range</Card.Title>
					<Card.Description>For holidays, travel, or a full season off.</Card.Description>
				</Card.Header>
				<Card.Content>
					<form method="POST" action="?/setRange" use:rangeEnhance class="flex flex-col gap-2">
						<InputComp
							label="From"
							form={rangeData}
							errors={rangeErrors}
							name="from"
							type="date"
							oldDays={false}
							futureDays={true}
							year={true}
						/>
						<InputComp
							label="To"
							form={rangeData}
							errors={rangeErrors}
							name="to"
							type="date"
							oldDays={false}
							futureDays={true}
							year={true}
						/>
						<InputComp
							label="Status"
							form={rangeData}
							errors={rangeErrors}
							name="status"
							type="select"
							items={statusItems}
						/>
						<InputComp
							label=""
							form={rangeData}
							errors={rangeErrors}
							name="weekendsOnly"
							type="checkboxSingle"
							placeholder="Weekends only"
						/>
						<Button type="submit" class="mt-2 w-full" disabled={$rangeBusy}>
							{$rangeBusy ? 'Saving…' : 'Apply to range'}
						</Button>

						{#if $rangeMsg}
							<p
								class="flex items-center gap-2 text-sm"
								class:text-destructive={$rangeMsg.type === 'error'}
								class:text-emerald-600={$rangeMsg.type === 'success'}
							>
								{#if $rangeMsg.type === 'error'}<CircleAlert class="size-4" />{:else}<CircleCheck class="size-4" />{/if}
								{$rangeMsg.text}
							</p>
						{/if}
					</form>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>Upcoming blocked days</Card.Title>
				</Card.Header>
				<Card.Content class="flex flex-col gap-1">
					{#if !data.upcomingBlocks.length}
						<p class="text-sm text-muted-foreground">Nothing blocked ahead — you're open for business.</p>
					{:else}
						{#each data.upcomingBlocks as b (b.id)}
							<div class="flex items-center justify-between rounded-md px-2 py-1 hover:bg-muted">
								<span class="text-sm">{b.date}</span>
								<form method="POST" action="?/remove" use:enhance>
									<input type="hidden" name="id" value={b.id} />
									<Button type="submit" variant="ghost" size="icon" aria-label="Unblock {b.date}">
										<Trash2 class="size-4 text-destructive" />
									</Button>
								</form>
							</div>
						{/each}
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>