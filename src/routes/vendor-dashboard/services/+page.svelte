<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as AlertDialog from '$lib/components/ui/alert-dialog/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { toast } from 'svelte-sonner';
	import { assetUrl } from '$lib/assetUrl';
	import { Plus, Pencil, Trash2, Loader2, Sparkles, ImageOff } from '@lucide/svelte';

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
		$addForm.title = '';
		$addForm.description = '';
		$addForm.categoryId = undefined;
		$addForm.currency = 'ETB';
		dialogOpen = true;
	}

	function openEdit(service: (typeof data.rows)[number]) {
		editingId = service.id;
		$editForm.id = service.id;
		$editForm.title = service.title;
		$editForm.description = service.description ?? '';
		$editForm.categoryId = service.categoryId ?? undefined;
		$editForm.currency = service.currency;
		dialogOpen = true;
	}

	function confirmDelete(service: (typeof data.rows)[number]) {
		pendingDelete = { id: service.id, label: service.title };
		$deleteForm.id = service.id;
	}

	function categoryName(id: number | null) {
		return data.categories.find((c) => c.value === id)?.name ?? 'Uncategorised';
	}
</script>

<svelte:head>
	<title>Services — Vendor Portal</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Services</h1>
			<p class="text-muted-foreground text-sm">
				What you offer. Couples browse these on your public listing.
			</p>
		</div>
		<Button onclick={openCreate}>
			<Plus class="mr-2 size-4" /> Add service
		</Button>
	</div>

	{#if data.rows.length === 0}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<Sparkles class="text-muted-foreground mx-auto size-8" />
				<p class="text-muted-foreground mt-3 text-sm">You haven't added any services yet.</p>
				<Button class="mt-4" onclick={openCreate}>
					<Plus class="mr-2 size-4" /> Add your first service
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.rows as service (service.id)}
				<Card.Root class="overflow-hidden">
					<div class="bg-muted flex h-36 items-center justify-center">
						{#if service.featuredImage}
							<img
								src={assetUrl(service.featuredImage)}
								alt={service.title}
								class="h-full w-full object-cover"
							/>
						{:else}
							<ImageOff class="text-muted-foreground size-8" />
						{/if}
					</div>
					<Card.Content class="space-y-2 pt-4">
						<div class="flex items-start justify-between gap-2">
							<h3 class="font-medium">{service.title}</h3>
							<span class="text-muted-foreground shrink-0 text-xs">{categoryName(service.categoryId)}</span>
						</div>
						{#if service.description}
							<p class="text-muted-foreground line-clamp-2 text-xs">{service.description}</p>
						{/if}
						<div class="flex justify-end gap-1 pt-1">
							<Button variant="ghost" size="icon" onclick={() => openEdit(service)}>
								<Pencil class="size-4" />
							</Button>
							<Button
								variant="ghost"
								size="icon"
								class="text-destructive"
								onclick={() => confirmDelete(service)}
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
			<Dialog.Title>{editingId ? 'Edit service' : 'Add service'}</Dialog.Title>
		</Dialog.Header>

		{#if editingId}
			<form method="POST" action="?/edit" use:editEnhance enctype="multipart/form-data" class="space-y-1">
				<input type="hidden" name="id" bind:value={$editForm.id} />
				<Errors allErrors={$editAllErrors} />
				<InputComp label="Title" name="title" type="text" form={editForm} errors={editErrors} />
				<InputComp
					label="Category"
					name="categoryId"
					type="select"
					items={data.categories}
					form={editForm}
					errors={editErrors}
				/>
				<InputComp
					label="Description"
					name="description"
					type="textarea"
					rows={4}
					form={editForm}
					errors={editErrors}
				/>
				<InputComp
					label="Photo"
					name="featuredImage"
					type="file"
					image={data.rows.find((s) => s.id === editingId)?.featuredImage ?? ''}
					form={editForm}
					errors={editErrors}
				/>
				<input type="hidden" name="currency" bind:value={$editForm.currency} />
				<Dialog.Footer class="pt-4">
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button type="submit" disabled={$editDelayed}>
						{#if $editDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
						Save changes
					</Button>
				</Dialog.Footer>
			</form>
		{:else}
			<form method="POST" action="?/add" use:addEnhance enctype="multipart/form-data" class="space-y-1">
				<Errors allErrors={$addAllErrors} />
				<InputComp label="Title" name="title" type="text" form={addForm} errors={addErrors} />
				<InputComp
					label="Category"
					name="categoryId"
					type="select"
					items={data.categories}
					form={addForm}
					errors={addErrors}
				/>
				<InputComp
					label="Description"
					name="description"
					type="textarea"
					rows={4}
					form={addForm}
					errors={addErrors}
				/>
				<InputComp label="Photo" name="featuredImage" type="file" form={addForm} errors={addErrors} />
				<input type="hidden" name="currency" bind:value={$addForm.currency} />
				<Dialog.Footer class="pt-4">
					<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
					<Button type="submit" disabled={$addDelayed}>
						{#if $addDelayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
						Add service
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
			<AlertDialog.Title>Remove this service?</AlertDialog.Title>
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
