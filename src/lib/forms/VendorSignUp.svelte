<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { VendorSchema } from '$lib/ZodSchema';
	import { Eye, EyeOff, MapPin, Type } from '@lucide/svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	let {
		data,
		action = '?/signup',
		cityList = [],
		subCityList = [],
		categoryList = []
	}: {
		data: SuperValidated<Infer<VendorSchema>>;
		action?: string;
		cityList: { value: string | number; name: string }[];
		categoryList: { value: string | number; name: string }[];
		subCityList: { value: string | number; name: string; cityId: string | number }[];
	} = $props();

	const { form, errors, delayed, enhance, allErrors, message } = superForm(data, {});

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

	let eye = $state(false);
	let EyeIcon = $derived(eye ? EyeOff : Eye);
</script>

<!-- <Card.Root class="mx-auto flex w-full max-w-md flex-col justify-center justify-self-center ">
	<Card.Header>
		<a href="/" class="flex cursor-pointer items-center gap-2">
			<div
				class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-leora-gold to-leora-champagne"
			>
				<Heart class="h-5 w-5 fill-white text-white" />
			</div>
			<div class="flex flex-col">
				<span class="font-display text-2xl font-semibold text-leora-charcoal">Leora</span>
				<span class="text-xs tracking-widest text-leora-gold uppercase">Events</span>
			</div>
		</a>
		<Card.Title class="flex flex-row justify-between text-2xl">Sign Up</Card.Title>
		<Card.Description>Sign up as a vendor and sell your products</Card.Description>
	</Card.Header>
	<Card.Content> -->
<form method="POST" id="main" {action} use:enhance>
	<Errors allErrors={$allErrors} />

	<div class="grid gap-4">
		<InputComp label="Business Name" name="businessName" type="text" {form} {errors} />
		<InputComp
			label="Business Type"
			name="vendorCategory"
			type="combo"
			{form}
			{errors}
			items={categoryList}
		/>
		<InputComp
			label="Phone Number"
			name="phone"
			type="tel"
			{form}
			{errors}
			placeholder="Tsehay Kebede"
			items={categoryList}
		/>
		<InputComp
			label="Email Address"
			name="email"
			type="email"
			{form}
			{errors}
			placeholder="Tsehay Kebede"
			items={categoryList}
		/>
	</div>

	<div class="grid gap-2">
		<div class="flex items-center">
			<Label for="password">Password</Label>
		</div>
		<div class="relative">
			<Input
				id="password"
				name="password"
				type={eye ? 'text' : 'password'}
				bind:value={$form.password}
				required
			/>
			<button type="button" onclick={() => (eye = !eye)} title="Make Password Visible">
				<EyeIcon
					class="absolute top-0.5 right-2 h-6 w-6 transition-transform duration-300 ease-in-out"
				/>
			</button>
			{#if $errors.password}<span class="text-red-500">{$errors.password}</span>{/if}
		</div>
	</div>
	<InputComp
		label="Description"
		name="description"
		type="textarea"
		{form}
		{errors}
		placeholder="tell us about your business"
	/>
	<div class="my-8">
		<h2 class="flex flex-row items-start justify-start gap-1 text-center font-bold">
			<MapPin class="h-5 w-5 text-primary" />
			Business Address
		</h2>
	</div>

	<InputComp label="City of Business" name="city" type="combo" {form} {errors} items={cityList} />

	<InputComp
		label="Subcity"
		name="subcity"
		type="combo"
		{form}
		{errors}
		items={$form.city
			? subCityList.filter((item) => item.cityId === $form.city)
			: [{ value: '', name: 'Select City First' }]}
	/>
	<InputComp label="Street Address or Name" name="street" type="text" {form} {errors} />
	<InputComp
		label="Building Name or Number"
		name="buildingNumber"
		type="text"
		placeholder="Enter Building Name or Number where you are located"
		{form}
		{errors}
	/>
	<InputComp
		label="Floor"
		name="floor"
		type="text"
		placeholder="Enter Floor Number"
		{form}
		{errors}
	/>
	<InputComp
		label="Office Number"
		name="houseNumber"
		type="text"
		placeholder="Enter your office number"
		{form}
		{errors}
	/>

	<InputComp label="Kebele" name="kebele" type="text" placeholder="Enter Kebele" {form} {errors} />

	<InputComp
		label="Enter Your Google Maps URL"
		name="googleMapsUrl"
		type="url"
		placeholder="Enter your Google Maps URL"
		{form}
		{errors}
	/>

	<Button type="submit" form="main" class="mt-6 h-12 w-full text-lg shadow-md">
		{#if $delayed}
			<LoadingBtn name="Registering Your Business" />
		{:else}
			Register as a Vendor
		{/if}
	</Button>
</form>
<!-- </Card.Content>
</Card.Root> -->
