<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { enhance as formEnhance } from '$app/forms';
	import { guestSchema, bulkGuestSchema } from '$lib/schemas/guest';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Table from '$lib/components/ui/table';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';
	import { Plus, Pencil, Trash2, Loader2, Users, Search, ListPlus, Phone } from '@lucide/svelte';

	let { data } = $props();

	const SIDE_ITEMS = [
		{ value: 'bride', name: "Bride's side" },
		{ value: 'groom', name: "Groom's side" },
		{ value: 'both', name: 'Both sides' }
	];

	let dialogOpen = $state(false);
	let bulkOpen = $state(false);
	let editingId = $state<number | null>(null);
	let pendingDelete = $state<{ id: number; label: string } | null>(null);
	let query = $state('');
	let sideTab = $state('all');

	const sf = superForm(data.form, {
		id: 'guest',
		validators: zod4Client(guestSchema),
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) {
				toast.success(form.message);
				dialogOpen = false;
				editingId = null;
			}
		}
	});
	const { form, errors, enhance, submitting } = sf;

	const bf = superForm(data.bulkForm, {
		id: 'bulk',
		validators: zod4Client(bulkGuestSchema),
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) {
				toast.success(form.message);
				bulkOpen = false;
			}
		}
	});
	const { form: bulkData, errors: bulkErrors, enhance: bulkEnhance, submitting: bulkSubmitting } = bf;

	const df = superForm(data.deleteForm, {
		id: 'delete',
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
			pendingDelete = null;
		}
	});
	const { form: deleteData, enhance: deleteEnhance, submitting: deleting } = df;

	const total = $derived(data.guests.length);
	const confirmed = $derived(data.guests.filter((g) => g.isConfirmed).length);
	const brideCount = $derived(data.guests.filter((g) => g.side === 'bride').length);
	const groomCount = $derived(data.guests.filter((g) => g.side === 'groom').length);
	const capacityPct = $derived(
		data.expectedGuests > 0 ? Math.min(100, (total / data.expectedGuests) * 100) : 0
	);
	const overCapacity = $derived(data.expectedGuests > 0 && total > data.expectedGuests);

	const visible = $derived.by(() => {
		const q = query.trim().toLowerCase();
		return data.guests.filter((g) => {
			if (sideTab !== 'all' && g.side !== sideTab) return false;
			if (!q) return true;
			return (
				g.fullName?.toLowerCase().includes(q) || (g.phone ?? '').toLowerCase().includes(q)
			);
		});
	});

	function openCreate() {
		editingId = null;
		$form.id = undefined;
		$form.fullName = '';
		$form.phone = '';
		$form.side = 'bride';
		$form.isConfirmed = false;
		dialogOpen = true;
	}

	function openEdit(guest: (typeof data.guests)[number]) {
		editingId = guest.id;
		$form.id = guest.id;
		$form.fullName = guest.fullName ?? '';
		$form.phone = guest.phone ?? '';
		$form.side = guest.side ?? 'bride';
		$form.isConfirmed = guest.isConfirmed ?? false;
		dialogOpen = true;
	}

	function openBulk() {
		$bulkData.side = 'bride';
		$bulkData.names = '';
		bulkOpen = true;
	}

	function confirmDelete(guest: (typeof data.guests)[number]) {
		pendingDelete = { id: guest.id, label: guest.fullName ?? 'This guest' };
		$deleteData.id = guest.id;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Guests</h1>
			<p class="text-muted-foreground text-sm">
				Track who's invited and who has confirmed.
			</p>
		</div>
		<div class="flex gap-2">
			<Button variant="outline" onclick={openBulk}>
				<ListPlus class="mr-2 size-4" /> Paste list
			</Button>
			<Button onclick={openCreate}>
				<Plus class="mr-2 size-4" /> Add guest
			</Button>
		</div>
	</div>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-4">
			<div>
				<p class="text-muted-foreground text-xs">Invited</p>
				<p class="text-xl font-semibold">{total}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Confirmed</p>
				<p class="text-xl font-semibold">{confirmed}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Bride / Groom</p>
				<p class="text-xl font-semibold">{brideCount} / {groomCount}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Expected</p>
				<p class="text-xl font-semibold" class:text-destructive={overCapacity}>
					{data.expectedGuests || '—'}
				</p>
			</div>
		</div>

		{#if data.expectedGuests > 0}
			<div class="mt-5 space-y-2">
				<Progress value={capacityPct} class="h-2" />
				<p class="text-muted-foreground text-xs">
					{total} of {data.expectedGuests} expected
					{#if overCapacity}
						<span class="text-destructive font-medium">
							— {total - data.expectedGuests} over your estimate
						</span>
					{/if}
				</p>
			</div>
		{/if}
	</Card.Root>

	<!-- List -->
	<Card.Root>
		<Card.Header class="gap-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<Tabs.Root bind:value={sideTab}>
					<Tabs.List>
						<Tabs.Trigger value="all">All ({total})</Tabs.Trigger>
						<Tabs.Trigger value="bride">Bride ({brideCount})</Tabs.Trigger>
						<Tabs.Trigger value="groom">Groom ({groomCount})</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				<div class="relative w-full sm:w-64">
					<Search class="text-muted-foreground absolute top-1/2 left-3 size-4 -translate-y-1/2" />
					<Input bind:value={query} placeholder="Search name or phone" class="pl-9" />
				</div>
			</div>
		</Card.Header>

		<Card.Content class="p-0 sm:p-6 sm:pt-0">
			{#if total === 0}
				<div class="p-10 text-center">
					<Users class="text-muted-foreground mx-auto size-8" />
					<p class="text-muted-foreground mt-3 text-sm">No guests yet.</p>
					<div class="mt-4 flex justify-center gap-2">
						<Button variant="outline" onclick={openBulk}>
							<ListPlus class="mr-2 size-4" /> Paste a list
						</Button>
						<Button onclick={openCreate}>
							<Plus class="mr-2 size-4" /> Add one
						</Button>
					</div>
				</div>
			{:else if visible.length === 0}
				<div class="text-muted-foreground p-10 text-center text-sm">
					No guests match that search.
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head class="w-12">Going</Table.Head>
							<Table.Head>Name</Table.Head>
							<Table.Head class="hidden sm:table-cell">Phone</Table.Head>
							<Table.Head>Side</Table.Head>
							<Table.Head class="w-20"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each visible as guest (guest.id)}
							<Table.Row>
								<Table.Cell>
									<form
										method="POST"
										action="?/toggle"
										use:formEnhance={() => async ({ update }) => await update({ reset: false })}
									>
										<input type="hidden" name="id" value={guest.id} />
										<button type="submit" class="flex items-center" aria-label="Toggle confirmation">
											<Checkbox checked={guest.isConfirmed} class="pointer-events-none" />
										</button>
									</form>
								</Table.Cell>
								<Table.Cell>
									<p class="font-medium" class:text-muted-foreground={!guest.isConfirmed}>
										{guest.fullName}
									</p>
								</Table.Cell>
								<Table.Cell class="hidden sm:table-cell">
									{#if guest.phone}
										<a
											href="tel:{guest.phone}"
											class="text-muted-foreground hover:text-foreground flex items-center gap-1.5 text-sm"
										>
											<Phone class="size-3.5" />{guest.phone}
										</a>
									{:else}
										<span class="text-muted-foreground">—</span>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary" class="capitalize">{guest.side}</Badge>
								</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end gap-1">
										<Button variant="ghost" size="icon" onclick={() => openEdit(guest)}>
											<Pencil class="size-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="text-destructive"
											onclick={() => confirmDelete(guest)}
										>
											<Trash2 class="size-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Create / edit -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingId ? 'Edit guest' : 'Add guest'}</Dialog.Title>
		</Dialog.Header>

		<form method="POST" action="?/save" use:enhance class="space-y-1">
			<input type="hidden" name="id" bind:value={$form.id} />

			<InputComp label="full name" {form} {errors} name="fullName" type="text" placeholder="Abebe Kebede" />

			<InputComp label="phone (optional)" {form} {errors} name="phone" type="tel" placeholder="0911234567" />

			<InputComp
				label="side"
				{form}
				{errors}
				name="side"
				type="select"
				items={SIDE_ITEMS}
				placeholder="Choose a side"
			/>

			<InputComp
				label="attendance"
				{form}
				{errors}
				name="isConfirmed"
				type="checkboxSingle"
				placeholder="Has confirmed they're coming"
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{editingId ? 'Save changes' : 'Add guest'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Bulk paste -->
<Dialog.Root bind:open={bulkOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Paste a guest list</Dialog.Title>
			<Dialog.Description>
				One guest per line. Add a phone after a comma if you have it — duplicates in the paste are
				skipped.
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/bulk" use:bulkEnhance class="space-y-1">
			<InputComp
				label="side"
				form={bulkData}
				errors={bulkErrors}
				name="side"
				type="select"
				items={SIDE_ITEMS}
				placeholder="Choose a side"
			/>

			<InputComp
				label="names"
				form={bulkData}
				errors={bulkErrors}
				name="names"
				type="textarea"
				rows={10}
				placeholder={'Abebe Kebede, 0911234567\nHana Tesfaye\nDawit Girma, 0922334455'}
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (bulkOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={$bulkSubmitting}>
					{#if $bulkSubmitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Add guests
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete -->
<AlertDialog.Root open={!!pendingDelete} onOpenChange={(v) => !v && (pendingDelete = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove this guest?</AlertDialog.Title>
			<AlertDialog.Description>
				{pendingDelete?.label} will be permanently removed from your list.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/delete" use:deleteEnhance>
			<input type="hidden" name="id" bind:value={$deleteData.id} />
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={$deleting}>
					{#if $deleting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Remove
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>