<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';

	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { addUser, type SignupSchema } from '$lib/ZodSchema';
	import Errors from '@nahu/admin-kit/formComponents/Errors.svelte';

	let {
		data,
		action = '?/signup'
	}: { data: SuperValidated<Infer<SignupSchema>>; action?: string } = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, delayed, enhance, allErrors } = createForm(data, addUser);
</script>

<form method="POST" id="main" {action} use:enhance>
	<Errors allErrors={$allErrors} />

	<div class="grid gap-4">
		<InputComp
			label="Groom Name"
			name="groomName"
			type="text"
			{form}
			{errors}
			placeholder="Abebe Alemu"
		/>
		<InputComp
			label="Bride Name"
			name="brideName"
			type="text"
			{form}
			{errors}
			placeholder="Tsehay Kebede"
		/>
	</div>
	<InputComp
		label="Email Address"
		name="email"
		type="email"
		{form}
		{errors}
		placeholder="john@example.com"
	/>
	<InputComp
		label="Phone Number"
		name="phone"
		type="tel"
		{form}
		{errors}
		placeholder="+251 9-11-00-00-00"
	/>
	<InputComp
		label="Phone Number (Optional)"
		name="phone2"
		type="tel"
		{form}
		{errors}
		placeholder="+251 9-11-00-00-00"
	/>

	<InputComp label="Password" name="password" type="password" {form} {errors} required />
	<Button type="submit" form="main" class="h-12 w-full text-lg shadow-md">
		{#if $delayed}
			<LoadingBtn name="Signing You Up" />
		{:else}
			Sign Up
		{/if}
	</Button>
</form>
