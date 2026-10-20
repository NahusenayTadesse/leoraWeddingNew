<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import { resendVerificationSchema } from '$lib/schemas/auth';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed } = createForm(data.form, resendVerificationSchema, {
		resetForm: false
	});
</script>

<svelte:head>
	<title>{m.auth_check_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard
	title={m.auth_check_title()}
	subtitle={data.email ? m.auth_check_sub({ email: data.email }) : m.auth_check_sub_generic()}
>
	<p class="mb-4 text-center text-sm text-muted-foreground">{m.auth_check_spam()}</p>
	<form method="POST" use:enhance>
		{#if data.email}
			<input type="hidden" name="email" value={$form.email} />
		{:else}
			<InputComp {form} {errors} name="email" label={m.auth_email()} type="email" required />
		{/if}
		<Button type="submit" variant="outline" class="h-11 w-full">
			{#if $delayed}<LoadingBtn name={m.auth_forgot_sending()} />{:else}{m.auth_check_resend()}{/if}
		</Button>
	</form>
	<p class="mt-5 text-center"><a class="auth-link" href="/login">{m.auth_back_to_login()}</a></p>
</AuthCard>
