<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import { CalendarHeartIcon, MapPinIcon, PlusIcon, PencilIcon } from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';

	let { data } = $props();

	type Event = (typeof data.events)[number];

	const TYPES = [
		['engagement', m.event_type_engagement()],
		['shimgelegna', m.event_type_shimgelegna()],
		['gebez_enshoshela', m.event_type_gebez_enshoshela()],
		['ceremony', m.event_type_ceremony()],
		['melse', m.event_type_melse()],
		['kilikil', m.event_type_kilikil()],
		['reception', m.event_type_reception()],
		['other', m.event_type_other()]
	] as const;
	const typeLabel = (t: string) => TYPES.find(([v]) => v === t)?.[1] ?? t;

	/** null: closed; 'new': adding; an event: editing it. */
	let editing = $state<Event | 'new' | null>(null);
	const current = $derived(editing && editing !== 'new' ? editing : null);

	/** `datetime-local` value in Addis Ababa time (UTC+3), matching how the server reads it. */
	function localInput(d: Date | string | null) {
		if (!d) return '';
		return new Date(new Date(d).getTime() + 3 * 3600_000).toISOString().slice(0, 16);
	}

	const when = (d: Date | string | null) =>
		d
			? new Date(d).toLocaleString(getLocale() === 'am' ? 'am-ET' : 'en-GB', {
					weekday: 'short',
					day: 'numeric',
					month: 'short',
					year: 'numeric',
					hour: '2-digit',
					minute: '2-digit',
					timeZone: 'Africa/Addis_Ababa'
				})
			: '';
</script>

<svelte:head>
	<title>{m.events_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.events_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.events_sub()}</p>
		</div>
		<Button onclick={() => (editing = 'new')}>
			<PlusIcon class="mr-2 size-4" />{m.events_add()}
		</Button>
	</div>

	{#if data.events.length === 0}
		<Card.Root class="p-10 text-center text-sm text-muted-foreground">{m.events_empty()}</Card.Root>
	{:else}
		<ol class="relative space-y-4 border-l pl-6">
			{#each data.events as event (event.id)}
				<li class="relative">
					<span
						class="absolute top-5 -left-[31px] size-3 rounded-full border-2 border-background bg-(--leora-gold)"
					></span>
					<Card.Root class="p-5">
						<div class="flex flex-wrap items-start justify-between gap-3">
							<div class="min-w-0 space-y-1">
								<p class="text-xs font-semibold tracking-wide text-(--leora-gold-dark) uppercase">
									{typeLabel(event.eventType)}
								</p>
								<h2 class="text-lg font-medium">{event.eventName}</h2>
								{#if event.eventDate}
									<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
										<CalendarHeartIcon class="size-4" />{when(event.eventDate)}
									</p>
								{/if}
								{#if event.venueName || event.city}
									<p class="flex items-center gap-1.5 text-sm text-muted-foreground">
										<MapPinIcon class="size-4" />
										{[event.venueName, event.venueAddress, event.city].filter(Boolean).join(', ')}
									</p>
								{/if}
								{#if event.notes}<p class="pt-1 text-sm whitespace-pre-line">{event.notes}</p>{/if}
							</div>
							<div class="flex gap-2">
								<Button variant="ghost" size="sm" onclick={() => (editing = event)}>
									<PencilIcon class="size-4" />
								</Button>
								<ConfirmAction
									action="?/remove"
									fields={{ id: event.id }}
									label={m.events_delete()}
									variant="outline"
									title={m.events_delete_confirm()}
								/>
							</div>
						</div>
					</Card.Root>
				</li>
			{/each}
		</ol>
	{/if}
</div>

<Dialog.Root open={editing !== null} onOpenChange={(open) => !open && (editing = null)}>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{current ? m.events_edit() : m.events_add()}</Dialog.Title>
		</Dialog.Header>
		{#if editing !== null}
			{#key current?.id ?? 'new'}
				<ActionForm
					action={current ? '?/edit' : '?/add'}
					fields={current ? { id: current.id } : {}}
					onDone={() => (editing = null)}
					class="space-y-3"
				>
					{#snippet children({ busy })}
						<div class="grid gap-3 sm:grid-cols-2">
							<label class="space-y-1.5 text-sm font-medium">
								<span>{m.events_type()}</span>
								<select
									name="eventType"
									value={current?.eventType ?? 'ceremony'}
									class="h-10 w-full rounded-md border bg-background px-3"
								>
									{#each TYPES as [value, label] (value)}
										<option {value}>{label}</option>
									{/each}
								</select>
							</label>
							<label class="space-y-1.5 text-sm font-medium">
								<span>{m.events_name()}</span>
								<input
									name="eventName"
									required
									minlength="2"
									maxlength="150"
									value={current?.eventName ?? ''}
									class="h-10 w-full rounded-md border bg-background px-3"
								/>
							</label>
						</div>
						<label class="block space-y-1.5 text-sm font-medium">
							<span>{m.events_date()}</span>
							<input
								name="eventDate"
								type="datetime-local"
								value={localInput(current?.eventDate ?? null)}
								class="h-10 w-full rounded-md border bg-background px-3"
							/>
						</label>
						<div class="grid gap-3 sm:grid-cols-2">
							<label class="space-y-1.5 text-sm font-medium">
								<span>{m.events_venue()}</span>
								<input
									name="venueName"
									maxlength="150"
									value={current?.venueName ?? ''}
									class="h-10 w-full rounded-md border bg-background px-3"
								/>
							</label>
							<label class="space-y-1.5 text-sm font-medium">
								<span>{m.events_city()}</span>
								<input
									name="city"
									maxlength="100"
									value={current?.city ?? ''}
									class="h-10 w-full rounded-md border bg-background px-3"
								/>
							</label>
						</div>
						<label class="block space-y-1.5 text-sm font-medium">
							<span>{m.events_address()}</span>
							<input
								name="venueAddress"
								maxlength="255"
								value={current?.venueAddress ?? ''}
								class="h-10 w-full rounded-md border bg-background px-3"
							/>
						</label>
						<label class="block space-y-1.5 text-sm font-medium">
							<span>{m.events_notes()}</span>
							<textarea
								name="notes"
								rows="3"
								maxlength="2000"
								class="w-full rounded-md border bg-background p-2">{current?.notes ?? ''}</textarea
							>
						</label>
						<Dialog.Footer>
							<Button type="submit" disabled={!!busy}>{m.events_save()}</Button>
						</Dialog.Footer>
					{/snippet}
				</ActionForm>
			{/key}
		{/if}
	</Dialog.Content>
</Dialog.Root>
