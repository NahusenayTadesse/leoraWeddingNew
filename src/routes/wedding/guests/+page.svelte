<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Checkbox } from '@nahu/admin-kit/components/ui/checkbox/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import { Plus, Pencil, Trash2, Users, ListPlus, Phone } from '@lucide/svelte';
	import { guestSchema, bulkGuestSchema, guestIdSchema } from '$lib/schemas/guest';
	import { sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type Guest = (typeof data.guests)[number];

	const SIDE_ITEMS = [
		{ value: 'bride', name: m.gst_bride_side() },
		{ value: 'groom', name: m.gst_groom_side() },
		{ value: 'both', name: m.gst_both() }
	];

	const RSVP_LABEL: Record<string, string> = {
		pending: m.gst_rsvp_pending(),
		confirmed: m.gst_rsvp_confirmed(),
		declined: m.gst_rsvp_declined()
	};

	let editing = $state<Guest | null>(null);
	let guestOpen = $state(false);
	let bulkOpen = $state(false);
	let removing = $state<Guest | null>(null);
	let removeOpen = $state(false);

	const total = $derived(data.guests.length);
	const confirmed = $derived(data.guests.filter((g) => g.isConfirmed).length);
	const brideCount = $derived(data.guests.filter((g) => g.side === 'bride').length);
	const groomCount = $derived(data.guests.filter((g) => g.side === 'groom').length);
	const capacityPct = $derived(
		data.expectedGuests > 0 ? Math.min(100, (total / data.expectedGuests) * 100) : 0
	);
	const overCapacity = $derived(data.expectedGuests > 0 && total > data.expectedGuests);

	function openCreate() {
		editing = null;
		guestOpen = true;
	}

	function openEdit(guest: Guest) {
		editing = guest;
		guestOpen = true;
	}

	const seed = $derived(
		editing
			? {
					id: editing.id,
					fullName: editing.fullName ?? '',
					phone: editing.phone ?? '',
					side: editing.side ?? 'bride',
					isConfirmed: editing.isConfirmed ?? false
				}
			: { id: undefined, fullName: '', phone: '', side: 'bride' as const, isConfirmed: false }
	);

	const columns: ColumnDef<Guest>[] = [
		{
			id: 'going',
			header: m.gst_going(),
			meta: { class: 'w-12' },
			cell: ({ row }) => renderSnippet(goingCell, row.original)
		},
		{ id: 'fullName', accessorKey: 'fullName', header: sortable(m.gst_name()) },
		{
			id: 'phone',
			accessorKey: 'phone',
			header: m.gst_phone(),
			cell: ({ row }) => renderSnippet(phoneCell, row.original)
		},
		{
			id: 'side',
			accessorKey: 'side',
			header: m.gst_side(),
			cell: ({ row }) =>
				SIDE_ITEMS.find((s) => s.value === row.original.side)?.name ?? words(row.original.side)
		},
		{
			id: 'rsvpStatus',
			accessorKey: 'rsvpStatus',
			header: m.gst_rsvp(),
			cell: ({ row }) => status(row.original.rsvpStatus, RSVP_LABEL[row.original.rsvpStatus])
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet goingCell(guest: Guest)}
	<ActionForm
		action="?/toggle"
		submit={() =>
			async ({ update }) =>
				await update({ reset: false })}
	>
		<HiddenField name="id" value={guest.id} />
		<button
			type="submit"
			class="flex items-center"
			aria-label={guest.isConfirmed
				? m.gst_unconfirm({ name: guest.fullName })
				: m.gst_confirm({ name: guest.fullName })}
		>
			<Checkbox checked={guest.isConfirmed} class="pointer-events-none" />
		</button>
	</ActionForm>
{/snippet}

{#snippet phoneCell(guest: Guest)}
	{#if guest.phone}
		<a
			href="tel:{guest.phone}"
			class="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
		>
			<Phone class="size-3.5" />{guest.phone}
		</a>
	{:else}
		<span class="text-muted-foreground">—</span>
	{/if}
{/snippet}

{#snippet actionsCell(guest: Guest)}
	<div class="flex justify-end gap-1">
		<Button
			variant="ghost"
			size="icon"
			onclick={() => openEdit(guest)}
			aria-label={m.bud_edit_aria({ name: guest.fullName })}
		>
			<Pencil class="size-4" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="text-destructive"
			aria-label={m.bud_remove_aria({ name: guest.fullName })}
			onclick={() => {
				removing = guest;
				removeOpen = true;
			}}
		>
			<Trash2 class="size-4" />
		</Button>
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader title={m.nav_guests()} description={m.gst_desc()}>
		{#snippet actions()}
			<Button variant="outline" onclick={() => (bulkOpen = true)}>
				<ListPlus class="size-4" />
				{m.gst_paste()}
			</Button>
			<Button onclick={openCreate}>
				<Plus class="size-4" />
				{m.gst_add()}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-4">
			<div>
				<p class="text-xs text-muted-foreground">{m.gst_invited()}</p>
				<p class="text-xl font-semibold">{total}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.gst_rsvp_confirmed()}</p>
				<p class="text-xl font-semibold">{confirmed}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.gst_bride_groom()}</p>
				<p class="text-xl font-semibold">{brideCount} / {groomCount}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.gst_expected()}</p>
				<p class="text-xl font-semibold" class:text-destructive={overCapacity}>
					{data.expectedGuests || '—'}
				</p>
			</div>
		</div>

		{#if data.expectedGuests > 0}
			<div class="mt-5 space-y-2">
				<Progress value={capacityPct} class="h-2" />
				<p class="text-xs text-muted-foreground">
					{m.gst_of_expected({ total, expected: data.expectedGuests })}
					{#if overCapacity}
						<span class="font-medium text-destructive">
							{m.gst_over({ count: total - data.expectedGuests })}
						</span>
					{/if}
				</p>
			</div>
		{/if}
	</Card.Root>

	{#if total === 0}
		<Card.Root>
			<Card.Content class="p-10 text-center">
				<Users class="mx-auto size-8 text-muted-foreground" />
				<p class="mt-3 text-sm text-muted-foreground">{m.gst_none()}</p>
				<div class="mt-4 flex justify-center gap-2">
					<Button variant="outline" onclick={() => (bulkOpen = true)}>
						<ListPlus class="size-4" />
						{m.gst_paste_list()}
					</Button>
					<Button onclick={openCreate}>
						<Plus class="size-4" />
						{m.gst_add_one()}
					</Button>
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<DataTable
			{columns}
			data={data.guests}
			facetKeys={['side', 'rsvpStatus']}
			facetLabels={{ side: m.gst_side(), rsvpStatus: m.gst_rsvp() }}
			fileName={m.gst_file()}
		/>
	{/if}
</div>

<FormDialog
	title={editing ? m.gst_edit() : m.gst_add()}
	action="?/save"
	data={data.form}
	schema={guestSchema}
	bind:open={guestOpen}
	{seed}
	hideTrigger
	submitLabel={editing ? m.wd_save() : m.gst_add()}
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp
			{form}
			{errors}
			name="fullName"
			label={m.gst_full_name()}
			placeholder="Abebe Kebede"
		/>
		<InputComp
			{form}
			{errors}
			name="phone"
			label={m.gst_phone_opt()}
			type="tel"
			placeholder="0911234567"
		/>
		<InputComp
			{form}
			{errors}
			name="side"
			label={m.gst_side()}
			type="select"
			items={SIDE_ITEMS}
			placeholder={m.gst_choose_side()}
		/>
		<InputComp
			{form}
			{errors}
			name="isConfirmed"
			label={m.gst_attendance()}
			type="checkboxSingle"
			placeholder={m.gst_attendance_ph()}
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title={m.gst_paste_title()}
	description={m.gst_paste_desc()}
	action="?/bulk"
	data={data.bulkForm}
	schema={bulkGuestSchema}
	bind:open={bulkOpen}
	seed={{ side: 'bride', names: '' }}
	hideTrigger
	resetOnSuccess
	submitLabel={m.gst_add_guests()}
>
	{#snippet fields({ form, errors })}
		<InputComp
			{form}
			{errors}
			name="side"
			label={m.gst_side()}
			type="select"
			items={SIDE_ITEMS}
			placeholder={m.gst_choose_side()}
		/>
		<InputComp
			{form}
			{errors}
			name="names"
			label={m.gst_names()}
			type="textarea"
			rows={10}
			placeholder={`Abebe Kebede, 0911234567
Hana Tesfaye
Dawit Girma, 0922334455`}
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title={m.gst_remove_title()}
	description={m.gst_remove_desc({ name: removing?.fullName ?? m.gst_this_guest() })}
	action="?/delete"
	data={data.deleteForm}
	schema={guestIdSchema}
	bind:open={removeOpen}
	seed={{ id: removing?.id }}
	hideTrigger
	submitLabel={m.bud_remove()}
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
	{/snippet}
</FormDialog>
