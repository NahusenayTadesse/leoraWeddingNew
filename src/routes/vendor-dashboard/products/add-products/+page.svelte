<script lang="ts">
	import type { Snapshot } from '@sveltejs/kit';

	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';

	import { Plus, X } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { add as schema } from './schema';
	import { superForm } from 'sveltekit-superforms/client';
	import Errors from '$lib/formComponents/Errors.svelte';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';

	let { data } = $props();

	const { form, errors, enhance, delayed, allErrors, capture, restore, message } = superForm(
		data.form,
		{
			taintedMessage: () => {
				return new Promise((resolve) => {
					resolve(window.confirm('Do you want to leave?\nChanges you made may not be saved.'));
				});
			},
			validators: zod4Client(schema),
			dataType: 'json'
		}
	);

	export const snapshot: Snapshot = { capture, restore };

	import { toast } from 'svelte-sonner';

	$effect(() => {
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let images = $state([]);
</script>

<svelte:head>
	<title>Add New Product Item</title>
</svelte:head>
<FormCard
	title="Add A Product Item"
	description="Add New Inventory Items to track the how many have"
>
	<form
		use:enhance
		action="?/addProduct"
		id="main"
		class="flex flex-col gap-4"
		method="POST"
		enctype="multipart/form-data"
	>
		<Errors allErrors={$allErrors} />

		<InputComp
			{form}
			{errors}
			type="text"
			name="productName"
			label="Product Name"
			placeholder="Enter Product Name"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="textarea"
			name="description"
			label="Product Discription"
			placeholder="Enter Product Description"
			required
		/>

		<InputComp
			{form}
			{errors}
			type="combo"
			name="category"
			label="Product Category"
			placeholder="Enter Product Name"
			required
			items={data?.allCategories}
		/>
		{#if $form.category}
			<InputComp
				{form}
				{errors}
				type="checkbox"
				name="subCategory"
				label="Product Subcategories"
				placeholder="Select Subcategories"
				required
				items={data?.subs?.filter((sub) => sub.parentId === $form.category)}
			/>
		{/if}

		{#if $form.subCategory && data?.subsubs?.filter( (sub) => $form.subCategory.includes(sub.parentId) ).length}
			<InputComp
				{form}
				{errors}
				type="checkbox"
				name="subSubCategory"
				label="Product Sub Sub Categories"
				placeholder="Select Sub Sub Categories"
				required
				items={data?.subsubs?.filter((sub) => $form.subCategory.includes(sub.parentId))}
			/>
		{/if}

		<InputComp
			{form}
			{errors}
			type="file"
			name="image"
			label="Product Image"
			placeholder="Upload Product Image"
			required
		/>
		<InputComp
			{form}
			{errors}
			type="gallery"
			name="gallery"
			label="Product Gallery Images"
			placeholder="Upload Product Gallery Images"
			required
			bind:images
		/>

		<Button type="submit" class="mt-4" form="main">
			{#if $delayed}
				<LoadingBtn name="Adding Product" />
			{:else}
				<Plus class="h-4 w-4" />

				Add Product
			{/if}
		</Button>
	</form>
</FormCard>
