<script lang="ts">
	import type { Snippet } from 'svelte';

	/** The card the auth pages share, styled like the main log-in card (`AuthPanel`). */
	let { title, subtitle, children }: { title: string; subtitle?: string; children: Snippet } =
		$props();
</script>

<div class="flex flex-1 items-center justify-center">
	<div class="auth-shell">
		<div class="auth-card">
			<div class="auth-head">
				<h1>{title}</h1>
				{#if subtitle}<p>{subtitle}</p>{/if}
			</div>
			{@render children()}
		</div>
	</div>
</div>

<style>
	.auth-shell {
		width: 100%;
		max-width: 430px;
		margin: 0 auto;
		padding: 48px 20px;
	}
	.auth-card {
		background: var(--card);
		border: 1px solid var(--border);
		border-radius: 20px;
		box-shadow: var(--card-shadow);
		padding: 36px 32px;
	}
	.auth-head {
		text-align: center;
		margin-bottom: 22px;
	}
	.auth-head h1 {
		font-family: var(--font-display);
		font-size: 24px;
		font-weight: 800;
		letter-spacing: -0.02em;
		margin: 0 0 6px;
	}
	.auth-head p {
		font-size: 14px;
		color: var(--muted-foreground);
		margin: 0;
	}
	.auth-card :global(.auth-link) {
		color: var(--leora-gold-dark);
		font-weight: 600;
		font-size: 13.5px;
	}
	:global(.dark) .auth-card :global(.auth-link) {
		color: var(--leora-gold);
	}
</style>
