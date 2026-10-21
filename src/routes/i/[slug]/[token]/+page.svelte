<script lang="ts">
	import { useDateFormat } from '@nahu/admin-kit/dateFormat.svelte';
	import { dateLocale } from '$lib/dateLocale';
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import InvitationCard from '$lib/components/card/InvitationCard.svelte';
	import GuestPanels from '$lib/components/card/GuestPanels.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	const p = $derived(data.page);
	const g = $derived(data.guest);
	const names = $derived([p.couple.brideName, p.couple.groomName].filter(Boolean).join(' & '));
	const maxParty = $derived(1 + g.plusOnes);

	// svelte-ignore state_referenced_locally
	let attending = $state<'yes' | 'no'>(g.rsvpStatus === 'declined' ? 'no' : 'yes');
	// svelte-ignore state_referenced_locally
	let editing = $state(!g.replied);

	const formatDay = useDateFormat(dateLocale());
	const deadline = $derived(p.card.rsvpDeadline ? formatDay(p.card.rsvpDeadline, 'long') : null);
</script>

<svelte:head>
	<title>{m.inv_title({ names })}</title>
	<meta name="robots" content="noindex" />
</svelte:head>

<main class="invite-page theme-bg-{p.card.theme}">
	{#if p.isPreview}
		<p class="preview">{m.inv_preview()}</p>
	{/if}
	<InvitationCard
		theme={p.card.theme}
		brideName={p.couple.brideName}
		groomName={p.couple.groomName}
		headline={p.card.headline}
		message={p.card.message}
		coverImage={p.card.coverImage}
		countdownTo={p.countdownTo}
		city={p.city}
		mapUrl={p.card.mapUrl}
		events={p.events}
		guestName={g.fullName}
	>
		<section class="panel">
			<h2>{m.inv_rsvp_title()}</h2>
			{#if deadline}<p class="hint">{m.inv_rsvp_by({ date: deadline })}</p>{/if}

			{#if g.replied && !editing}
				<p class="answer">
					{m.inv_your_reply({
						answer:
							g.rsvpStatus === 'confirmed'
								? m.inv_reply_coming({ n: g.rsvpPartySize ?? 1 })
								: m.inv_reply_not()
					})}
				</p>
				{#if !data.closed}
					<button type="button" class="link" onclick={() => (editing = true)}
						>{m.inv_change()}</button
					>
				{/if}
			{:else if data.closed}
				<p class="hint">{m.inv_closed()}</p>
			{:else}
				<ActionForm action="?/rsvp" reset={false} onDone={() => (editing = false)} class="form">
					{#snippet children({ busy })}
						<div class="choices">
							<label class:active={attending === 'yes'}>
								<input type="radio" name="attending" value="yes" bind:group={attending} />
								{m.inv_attending()}
							</label>
							<label class:active={attending === 'no'}>
								<input type="radio" name="attending" value="no" bind:group={attending} />
								{m.inv_declining()}
							</label>
						</div>
						{#if attending === 'yes'}
							{#if maxParty > 1}
								<label class="field">
									<span>{m.inv_party_size()}</span>
									<select name="partySize" value={String(g.rsvpPartySize || 1)}>
										{#each Array.from({ length: maxParty }, (_, i) => i + 1) as n (n)}
											<option value={String(n)}>{n}</option>
										{/each}
									</select>
									<small>{m.inv_party_max({ max: maxParty })}</small>
								</label>
							{:else}
								<input type="hidden" name="partySize" value="1" />
							{/if}
							<label class="field">
								<span>{m.inv_meal()}</span>
								<input
									name="mealPreference"
									maxlength="100"
									value={g.mealPreference ?? ''}
									placeholder={m.inv_meal_ph()}
								/>
							</label>
						{:else}
							<input type="hidden" name="partySize" value="0" />
							<input type="hidden" name="mealPreference" value="" />
						{/if}
						<label class="field">
							<span>{m.inv_note()}</span>
							<textarea name="note" maxlength="500" rows="3">{g.rsvpNote ?? ''}</textarea>
						</label>
						<button type="submit" class="send" disabled={!!busy}>{m.inv_send()}</button>
					{/snippet}
				</ActionForm>
			{/if}
		</section>

		{#if g.rsvpStatus === 'confirmed'}
			<section class="panel pass">
				<h2>{m.inv_qr_title()}</h2>
				{#if g.checkedIn}
					<p class="answer">{m.inv_checked_in()}</p>
				{:else}
					<img src={data.qr} alt={m.inv_qr_title()} width="200" height="200" />
					<p class="hint">{m.inv_qr_hint()}</p>
				{/if}
			</section>
		{/if}

		<GuestPanels
			events={p.events}
			defaultName={g.fullName}
			giftsEnabled={p.card.giftsEnabled && !p.isPreview}
			giftThanks={data.giftThanks}
			canPost
			wallUrl={data.wallUrl}
		/>
	</InvitationCard>
</main>

<style>
	.invite-page {
		min-height: 100dvh;
		padding: 24px 12px 48px;
		background: #efe8dc;
	}
	.theme-bg-royal {
		background: #061428;
	}
	.theme-bg-garden {
		background: #e3ebdd;
	}
	.preview {
		max-width: 560px;
		margin: 0 auto 12px;
		padding: 8px 12px;
		border-radius: 10px;
		background: #fff3cd;
		color: #664d03;
		font-size: 0.85rem;
		text-align: center;
	}
	.panel {
		background: var(--panel);
		border: 1px solid color-mix(in srgb, var(--accent) 30%, transparent);
		border-radius: 18px;
		padding: 20px;
		margin-top: 16px;
	}
	.panel h2 {
		font-family: var(--font-display);
		font-size: 1.25rem;
		font-weight: 800;
		text-align: center;
	}
	.hint {
		margin-top: 6px;
		font-size: 0.85rem;
		color: var(--muted);
		text-align: center;
	}
	.answer {
		margin-top: 10px;
		text-align: center;
		font-weight: 600;
	}
	.link {
		display: block;
		margin: 8px auto 0;
		color: var(--accent);
		text-decoration: underline;
	}
	.panel :global(.form) {
		display: grid;
		gap: 14px;
		margin-top: 14px;
	}
	.choices {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 8px;
	}
	.choices label {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 6px;
		padding: 12px 8px;
		border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
		border-radius: 12px;
		font-weight: 600;
		font-size: 0.9rem;
		cursor: pointer;
		text-align: center;
	}
	.choices label.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.choices input {
		position: absolute;
		opacity: 0;
		pointer-events: none;
	}
	.field {
		display: grid;
		gap: 4px;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.field input,
	.field select,
	.field textarea {
		font-weight: 400;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
		background: color-mix(in srgb, var(--bg) 85%, white);
		color: var(--ink);
	}
	.field small {
		font-weight: 400;
		color: var(--muted);
	}
	.send {
		padding: 12px;
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
	}
	.send:disabled {
		opacity: 0.6;
	}
	.pass {
		text-align: center;
	}
	.pass img {
		margin: 12px auto 0;
		border-radius: 12px;
		background: white;
		padding: 8px;
	}
</style>
