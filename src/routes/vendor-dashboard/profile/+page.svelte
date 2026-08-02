<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { toast } from 'svelte-sonner';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import Errors from '$lib/formComponents/Errors.svelte';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Loader2 } from '@lucide/svelte';

	let { data } = $props();

	const { form, errors, enhance, delayed, allErrors, message } = superForm(data.form, {
		resetForm: false
	});

	$effect(() => {
		if (!$message) return;
		if ($message.type === 'error') toast.error($message.text);
		else toast.success($message.text);
	});

	const STATUS_VARIANT: Record<string, 'secondary' | 'default' | 'destructive'> = {
		pending: 'secondary',
		approved: 'default',
		rejected: 'destructive',
		suspended: 'destructive'
	};
</script>

<svelte:head>
	<title>Business Profile — Vendor Portal</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Business profile</h1>
			<p class="text-muted-foreground text-sm">
				This is what couples see on your public Leora Events listing.
			</p>
		</div>
		<Badge variant={STATUS_VARIANT[data.vendor.status] ?? 'secondary'} class="capitalize">
			{data.vendor.status}
		</Badge>
	</div>

	<FormCard title="Business details" description="Keep this accurate — it builds trust with couples.">
		<form method="POST" use:enhance class="space-y-1">
			<Errors allErrors={$allErrors} />

			<InputComp label="Business name" name="businessName" type="text" {form} {errors} />

			<InputComp
				label="Category"
				name="categoryId"
				type="combo"
				{form}
				{errors}
				items={data.categories}
				required
			/>

			<InputComp
				label="Description"
				name="description"
				type="textarea"
				rows={4}
				placeholder="Tell couples what makes your business special..."
				{form}
				{errors}
			/>

			<div class="grid gap-2 sm:grid-cols-2">
				<InputComp label="City" name="city" type="text" placeholder="Addis Ababa" {form} {errors} />
				<InputComp
					label="Phone"
					name="phone"
					type="tel"
					placeholder="+251 9__ ___ ___"
					{form}
					{errors}
				/>
			</div>

			<InputComp
				label="Address"
				name="address"
				type="text"
				placeholder="Street, building, area"
				{form}
				{errors}
			/>

			<div class="grid gap-2 sm:grid-cols-2">
				<InputComp
					label="Public email"
					name="email"
					type="email"
					placeholder="hello@yourbusiness.com"
					{form}
					{errors}
				/>
				<InputComp
					label="Website"
					name="website"
					type="url"
					placeholder="https://yourbusiness.com"
					{form}
					{errors}
				/>
			</div>

			<div class="grid gap-2 sm:grid-cols-2">
				<InputComp
					label="Starting price (ETB)"
					name="priceMin"
					type="number"
					placeholder="20,000"
					{form}
					{errors}
				/>
				<InputComp
					label="Highest price (ETB)"
					name="priceMax"
					type="number"
					placeholder="150,000"
					{form}
					{errors}
				/>
			</div>

			<Button type="submit" class="mt-4 w-full sm:w-auto" disabled={$delayed}>
				{#if $delayed}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
				Save changes
			</Button>
		</form>
	</FormCard>
</div>
