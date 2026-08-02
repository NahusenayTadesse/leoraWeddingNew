<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { formatETB } from '$lib/money';
	import { toast } from 'svelte-sonner';
	import { Plus, Pencil, Trash2, Loader2, PackageOpen, Check } from '@lucide/svelte';

	let { data } = $props();

	let dialogOpen = $state(false);
	let editingId = $state<number | null>(null);
	let pendingDelete = $state<{ id: number; label: string } | null>(null);

	const addSf = superForm(data.addForm, {
		id: 'add',
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message?.type === 'success') {
				toast.success(form.message.text);
				dialogOpen = false;
			} else if (form.message?.type === 'error') {
				toast.error(form.message.text);
			}
		}
	});
	const {
		form: addForm,
		errors: addErrors,
		enhance: addEnhance,
		delayed: addDelayed,
		allErrors: addAllErrors
	} = addSf;

	const editSf = superForm(data.editForm, {
		id: 'edit',
		resetForm: false,
		onUpdated: ({ form }) => {
			if (form.valid && form.message?.type === 'success') {
				toast.success(form.message.text);
				dialogOpen = false;
				editingId = null;
			} else if (form.message?.type === 'error') {
				toast.error(form.message.text);
			}
		}
	});
	const {
		form: editForm,
		errors: editErrors,
		enhance: editEnhance,
		delayed: editDelayed,
		allErrors: editAllErrors
	} = editSf;

	const deleteSf = superForm(data.deleteForm, {
		id: 'delete',
		onUpdated: ({ form }) => {
			if (form.message) toast[form.message.type === 'error' ? 'error' : 'success'](form.message.text);
			pendingDelete = null;
		}
	});
	const { form: deleteForm, enhance: deleteEnhance, delayed: deleting } = deleteSf;

	function openCreate() {
		editingId = null;
		$addForm.name = '';
		$addForm.price = undefined as unknown as number;
		$addForm.description = '';
		$addForm.inclusions = '';
		dialogOpen = true;
	}

	function openEdit(pkg: (typeof data.rows)[number]) {
		editingId = pkg.id;
		$editForm.id = pkg.id;
		$editForm.name = pkg.name;
		$editForm.price = Number(pkg.price);
		$editForm.description = pkg.description ?? '';
		$editForm.inclusions = (pkg.inclusions ?? []).join('\n');
		dialogOpen = true;
	}

	function confirmDelete(pkg: (typeof data.rows)[number]) {
		pendingDelete = { id: pkg.id, label: pkg.name };
		$deleteForm.id = pkg.id;
	}
</script>

<svelte:head>
	<title>Packages — Vendor Portal</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Packages</h1>
			<p class="text-muted-foreground text-sm">
				Priced bundles couples can pick straight from your listing.
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="mr-2 size-4" /> Add package
		</Button>
	</div>

	{#if data.rows.length === 0}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<PackageOpen class="text-muted-foreground mx-auto size-8" />
				<p class="text-muted-foreground mt-3 text-sm">You haven't published any packages yet.</p>
				<Button class="mt-4" onclick={openCreate}>
					<Plus class="mr-2 size-4" /> Add your first package
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.rows as pkg (pkg.id)}
				<Card.Root>
					<Card.Header>
						<Card.Title class="flex items-baseline justify-between gap-2">
							<span>{pkg.name}</span>
							<span class="text-primary text-lg font-bold whitespace-nowrap">
								{formatETB(pkg.price)}
							</span>
						</Card.Title>
						{#if pkg.description}
							<Card.Description class="line-clamp-2">{pkg.description}</Card.Description>
						{/if}
					</Card.Header>
					<Card.Content class="space-y-3">
						{#if pkg.inclusions?.length}
							<ul class="space-y-1 text-sm">
								{#each pkg.inclusions.slice(0, 4) as item (item)}
									<li class="flex items-start gap-1.5">
										<Check class="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
										<span>{item}</span>
									</li>
								{/each}
								{#if pkg.inclusions.length > 4}
									<li class="text-muted-foreground text-xs">
										+{pkg.inclusions.length - 4} more
									</li>
								{/if}
							</ul>
						{/if}
						<div class="flex justify-end gap-1">
							<Button variant="ghost" size="icon" onclick={() => openEdit(pkg)}>
								<Pencil class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="text-destructive"
								onclick={() => confirmDelete(pkg)}
							>
								<Trash2 class="size-4" />
							</Button>
						</div>
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}
</div>

<!-- Create / edit -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingId ? 'Edit package' : 'Add package'}</Dialog.Title>
		</Dialog.Header>

		{#if editingId}
			<form method="POST" action="?/edit" use:editEnhance class="space-y-1">
				<input type="hidden" name="id" bind:value={$editForm.id} />
				<Errors allErrors={$editAllErrors} />
				<InputComp label="Package name" name="name" type="text" form={editForm} errors={editErrors} />
				<InputComp
					label="Price (ETB)"
					name="price"
					type="number"
					placeholder="95,000"
					form={editForm}
					errors={editErrors}
				/>
				<InputComp
					label="Description"
					name="description"
					type="textarea"
					rows={3}
					form={editForm}
					errors={editErrors}
				/>
				<InputComp
					label="What's included (one per line)"
					name="inclusions"
					type="textarea"
					rows={5}
					placeholder={'Full-day coverage\nEdited gallery\nEngagement session'}
					form={editForm}
					errors={editErrors}
				/>
				<Dialog.Footer class="pt-4">
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button type="submit" disabled={$editDelayed}>
						{#if $editDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
						Save changes
					</Button>
				</Dialog.Footer>
			</form>
		{:else}
			<form method="POST" action="?/add" use:addEnhance class="space-y-1">
				<Errors allErrors={$addAllErrors} />
				<InputComp label="Package name" name="name" type="text" form={addForm} errors={addErrors} />
				<InputComp
					label="Price (ETB)"
					name="price"
					type="number"
					placeholder="95,000"
					form={addForm}
					errors={addErrors}
				/>
				<InputComp
					label="Description"
					name="description"
					type="textarea"
					rows={3}
					form={addForm}
					errors={addErrors}
				/>
				<InputComp
					label="What's included (one per line)"
					name="inclusions"
					type="textarea"
					rows={5}
					placeholder={'Full-day coverage\nEdited gallery\nEngagement session'}
					form={addForm}
					errors={addErrors}
				/>
				<Dialog.Footer class="pt-4">
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button type="submit" disabled={$addDelayed}>
						{#if $addDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
						Add package
					</Button>
				</Dialog.Footer>
			</form>
		{/if}
	</Dialog.Content>
</Dialog.Root>

<!-- Delete -->
<AlertDialog.Root open={!!pendingDelete} onOpenChange={(v) => !v && (pendingDelete = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove this package?</AlertDialog.Title>
			<AlertDialog.Description>
				{pendingDelete?.label} will be removed from your public listing.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/delete" use:deleteEnhance>
			<input type="hidden" name="id" bind:value={$deleteForm.id} />
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
