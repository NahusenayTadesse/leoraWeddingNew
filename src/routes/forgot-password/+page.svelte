<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import { forgotPasswordSchema } from '$lib/schemas/auth';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed, message } = createForm(data.form, forgotPasswordSchema, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>{m.auth_forgot_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard title={m.auth_forgot_title()} subtitle={m.auth_forgot_sub()}>
	{#if $message?.type === 'success'}
		<p class="mb-4 rounded-md bg-muted p-3 text-sm" role="status">{$message.text}</p>
	{/if}
	<form method="POST" use:enhance>
		<InputComp {form} {errors} name="email" label={m.auth_email()} type="email" required />
		<Button type="submit" class="h-11 w-full">
			{#if $delayed}<LoadingBtn
					name={m.auth_forgot_sending()}
				/>{:else}{m.auth_forgot_submit()}{/if}
		</Button>
	</form>
	<p class="mt-5 text-center"><a class="auth-link" href="/login">{m.auth_back_to_login()}</a></p>
</AuthCard>
