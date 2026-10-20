<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import { Plus, Pencil, Trash2, TriangleAlert } from '@lucide/svelte';
	import { budgetItemSchema, deleteItemSchema } from '$lib/schemas/budget';
	import { longText, sortable } from '$lib/cells';

	let { data } = $props();

	type Item = (typeof data.items)[number];

	let editing = $state<Item | null>(null);
	let itemOpen = $state(false);
	let removing = $state<Item | null>(null);
	let removeOpen = $state(false);

	const totalPlanned = $derived(data.items.reduce((s, i) => s + i.plannedAmount, 0));
	const totalActual = $derived(data.items.reduce((s, i) => s + i.actualAmount, 0));
	const remaining = $derived(data.totalBudget - totalPlanned);
	const spentPct = $derived(
		data.totalBudget > 0 ? Math.min(100, (totalActual / data.totalBudget) * 100) : 0
	);
	const overAllocated = $derived(totalPlanned > data.totalBudget && data.totalBudget > 0);

	const etb = (n: number) => new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

	function openCreate() {
		editing = null;
		itemOpen = true;
	}

	function openEdit(item: Item) {
		editing = item;
		itemOpen = true;
	}

	const seed = $derived(
		editing
			? {
					id: editing.id,
					name: editing.name,
					categoryId: editing.categoryId ?? 0,
					plannedAmount: editing.plannedAmount,
					actualAmount: editing.actualAmount,
					notes: editing.notes ?? ''
				}
			: { id: undefined, name: '', categoryId: 0, plannedAmount: 0, actualAmount: 0, notes: '' }
	);

	/** A money column with its total under it. */
	const amountColumn = (key: 'plannedAmount' | 'actualAmount', header: string): ColumnDef<Item> => ({
		id: key,
		accessorKey: key,
		header: sortable(header),
		meta: { align: 'right', class: 'tabular-nums' },
		cell: ({ row }) => etb(row.original[key]),
		footer: () => etb(key === 'plannedAmount' ? totalPlanned : totalActual)
	});

	const columns: ColumnDef<Item>[] = [
		{ id: 'name', accessorKey: 'name', header: sortable('Item'), footer: 'Total' },
		{ id: 'categoryName', accessorKey: 'categoryName', header: 'Category' },
		amountColumn('plannedAmount', 'Planned'),
		amountColumn('actualAmount', 'Actual'),
		{
			id: 'difference',
			header: 'Difference',
			meta: { align: 'right' },
			cell: ({ row }) => renderSnippet(differenceCell, row.original)
		},
		{ id: 'notes', accessorKey: 'notes', header: 'Notes', cell: ({ row }) => longText(row.original.notes) },
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet differenceCell(item: Item)}
	{@const diff = item.plannedAmount - item.actualAmount}
	{#if item.actualAmount === 0}
		<span class="text-muted-foreground">—</span>
	{:else}
		<Badge variant={diff < 0 ? 'destructive' : 'secondary'}>
			{diff < 0 ? '+' : '−'}{etb(Math.abs(diff))}
		</Badge>
	{/if}
{/snippet}

{#snippet actionsCell(item: Item)}
	<div class="flex justify-end gap-1">
		<Button variant="ghost" size="icon" onclick={() => openEdit(item)} aria-label="Edit {item.name}">
			<Pencil class="size-4" />
		</Button>
		<Button
			variant="ghost"
			size="icon"
			class="text-destructive"
			aria-label="Remove {item.name}"
			onclick={() => {
				removing = item;
				removeOpen = true;
			}}
		>
			<Trash2 class="size-4" />
		</Button>
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Budget"
		description="Plan what you expect to spend, then track what you actually spent."
	>
		{#snippet actions()}
			<Button onclick={openCreate} disabled={data.categoryItems.length === 0}>
				<Plus class="size-4" /> Add line item
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-4">
			<div>
				<p class="text-muted-foreground text-xs">Total budget</p>
				<p class="text-xl font-semibold">{etb(data.totalBudget)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Planned</p>
				<p class="text-xl font-semibold">{etb(totalPlanned)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Spent</p>
				<p class="text-xl font-semibold">{etb(totalActual)}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Unallocated</p>
				<p class="text-xl font-semibold" class:text-destructive={remaining < 0}>
					{etb(remaining)}
				</p>
			</div>
		</div>

		<div class="mt-5 space-y-2">
			<Progress value={spentPct} class="h-2" />
			<p class="text-muted-foreground text-xs">
				{etb(totalActual)} of {etb(data.totalBudget)} ETB spent ({Math.round(spentPct)}%)
			</p>
		</div>

		{#if overAllocated}
			<div
				class="text-destructive border-destructive/30 bg-destructive/5 mt-4 flex items-center gap-2 rounded-lg border px-3 py-2 text-sm"
			>
				<TriangleAlert class="size-4 shrink-0" />
				Your planned amounts exceed your total budget by {etb(Math.abs(remaining))} ETB.
			</div>
		{/if}
	</Card.Root>

	{#if data.categoryItems.length === 0}
		<Card.Root>
			<Card.Content class="text-muted-foreground p-6 text-center text-sm">
				No budget categories exist yet. Ask an admin to add some before you can plan.
			</Card.Content>
		</Card.Root>
	{:else if data.items.length === 0}
		<Card.Root>
			<Card.Content class="p-10 text-center">
				<p class="text-muted-foreground text-sm">Nothing budgeted yet.</p>
				<Button variant="outline" class="mt-4" onclick={openCreate}>
					<Plus class="size-4" /> Add your first line item
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<DataTable
			{columns}
			data={data.items}
			facetKeys={['categoryName']}
			facetLabels={{ categoryName: 'Category' }}
			fileName="Wedding budget"
		/>
	{/if}
</div>

<FormDialog
	title={editing ? 'Edit line item' : 'Add line item'}
	description="Planned is what you expect to spend. Actual is what you've paid so far."
	action="?/save"
	data={data.form}
	schema={budgetItemSchema}
	bind:open={itemOpen}
	{seed}
	hideTrigger
	submitLabel={editing ? 'Save changes' : 'Add item'}
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="name" label="Item name" placeholder="Photographer deposit" />
		<InputComp
			{form}
			{errors}
			name="categoryId"
			label="Category"
			type="select"
			items={data.categoryItems}
			placeholder="Choose a category"
		/>
		<div class="grid gap-1 sm:grid-cols-2">
			<InputComp {form} {errors} name="plannedAmount" label="Planned amount (ETB)" type="number" min={0} />
			<InputComp {form} {errors} name="actualAmount" label="Actual amount (ETB)" type="number" min={0} />
		</div>
		<InputComp
			{form}
			{errors}
			name="notes"
			label="Notes (optional)"
			type="textarea"
			rows={3}
			placeholder="Deposit paid, balance due two weeks before"
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Remove this line item?"
	description="{removing?.name ?? ''} will be permanently removed from your budget. This can't be undone."
	action="?/delete"
	data={data.deleteForm}
	schema={deleteItemSchema}
	bind:open={removeOpen}
	seed={{ id: removing?.id }}
	hideTrigger
	submitLabel="Remove"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
	{/snippet}
</FormDialog>
