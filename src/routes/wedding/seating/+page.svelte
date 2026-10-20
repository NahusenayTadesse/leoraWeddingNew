<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { XIcon } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	type Guest = (typeof data.unseated)[number];

	/** Submits the form a select lives in as soon as a table is chosen. */
	function submitOnChange(e: Event) {
		(e.currentTarget as HTMLSelectElement).form?.requestSubmit();
	}

	const label = (g: Guest) => (g.plusOnes ? `${g.fullName} +${g.plusOnes}` : g.fullName);
	const totalGuests = $derived(
		data.tables.reduce((n, t) => n + t.guests.length, 0) + data.unseated.length
	);
</script>

<svelte:head>
	<title>{m.seating_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.seating_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.seating_sub()}</p>
	</div>

	<Card.Root class="p-4">
		<ActionForm action="?/addTables" class="flex flex-wrap items-end gap-3">
			{#snippet children({ busy })}
				<label class="space-y-1.5 text-sm font-medium">
					<span>{m.seating_count()}</span>
					<input
						name="count"
						type="number"
						min="1"
						max="50"
						value="1"
						class="h-10 w-24 rounded-md border bg-background px-3"
					/>
				</label>
				<label class="space-y-1.5 text-sm font-medium">
					<span>{m.seating_capacity()}</span>
					<input
						name="capacity"
						type="number"
						min="1"
						max="50"
						value="8"
						class="h-10 w-24 rounded-md border bg-background px-3"
					/>
				</label>
				<input type="hidden" name="prefix" value={m.seating_table()} />
				<Button type="submit" disabled={!!busy}>{m.seating_add_tables()}</Button>
			{/snippet}
		</ActionForm>
	</Card.Root>

	{#if totalGuests === 0}
		<p class="text-sm text-muted-foreground">
			<a href="/wedding/guests" class="underline">{m.seating_no_guests()}</a>
		</p>
	{/if}

	<div class="grid gap-6 lg:grid-cols-[280px_1fr]">
		<!-- Unseated guests -->
		<Card.Root class="h-fit p-4">
			<h2 class="mb-3 font-medium">{m.seating_unseated({ count: data.unseated.length })}</h2>
			{#if data.unseated.length === 0}
				<p class="text-sm text-muted-foreground">{m.seating_all_seated()}</p>
			{:else}
				<ul class="space-y-2">
					{#each data.unseated as guest (guest.id)}
						<li class="space-y-1">
							<p class="text-sm">{label(guest)}</p>
							{#if data.tables.length}
								<ActionForm action="?/seat" fields={{ guestId: guest.id }}>
									<select
										name="tableId"
										onchange={submitOnChange}
										aria-label="{m.seating_seat_at()} {guest.fullName}"
										class="h-8 w-full rounded-md border bg-background px-2 text-sm"
									>
										<option value="">{m.seating_seat_at()}</option>
										{#each data.tables as table (table.id)}
											<option
												value={table.id}
												disabled={table.used + 1 + guest.plusOnes > table.capacity}
											>
												{table.name} ({table.used}/{table.capacity})
											</option>
										{/each}
									</select>
								</ActionForm>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Root>

		<!-- Tables -->
		<div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
			{#each data.tables as table (table.id)}
				<Card.Root class="p-4">
					<ActionForm action="?/updateTable" fields={{ id: table.id }} class="mb-3 flex gap-2">
						{#snippet children({ busy })}
							<input
								name="name"
								value={table.name}
								maxlength="50"
								aria-label={m.seating_table()}
								class="h-9 min-w-0 flex-1 rounded-md border bg-background px-2 font-medium"
							/>
							<input
								name="capacity"
								type="number"
								min="1"
								max="50"
								value={table.capacity}
								aria-label={m.seating_capacity()}
								class="h-9 w-16 rounded-md border bg-background px-2"
							/>
							<Button type="submit" size="sm" variant="outline" disabled={!!busy}>✓</Button>
						{/snippet}
					</ActionForm>
					<div class="mb-2 flex items-center justify-between text-xs text-muted-foreground">
						<span>{m.seating_seats({ used: table.used, capacity: table.capacity })}</span>
						{#if table.used > table.capacity}
							<Badge variant="destructive">{m.seating_over()}</Badge>
						{:else if table.used === table.capacity}
							<Badge variant="secondary">{m.seating_full()}</Badge>
						{/if}
					</div>
					<ul class="mb-3 space-y-1">
						{#each table.guests as guest (guest.id)}
							<li class="flex items-center justify-between gap-2 text-sm">
								<span class="truncate">{label(guest)}</span>
								<ActionForm action="?/seat" fields={{ guestId: guest.id, tableId: '' }}>
									<button
										type="submit"
										class="rounded p-1 text-muted-foreground hover:bg-muted"
										aria-label="{m.seating_unseat()} {guest.fullName}"
										title={m.seating_unseat()}
									>
										<XIcon class="size-3.5" />
									</button>
								</ActionForm>
							</li>
						{/each}
					</ul>
					<ConfirmAction
						action="?/removeTable"
						fields={{ id: table.id }}
						label={m.seating_remove_table()}
						variant="outline"
						title="{m.seating_remove_table()}: {table.name}?"
					/>
				</Card.Root>
			{/each}
		</div>
	</div>
</div>
