<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Card from '$lib/components/ui/card/index.js';

	import InputComp from '$lib/formComponents/InputComp.svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

	import type { SuperValidated, Infer } from 'sveltekit-superforms';
	import { superForm } from 'sveltekit-superforms';
	import type { SignupSchema } from '$lib/ZodSchema';
	import DarkMode from '$lib/components/DarkMode.svelte';
	import { Eye, Heart, EyeOff } from '@lucide/svelte';
	import Errors from '$lib/formComponents/Errors.svelte';

	let {
		data,
		action = '?/signup'
	}: { data: SuperValidated<Infer<SignupSchema>>; action?: string } = $props();

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

<Card.Root class="mx-auto flex w-full max-w-md flex-col justify-center justify-self-center ">
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
		<Card.Description>Enter your email below to login to your account</Card.Description>
	</Card.Header>
	<Card.Content>
		<form method="POST" id="main" {action} use:enhance>
			<Errors allErrors={$allErrors} />

			<div class="grid gap-4">
				<InputComp
					label="Full Name"
					name="name"
					type="text"
					{form}
					{errors}
					placeholder="John Doe"
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
			<Button type="submit" form="main" class="h-12 w-full text-lg shadow-md">
				{#if $delayed}
					<LoadingBtn name="Signing You Up" />
				{:else}
					Sign Up
				{/if}
			</Button>
		</form>
	</Card.Content>
</Card.Root>
