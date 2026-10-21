<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import { page } from '$app/state';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const back = $derived(encodeURIComponent(page.url.pathname));
</script>

<svelte:head>
	<title>{m.join_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

{#if !data.valid}
	<AuthCard title={m.join_invalid_title()} subtitle={m.join_invalid_body()}>
		<Button href="/" variant="outline" class="h-11 w-full">Leora Events</Button>
	</AuthCard>
{:else}
	<AuthCard title={m.join_title()} subtitle={m.join_lead({ names: data.names })}>
		{#if data.member}
			<p class="mb-4 text-center text-sm text-muted-foreground">{m.join_err_already()}</p>
			<Button href="/wedding" class="h-11 w-full">{m.join_button()}</Button>
		{:else if data.full}
			<p class="text-center text-sm text-muted-foreground">{m.join_err_full()}</p>
		{:else if data.loggedIn}
			<div class="space-y-2">
				<ActionForm action="?/join">
					{#snippet children({ busy })}
						<Button type="submit" class="h-11 w-full" disabled={!!busy}>{m.join_button()}</Button>
					{/snippet}
				</ActionForm>
				<form method="POST" action="?/notNow">
					<Button type="submit" variant="ghost" class="w-full">{m.join_not_now()}</Button>
				</form>
			</div>
		{:else}
			<div class="space-y-2">
				<Button href="/signup?redirectTo={back}" class="h-11 w-full">{m.join_signup()}</Button>
				<Button href="/login?redirectTo={back}" variant="outline" class="h-11 w-full">
					{m.join_login()}
				</Button>
			</div>
			<p class="mt-4 text-center text-xs text-muted-foreground">{m.join_signup_hint()}</p>
		{/if}
	</AuthCard>
{/if}
