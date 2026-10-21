<script lang="ts">
	/**
	 * What guests can do on the invitation besides RSVP: see what is happening now on the day,
	 * send a money gift, leave a blessing, request a song, and open the photo wall. Sits inside
	 * `InvitationCard`, so it takes the card theme's colours.
	 */
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import { getLocale } from '$lib/paraglide/runtime';

	type CardEvent = {
		id: number;
		eventName: string;
		eventDate: Date | string | null;
		venueName: string | null;
	};

	let {
		events = [],
		defaultName = '',
		giftsEnabled = false,
		giftThanks = false,
		canPost = false,
		wallUrl = null
	}: {
		events?: CardEvent[];
		defaultName?: string;
		giftsEnabled?: boolean;
		giftThanks?: boolean;
		/** Blessings and songs: personal links and the wall link only. */
		canPost?: boolean;
		wallUrl?: string | null;
	} = $props();

	const TZ = 'Africa/Addis_Ababa';
	const dayOf = (d: Date) => new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d);

	let now = $state(new Date());
	$effect(() => {
		const timer = setInterval(() => (now = new Date()), 60_000);
		return () => clearInterval(timer);
	});

	/** On a wedding day: what started last and what comes next. */
	const live = $derived.by(() => {
		const today = dayOf(now);
		const todays = events
			.filter((e) => e.eventDate)
			.map((e) => ({ ...e, at: new Date(e.eventDate as string | Date) }))
			.filter((e) => dayOf(e.at) === today)
			.sort((a, b) => a.at.getTime() - b.at.getTime());
		if (!todays.length) return null;
		const started = todays.filter((e) => e.at <= now);
		return { current: started.at(-1) ?? null, next: todays.find((e) => e.at > now) ?? null };
	});
	const time = (d: Date) =>
		d.toLocaleTimeString(getLocale() === 'am' ? 'am-ET' : 'en-GB', {
			hour: '2-digit',
			minute: '2-digit',
			timeZone: TZ
		});

	const PRESETS = [500, 1000, 2000, 5000];
	let amount = $state(1000);
</script>

{#if live}
	<section class="panel live">
		<h2>{m.live_today()}</h2>
		{#if live.current}
			<p class="now"><span>{m.live_now()}</span>{live.current.eventName}</p>
			{#if live.current.venueName}<p class="hint">{live.current.venueName}</p>{/if}
		{/if}
		{#if live.next}
			<p class="next">
				<span>{m.live_next()} · {time(live.next.at)}</span>{live.next.eventName}
			</p>
		{/if}
	</section>
{/if}

{#if giftsEnabled}
	<section class="panel">
		<h2>{m.gift_title()}</h2>
		{#if giftThanks}
			<p class="answer">{m.gift_thanks()}</p>
		{:else}
			<p class="hint">{m.gift_lead()}</p>
			<!-- A plain POST: the answer is a redirect to Chapa's checkout, outside this site. -->
			<form method="POST" action="?/gift" class="form">
				<div class="presets">
					{#each PRESETS as preset (preset)}
						<button type="button" class:active={amount === preset} onclick={() => (amount = preset)}
							>{preset.toLocaleString()}</button
						>
					{/each}
				</div>
				<label class="field">
					<span>{m.gift_amount()}</span>
					<input name="amount" type="number" min="50" step="50" required bind:value={amount} />
				</label>
				<label class="field">
					<span>{m.gift_name()}</span>
					<input name="fromName" required minlength="2" maxlength="120" value={defaultName} />
				</label>
				<label class="field">
					<span>{m.gift_message()}</span>
					<textarea name="message" maxlength="500" rows="2"></textarea>
				</label>
				<label class="field">
					<span>{m.gift_phone()}</span>
					<input name="phone" type="tel" maxlength="20" autocomplete="tel" />
				</label>
				<input type="hidden" name="email" value="" />
				<button type="submit" class="send">{m.gift_send()}</button>
			</form>
		{/if}
	</section>
{/if}

{#if canPost}
	<section class="panel">
		<h2>{m.blessing_title()}</h2>
		<ActionForm action="?/post" class="form">
			{#snippet children({ busy })}
				<input type="hidden" name="kind" value="blessing" />
				<input type="hidden" name="authorName" value={defaultName || 'Guest'} />
				<label class="field">
					<span class="sr-only">{m.blessing_title()}</span>
					<textarea name="body" required maxlength="500" rows="3" placeholder={m.blessing_ph()}
					></textarea>
				</label>
				<button type="submit" class="send" disabled={!!busy}>{m.blessing_send()}</button>
			{/snippet}
		</ActionForm>
	</section>

	<section class="panel">
		<h2>{m.song_title()}</h2>
		<ActionForm action="?/post" class="form inline">
			{#snippet children({ busy })}
				<input type="hidden" name="kind" value="song" />
				<input type="hidden" name="authorName" value={defaultName || 'Guest'} />
				<label class="field grow">
					<span class="sr-only">{m.song_title()}</span>
					<input name="body" required maxlength="200" placeholder={m.song_ph()} />
				</label>
				<button type="submit" class="send" disabled={!!busy}>{m.song_send()}</button>
			{/snippet}
		</ActionForm>
	</section>
{/if}

{#if wallUrl}
	<section class="panel wall">
		<h2>{m.wall_title()}</h2>
		<p class="hint">{m.wall_lead()}</p>
		<a class="send" href={wallUrl}>{m.wall_title()}</a>
	</section>
{/if}

<style>
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
	.panel .form,
	.panel :global(.form) {
		display: grid;
		gap: 12px;
		margin-top: 14px;
	}
	.panel :global(.form.inline) {
		grid-template-columns: 1fr auto;
		align-items: end;
	}
	.field {
		display: grid;
		gap: 4px;
		font-size: 0.9rem;
		font-weight: 600;
	}
	.field input,
	.field textarea {
		font-weight: 400;
		padding: 10px 12px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
		background: color-mix(in srgb, var(--bg) 85%, white);
		color: var(--ink);
	}
	.send {
		display: block;
		padding: 12px 18px;
		border-radius: 999px;
		background: var(--accent);
		color: #fff;
		font-weight: 700;
		text-align: center;
	}
	.send:disabled {
		opacity: 0.6;
	}
	.wall .send {
		margin-top: 12px;
	}
	.presets {
		display: grid;
		grid-template-columns: repeat(4, 1fr);
		gap: 6px;
	}
	.presets button {
		padding: 8px 4px;
		border-radius: 10px;
		border: 1px solid color-mix(in srgb, var(--ink) 20%, transparent);
		font-weight: 600;
		font-size: 0.85rem;
	}
	.presets button.active {
		border-color: var(--accent);
		background: color-mix(in srgb, var(--accent) 15%, transparent);
	}
	.live {
		text-align: center;
	}
	.now,
	.next {
		margin-top: 10px;
		font-weight: 700;
		font-size: 1.05rem;
	}
	.now span,
	.next span {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		letter-spacing: 0.08em;
		text-transform: uppercase;
		color: var(--accent);
	}
	.next {
		font-weight: 600;
		font-size: 0.95rem;
	}
</style>
