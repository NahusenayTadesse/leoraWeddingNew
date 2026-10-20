<script lang="ts">
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { formatETB } from '$lib/money';
	import { vendorPackageAddSchema, vendorPackageEditSchema } from '$lib/schemas/vendor-packages';
	import { idSchema } from '$lib/schemas/common';
	import { Plus, Pencil, Trash2, PackageOpen, Check } from '@lucide/svelte';

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
</script>

<div class="space-y-6">
	<PageHeader
		title="Packages"
		tabTitle="Packages — Vendor Portal"
		description="Priced bundles couples can pick straight from your listing."
	>
		{#snippet actions()}
			<Button onclick={openCreate}><Plus class="size-4" /> Add package</Button>
		{/snippet}
	</PageHeader>

	{#if data.rows.length === 0}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<PackageOpen class="mx-auto size-8 text-muted-foreground" />
				<p class="mt-3 text-sm text-muted-foreground">You haven't published any packages yet.</p>
				<Button class="mt-4" onclick={openCreate}>
					<Plus class="size-4" /> Add your first package
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
							<span class="text-lg font-bold whitespace-nowrap text-primary">
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
								<!-- Index-keyed: inclusions are free text a vendor typed, so the
								     same line can repeat and value keys throw each_key_duplicate. -->
								{#each pkg.inclusions.slice(0, 4) as item, i (i)}
									<li class="flex items-start gap-1.5">
										<Check class="mt-0.5 size-3.5 shrink-0 text-emerald-600" />
										<span>{item}</span>
									</li>
								{/each}
								{#if pkg.inclusions.length > 4}
									<li class="text-xs text-muted-foreground">
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

<FormDialog
	title="Add package"
	action="?/add"
	data={data.addForm}
	schema={vendorPackageAddSchema}
	bind:open={addOpen}
	seed={{ name: '', description: '', inclusions: '' }}
	hideTrigger
	resetOnSuccess
	submitLabel="Add package"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="name" label="Package name" />
		<InputComp {form} {errors} name="price" label="Price (ETB)" type="number" min={0} />
		<InputComp {form} {errors} name="description" label="Description" type="textarea" rows={3} />
		<InputComp
			{form}
			{errors}
			name="inclusions"
			label="What's included (one per line)"
			type="textarea"
			rows={5}
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Edit package"
	action="?/edit"
	data={data.editForm}
	schema={vendorPackageEditSchema}
	bind:open={editOpen}
	seed={editing
		? {
				id: editing.id,
				name: editing.name,
				price: Number(editing.price),
				description: editing.description ?? '',
				inclusions: (editing.inclusions ?? []).join('\n')
			}
		: {}}
	hideTrigger
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="name" label="Package name" />
		<InputComp {form} {errors} name="price" label="Price (ETB)" type="number" min={0} />
		<InputComp {form} {errors} name="description" label="Description" type="textarea" rows={3} />
		<InputComp
			{form}
			{errors}
			name="inclusions"
			label="What's included (one per line)"
			type="textarea"
			rows={5}
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Remove this package?"
	description="{removing?.name ?? ''} will be removed from your public listing."
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
