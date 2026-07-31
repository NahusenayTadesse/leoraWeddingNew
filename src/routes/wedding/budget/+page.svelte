<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { budgetItemSchema } from '$lib/schemas/budget';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { toast } from 'svelte-sonner';
	import { Plus, Pencil, Trash2, Loader2, TriangleAlert } from '@lucide/svelte';

	let { data } = $props();

	let dialogOpen = $state(false);
	let editingId = $state<number | null>(null);
	let pendingDelete = $state<{ id: number; label: string } | null>(null);

	const sf = superForm(data.form, {
		id: 'item',
		validators: zod4Client(budgetItemSchema),
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

	const df = superForm(data.deleteForm, {
		id: 'delete',
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
			pendingDelete = null;
		}
	});
	const { form: deleteData, enhance: deleteEnhance, submitting: deleting } = df;

	const totalPlanned = $derived(data.items.reduce((s, i) => s + i.plannedAmount, 0));
	const totalActual = $derived(data.items.reduce((s, i) => s + i.actualAmount, 0));
	const remaining = $derived(data.totalBudget - totalPlanned);
	const spentPct = $derived(
		data.totalBudget > 0 ? Math.min(100, (totalActual / data.totalBudget) * 100) : 0
	);
	const overAllocated = $derived(totalPlanned > data.totalBudget && data.totalBudget > 0);

	const etb = (n: number) =>
		new Intl.NumberFormat('en-ET', { maximumFractionDigits: 0 }).format(n);

	function openCreate() {
		editingId = null;
		$form.id = undefined;
		$form.categoryId = 0;
		$form.plannedAmount = 0;
		$form.actualAmount = 0;
		$form.notes = '';
		dialogOpen = true;
	}

	function openEdit(item: (typeof data.items)[number]) {
		editingId = item.id;
		$form.id = item.id;
		$form.categoryId = item.categoryId;
		$form.plannedAmount = item.plannedAmount;
		$form.actualAmount = item.actualAmount;
		$form.notes = item.notes ?? '';
		dialogOpen = true;
	}

	function confirmDelete(item: (typeof data.items)[number]) {
		pendingDelete = { id: item.id, label: item.categoryName };
		$deleteData.id = item.id;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Budget</h1>
			<p class="text-muted-foreground text-sm">
				Plan what you expect to spend, then track what you actually spent.
			</p>
		</div>
		<Button onclick={openCreate} disabled={data.categoryItems.length === 0}>
			<Plus class="mr-2 size-4" /> Add line item
		</Button>
	</div>

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
				class="text-destructive mt-4 flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-3 py-2 text-sm"
			>
				<TriangleAlert class="size-4 shrink-0" />
				Your planned amounts exceed your total budget by {etb(Math.abs(remaining))} ETB.
			</div>
		{/if}
	</Card.Root>

	<!-- Items -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Line items</Card.Title>
			<Card.Description>{data.items.length} item{data.items.length === 1 ? '' : 's'}</Card.Description>
		</Card.Header>
		<Card.Content class="p-0 sm:p-6 sm:pt-0">
			{#if data.categoryItems.length === 0}
				<div class="text-muted-foreground p-6 text-center text-sm">
					No budget categories exist yet. Ask an admin to add some before you can plan.
				</div>
			{:else if data.items.length === 0}
				<div class="p-10 text-center">
					<p class="text-muted-foreground text-sm">Nothing budgeted yet.</p>
					<Button variant="outline" class="mt-4" onclick={openCreate}>
						<Plus class="mr-2 size-4" /> Add your first line item
					</Button>
				</div>
			{:else}
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>Category</Table.Head>
							<Table.Head class="text-right">Planned</Table.Head>
							<Table.Head class="text-right">Actual</Table.Head>
							<Table.Head class="hidden text-right sm:table-cell">Difference</Table.Head>
							<Table.Head class="w-20"></Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#each data.items as item (item.id)}
							{@const diff = item.plannedAmount - item.actualAmount}
							<Table.Row>
								<Table.Cell>
									<p class="font-medium">{item.categoryName}</p>
									{#if item.notes}
										<p class="text-muted-foreground line-clamp-1 text-xs">{item.notes}</p>
									{/if}
								</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{etb(item.plannedAmount)}</Table.Cell>
								<Table.Cell class="text-right tabular-nums">{etb(item.actualAmount)}</Table.Cell>
								<Table.Cell class="hidden text-right sm:table-cell">
									{#if item.actualAmount === 0}
										<span class="text-muted-foreground">—</span>
									{:else}
										<Badge variant={diff < 0 ? 'destructive' : 'secondary'}>
											{diff < 0 ? '+' : '−'}{etb(Math.abs(diff))}
										</Badge>
									{/if}
								</Table.Cell>
								<Table.Cell>
									<div class="flex justify-end gap-1">
										<Button variant="ghost" size="icon" onclick={() => openEdit(item)}>
											<Pencil class="size-4" />
										</Button>
										<Button
											variant="ghost"
											size="icon"
											class="text-destructive"
											onclick={() => confirmDelete(item)}
										>
											<Trash2 class="size-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					</Table.Body>
					<Table.Footer>
						<Table.Row>
							<Table.Cell class="font-medium">Total</Table.Cell>
							<Table.Cell class="text-right font-semibold tabular-nums">{etb(totalPlanned)}</Table.Cell>
							<Table.Cell class="text-right font-semibold tabular-nums">{etb(totalActual)}</Table.Cell>
							<Table.Cell class="hidden sm:table-cell"></Table.Cell>
							<Table.Cell></Table.Cell>
						</Table.Row>
					</Table.Footer>
				</Table.Root>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Create / edit dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{editingId ? 'Edit line item' : 'Add line item'}</Dialog.Title>
			<Dialog.Description>
				Planned is what you expect to spend. Actual is what you've paid so far.
			</Dialog.Description>
		</Dialog.Header>

		<form method="POST" action="?/save" use:enhance class="space-y-1">
			<input type="hidden" name="id" bind:value={$form.id} />

			<InputComp
				label="category"
				{form}
				{errors}
				name="categoryId"
				type="select"
				items={data.categoryItems}
				placeholder="Choose a category"
			/>

			<div class="grid gap-1 sm:grid-cols-2">
				<InputComp
					label="planned amount (ETB)"
					{form}
					{errors}
					name="plannedAmount"
					type="number"
					min="0"
					placeholder="50000"
				/>
				<InputComp
					label="actual amount (ETB)"
					{form}
					{errors}
					name="actualAmount"
					type="number"
					min="0"
					placeholder="0"
				/>
			</div>

			<InputComp
				label="notes (optional)"
				{form}
				{errors}
				name="notes"
				type="textarea"
				rows={3}
				placeholder="Deposit paid, balance due two weeks before"
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{editingId ? 'Save changes' : 'Add item'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete confirmation -->
<AlertDialog.Root open={!!pendingDelete} onOpenChange={(v) => !v && (pendingDelete = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove this line item?</AlertDialog.Title>
			<AlertDialog.Description>
				{pendingDelete?.label} will be permanently removed from your budget. This can't be undone.
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