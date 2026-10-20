<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import { resetPasswordSchema } from '$lib/schemas/auth';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed } = createForm(data.form, resetPasswordSchema, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>{m.auth_reset_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if data.invalid}
	<AuthCard title={m.auth_reset_title()} subtitle={m.auth_reset_invalid()}>
		<Button href="/forgot-password" class="h-11 w-full">{m.auth_reset_request_new()}</Button>
	</AuthCard>
{:else}
	<AuthCard title={m.auth_reset_title()} subtitle={m.auth_reset_sub()}>
		<form method="POST" use:enhance>
			<input type="hidden" name="token" value={$form.token} />
			<InputComp
				{form}
				{errors}
				name="newPassword"
				label={m.auth_new_password()}
				type="password"
				required
			/>
			<InputComp
				{form}
				{errors}
				name="confirmPassword"
				label={m.auth_confirm_password()}
				type="password"
				required
			/>
			<Button type="submit" class="h-11 w-full">
				{#if $delayed}<LoadingBtn name={m.auth_reset_saving()} />{:else}{m.auth_reset_submit()}{/if}
			</Button>
		</form>
		<p class="mt-5 text-center"><a class="auth-link" href="/login">{m.auth_back_to_login()}</a></p>
	</AuthCard>
{/if}
