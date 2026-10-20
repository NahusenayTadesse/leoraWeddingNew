<script lang="ts">
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import AuthCard from '$lib/components/auth/AuthCard.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let method = $state<'totp' | 'backup'>('totp');
</script>

<svelte:head>
	<title>{m.tfa_title()} — Leora Events</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<AuthCard title={m.tfa_title()} subtitle={method === 'totp' ? m.tfa_sub() : m.tfa_backup_code()}>
	<ActionForm fields={{ method }} reset={false} class="space-y-4">
		{#snippet children({ busy })}
			<label class="block space-y-1.5 text-sm font-medium">
				<span>{method === 'totp' ? m.tfa_code() : m.tfa_backup_code()}</span>
				<input
					name="code"
					required
					autocomplete="one-time-code"
					inputmode={method === 'totp' ? 'numeric' : 'text'}
					pattern={method === 'totp' ? '[0-9 ]{6,7}' : undefined}
					maxlength="32"
					class="h-11 w-full rounded-md border bg-background px-3 text-center text-lg tracking-widest"
				/>
			</label>
			<label class="flex items-center gap-2 text-sm">
				<input type="checkbox" name="trustDevice" />
				<span>{m.tfa_trust()}</span>
			</label>
			<Button type="submit" class="h-11 w-full" disabled={!!busy}>{m.tfa_verify()}</Button>
		{/snippet}
	</ActionForm>
	<p class="mt-4 text-center">
		<button
			type="button"
			class="auth-link"
			onclick={() => (method = method === 'totp' ? 'backup' : 'totp')}
		>
			{method === 'totp' ? m.tfa_use_backup() : m.tfa_use_app()}
		</button>
	</p>
	<p class="mt-2 text-center"><a class="auth-link" href="/login">{m.auth_back_to_login()}</a></p>
</AuthCard>
