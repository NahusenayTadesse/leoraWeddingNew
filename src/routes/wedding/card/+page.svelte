<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { CopyIcon, ExternalLinkIcon, SendIcon, MessageCircleIcon } from '@lucide/svelte';
	import { toast } from 'svelte-sonner';
	import InvitationCard from '$lib/components/card/InvitationCard.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	const p = $derived(data.page);
	const cardUrl = $derived(`${data.origin}/i/${data.slug}`);
	const names = $derived([p.couple.brideName, p.couple.groomName].filter(Boolean).join(' & '));

	// Local copies of the form fields drive the live preview; seeded once from the saved card.
	// svelte-ignore state_referenced_locally
	let theme = $state(p.card.theme);
	// svelte-ignore state_referenced_locally
	let headline = $state(p.card.headline ?? '');
	// svelte-ignore state_referenced_locally
	let message = $state(p.card.message ?? '');
	// svelte-ignore state_referenced_locally
	let mapUrl = $state(p.card.mapUrl ?? '');
	let coverPreview = $state<string | null>(null);
	let removeCover = $state(false);

	const THEMES = [
		{
			value: 'habesha',
			label: m.ced_theme_habesha(),
			swatch: 'linear-gradient(90deg,#1f6f43,#d4af37,#b3261e)'
		},
		{
			value: 'royal',
			label: m.ced_theme_royal(),
			swatch: 'linear-gradient(90deg,#0b1f3a,#d4af37)'
		},
		{
			value: 'garden',
			label: m.ced_theme_garden(),
			swatch: 'linear-gradient(90deg,#a8c69f,#e8b4b8)'
		}
	] as const;

	const counts = $derived({
		yes: data.invites.filter((g) => g.rsvpStatus === 'confirmed').length,
		no: data.invites.filter((g) => g.rsvpStatus === 'declined').length,
		waiting: data.invites.filter((g) => g.rsvpStatus === 'pending').length,
		people: data.invites.reduce(
			(n, g) => n + (g.rsvpStatus === 'confirmed' ? (g.rsvpPartySize ?? 1) : 0),
			0
		)
	});

	const linkFor = (token: string | null) => (token ? `${cardUrl}/${token}` : '');
	const shareText = (token: string | null) => m.ced_share_msg({ names, link: linkFor(token) });
	/** Ethiopian mobiles as international digits for wa.me. */
	const waNumber = (phone: string | null) => {
		const d = (phone ?? '').replace(/\D/g, '');
		if (/^0[79]\d{8}$/.test(d)) return `251${d.slice(1)}`;
		if (/^251[79]\d{8}$/.test(d)) return d;
		return '';
	};

	async function copy(text: string) {
		try {
			await navigator.clipboard.writeText(text);
			toast.success(m.ced_copied());
		} catch {
			window.prompt(m.ced_copy(), text);
		}
	}

	function onCover(e: Event) {
		const file = (e.currentTarget as HTMLInputElement).files?.[0];
		coverPreview = file ? URL.createObjectURL(file) : null;
		removeCover = false;
	}
</script>

<svelte:head>
	<title>{m.ced_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex flex-wrap items-end justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">{m.ced_title()}</h1>
			<p class="text-sm text-muted-foreground">{m.ced_sub()}</p>
		</div>
		<div class="flex flex-wrap gap-2">
			<Button href="/i/{data.slug}" target="_blank" variant="outline">
				<ExternalLinkIcon class="size-4" />{m.ced_preview()}
			</Button>
			<ActionForm action="?/publish" fields={{ published: p.card.published ? 'no' : 'yes' }}>
				{#snippet children({ busy })}
					<Button
						type="submit"
						variant={p.card.published ? 'outline' : 'default'}
						disabled={!!busy || (!p.card.published && !data.publishable)}
					>
						{p.card.published ? m.ced_unpublish() : m.ced_publish()}
					</Button>
				{/snippet}
			</ActionForm>
		</div>
	</div>

	<Card.Root class="p-4 text-sm">
		{#if p.card.published}
			<p class="flex flex-wrap items-center gap-2">
				<Badge>{m.ced_published()}</Badge>
				<span class="text-muted-foreground">{m.ced_live_at()}</span>
				<a href="/i/{data.slug}" target="_blank" class="font-medium break-all underline"
					>{cardUrl}</a
				>
				<Button size="sm" variant="ghost" onclick={() => copy(cardUrl)}
					><CopyIcon class="size-4" /></Button
				>
			</p>
		{:else}
			<p class="flex flex-wrap items-center gap-2">
				<Badge variant="secondary">{m.ced_draft()}</Badge>
				{#if !data.publishable}
					<span class="text-muted-foreground">{m.ced_needs_plan()}</span>
					<a href="/pricing" class="font-medium underline">{m.ced_see_plans()}</a>
				{/if}
			</p>
		{/if}
	</Card.Root>

	<div class="grid gap-6 lg:grid-cols-[1fr_minmax(0,460px)]">
		<div class="space-y-6">
			<Card.Root>
				<Card.Header><Card.Title>{m.ced_design()}</Card.Title></Card.Header>
				<Card.Content>
					<ActionForm action="?/save" reset={false} enctype="multipart/form-data" class="space-y-4">
						{#snippet children({ busy })}
							<fieldset>
								<legend class="mb-2 text-sm font-medium">{m.ced_theme()}</legend>
								<div class="grid grid-cols-3 gap-2">
									{#each THEMES as t (t.value)}
										<label
											class={[
												'cursor-pointer rounded-lg border p-2 text-center text-sm',
												theme === t.value && 'ring-2 ring-(--leora-gold)'
											]}
										>
											<input
												type="radio"
												name="theme"
												value={t.value}
												bind:group={theme}
												class="sr-only"
											/>
											<span class="mb-1 block h-6 rounded" style="background:{t.swatch}"></span>
											{t.label}
										</label>
									{/each}
								</div>
							</fieldset>
							<label class="block space-y-1.5 text-sm font-medium">
								<span>{m.ced_headline()}</span>
								<input
									name="headline"
									maxlength="150"
									bind:value={headline}
									placeholder={m.inv_default_headline()}
									class="h-10 w-full rounded-md border bg-background px-3 font-normal"
								/>
							</label>
							<label class="block space-y-1.5 text-sm font-medium">
								<span>{m.ced_message()}</span>
								<textarea
									name="message"
									rows="4"
									maxlength="2000"
									bind:value={message}
									class="w-full rounded-md border bg-background p-2 font-normal"
								></textarea>
							</label>
							<div class="grid gap-4 sm:grid-cols-2">
								<label class="block space-y-1.5 text-sm font-medium">
									<span>{m.ced_deadline()}</span>
									<input
										name="rsvpDeadline"
										type="date"
										value={p.card.rsvpDeadline ?? ''}
										class="h-10 w-full rounded-md border bg-background px-3 font-normal"
									/>
								</label>
								<label class="block space-y-1.5 text-sm font-medium">
									<span>{m.ced_map()}</span>
									<input
										name="mapUrl"
										type="url"
										maxlength="500"
										bind:value={mapUrl}
										placeholder="https://maps.app.goo.gl/…"
										class="h-10 w-full rounded-md border bg-background px-3 font-normal"
									/>
								</label>
							</div>
							<p class="text-xs text-muted-foreground">{m.ced_map_hint()}</p>
							<label class="block space-y-1.5 text-sm font-medium">
								<span>{m.ced_cover()}</span>
								<input
									name="cover"
									type="file"
									accept="image/*"
									onchange={onCover}
									class="block w-full text-sm"
								/>
							</label>
							{#if p.card.coverImage && !coverPreview}
								<label class="flex items-center gap-2 text-sm">
									<input
										type="checkbox"
										name="removeCover"
										value="yes"
										bind:checked={removeCover}
									/>
									{m.ced_remove_cover()}
								</label>
							{/if}
							<p class="text-xs text-muted-foreground">
								{m.ced_events_hint()}
								<a href="/wedding/events" class="underline">{m.ced_edit_events()}</a>
							</p>
							<Button type="submit" disabled={!!busy}>{m.ced_save()}</Button>
						{/snippet}
					</ActionForm>
				</Card.Content>
			</Card.Root>

			<Card.Root>
				<Card.Header>
					<Card.Title>{m.ced_invites()}</Card.Title>
					<Card.Description>{m.ced_invites_hint()}</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if data.invites.length === 0}
						<p class="text-sm text-muted-foreground">
							<a href="/wedding/guests" class="underline">{m.ced_no_guests()}</a>
						</p>
					{:else}
						<p class="mb-3 text-sm text-muted-foreground">
							{m.ced_responses(counts)} · {m.ced_guests_coming({ n: counts.people })}
						</p>
						<ul class="divide-y rounded-md border">
							{#each data.invites as g (g.id)}
								<li class="flex flex-wrap items-center justify-between gap-2 p-3 text-sm">
									<div class="min-w-0">
										<p class="truncate font-medium">{g.fullName}</p>
										<p class="text-xs text-muted-foreground">
											{#if g.rsvpStatus === 'confirmed'}
												{m.bk_status_confirmed()} · {m.ced_party({ n: g.rsvpPartySize ?? 1 })}
											{:else if g.rsvpStatus === 'declined'}
												{m.gst_rsvp_declined()}
											{:else}
												{m.ced_waiting()}
											{/if}
										</p>
									</div>
									<div class="flex gap-1">
										<Button
											size="sm"
											variant="ghost"
											title={m.ced_copy()}
											onclick={() => copy(shareText(g.inviteToken))}
										>
											<CopyIcon class="size-4" />
										</Button>
										<Button
											size="sm"
											variant="ghost"
											title="Telegram"
											href="https://t.me/share/url?url={encodeURIComponent(
												linkFor(g.inviteToken)
											)}&text={encodeURIComponent(m.ced_share_msg({ names, link: '' }).trim())}"
											target="_blank"
										>
											<SendIcon class="size-4" />
										</Button>
										<Button
											size="sm"
											variant="ghost"
											title="WhatsApp"
											href="https://wa.me/{waNumber(g.phone)}?text={encodeURIComponent(
												shareText(g.inviteToken)
											)}"
											target="_blank"
										>
											<MessageCircleIcon class="size-4" />
										</Button>
									</div>
								</li>
							{/each}
						</ul>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>

		<div class="lg:sticky lg:top-6 lg:self-start">
			<div class="max-h-[85dvh] overflow-y-auto rounded-3xl">
				<InvitationCard
					{theme}
					brideName={p.couple.brideName}
					groomName={p.couple.groomName}
					headline={headline || null}
					message={message || null}
					coverImage={removeCover ? null : (coverPreview ?? p.card.coverImage)}
					countdownTo={p.countdownTo}
					city={p.city}
					mapUrl={mapUrl || null}
					events={p.events}
				/>
			</div>
		</div>
	</div>
</div>
