<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { assetUrl } from '$lib/assetUrl';
	import { vendorServiceAddSchema, vendorServiceEditSchema } from '$lib/schemas/vendor-services';
	import { idSchema } from '$lib/schemas/common';
	import { Plus, Pencil, Trash2, Sparkles, ImageOff } from '@lucide/svelte';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	let editing = $state<Row | null>(null);
	let addOpen = $state(false);
	let editOpen = $state(false);
	let removing = $state<Row | null>(null);
	let removeOpen = $state(false);

	function openCreate() {
		addOpen = true;
	}

	function openEdit(row: Row) {
		editing = row;
		editOpen = true;
	}

	function confirmDelete(row: Row) {
		removing = row;
		removeOpen = true;
	}

	function categoryName(id: number | null) {
		return data.categories.find((c) => c.value === id)?.name ?? 'Uncategorised';
	}
</script>

<div class="space-y-6">
	<PageHeader
		title="Services"
		tabTitle="Services — Vendor Portal"
		description="What you offer. Couples browse these on your public listing."
	>
		{#snippet actions()}
			<Button onclick={openCreate}><Plus class="size-4" /> Add service</Button>
		{/snippet}
	</PageHeader>

	{#if data.rows.length === 0}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<Sparkles class="mx-auto size-8 text-muted-foreground" />
				<p class="mt-3 text-sm text-muted-foreground">You haven't added any services yet.</p>
				<Button class="mt-4" onclick={openCreate}>
					<Plus class="size-4" /> Add your first service
				</Button>
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each data.rows as service (service.id)}
				<Card.Root class="overflow-hidden">
					<div class="flex h-36 items-center justify-center bg-muted">
						{#if service.featuredImage}
							<img
								src={assetUrl(service.featuredImage)}
								alt={service.title}
								class="h-full w-full object-cover"
							/>
						{:else}
							<ImageOff class="size-8 text-muted-foreground" />
						{/if}
					</div>
					<Card.Content class="space-y-2 pt-4">
						<div class="flex items-start justify-between gap-2">
							<h3 class="font-medium">{service.title}</h3>
							<span class="shrink-0 text-xs text-muted-foreground"
								>{categoryName(service.categoryId)}</span
							>
						</div>
						{#if service.description}
							<p class="line-clamp-2 text-xs text-muted-foreground">{service.description}</p>
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

<FormDialog
	title="Add service"
	action="?/add"
	data={data.addForm}
	schema={vendorServiceAddSchema}
	bind:open={addOpen}
	seed={{ title: '', description: '', categoryId: undefined, currency: 'ETB' }}
	hideTrigger
	resetOnSuccess
	multipart
	submitLabel="Add service"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="title" label="Title" />
		<InputComp
			{form}
			{errors}
			name="categoryId"
			label="Category"
			type="select"
			items={data.categories}
		/>
		<InputComp {form} {errors} name="description" label="Description" type="textarea" rows={4} />
		<InputComp {form} {errors} name="featuredImage" label="Photo" type="file" />
		<InputComp {form} {errors} name="currency" type="hidden" />
	{/snippet}
</FormDialog>

<FormDialog
	title="Edit service"
	action="?/edit"
	data={data.editForm}
	schema={vendorServiceEditSchema}
	bind:open={editOpen}
	seed={editing
		? {
				id: editing.id,
				title: editing.title,
				description: editing.description ?? '',
				categoryId: editing.categoryId ?? undefined,
				currency: editing.currency
			}
		: {}}
	hideTrigger
	multipart
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="title" label="Title" />
		<InputComp
			{form}
			{errors}
			name="categoryId"
			label="Category"
			type="select"
			items={data.categories}
		/>
		<InputComp {form} {errors} name="description" label="Description" type="textarea" rows={4} />
		<InputComp
			{form}
			{errors}
			name="featuredImage"
			label="Photo"
			type="file"
			image={editing?.featuredImage ?? ''}
		/>
		<InputComp {form} {errors} name="currency" type="hidden" />
	{/snippet}
</FormDialog>

<FormDialog
	title="Remove this service?"
	description="{removing?.title ?? ''} will be removed from your public listing."
	action="?/delete"
	data={data.deleteForm}
	schema={idSchema}
	bind:open={removeOpen}
	seed={{ id: removing?.id }}
	hideTrigger
	submitLabel="Remove"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
	{/snippet}
</FormDialog>
