<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { ScanLineIcon, CircleCheckIcon } from '@lucide/svelte';
	import { deserialize } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	let query = $state('');
	let scanning = $state(false);
	let video = $state<HTMLVideoElement>();
	let stream: MediaStream | null = null;
	let lastToken = '';

	const supported = typeof window !== 'undefined' && 'BarcodeDetector' in window;

	const visible = $derived(
		data.guests.filter((g) => g.fullName.toLowerCase().includes(query.trim().toLowerCase()))
	);
	const arrived = $derived(data.guests.filter((g) => g.checkedInAt).length);

	/** The entry pass encodes the guest's link; the token is its last path segment. */
	function tokenFrom(text: string) {
		const match = text.match(/\/i\/[^/]+\/([A-Za-z0-9_-]{8,32})/);
		return match?.[1] ?? null;
	}

	async function submit(token: string) {
		const body = new FormData();
		body.set('token', token);
		const res = await fetch('?/checkIn', {
			method: 'POST',
			body,
			headers: { 'x-sveltekit-action': 'true' }
		});
		const result = deserialize(await res.text());
		const msg =
			(result.type === 'success' || result.type === 'failure') &&
			(result.data as { message?: { type: string; text: string } })?.message;
		if (msg) (msg.type === 'success' ? toast.success : toast.error)(msg.text, { duration: 5000 });
		await invalidateAll();
	}

	async function startScan() {
		if (!supported || !video) return;
		stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
		video.srcObject = stream;
		await video.play();
		scanning = true;
		// @ts-expect-error BarcodeDetector is not in TypeScript's DOM types yet.
		const detector = new window.BarcodeDetector({ formats: ['qr_code'] });
		const loop = async () => {
			if (!scanning || !video) return;
			try {
				const codes: { rawValue: string }[] = await detector.detect(video);
				const token = codes.map((c) => tokenFrom(c.rawValue)).find(Boolean);
				// The same code stays in view for several frames; act on it once every few seconds.
				const key = token ?? codes[0]?.rawValue ?? '';
				if (key && key !== lastToken) {
					lastToken = key;
					setTimeout(() => (lastToken = ''), 4000);
					if (token) await submit(token);
					else toast.error(m.chk_unknown());
				}
			} catch {
				/* frame not ready */
			}
			setTimeout(loop, 400);
		};
		loop();
	}

	function stopScan() {
		scanning = false;
		stream?.getTracks().forEach((t) => t.stop());
		stream = null;
	}

	$effect(() => () => stopScan());
</script>

<svelte:head>
	<title>{m.chk_title()} — Leora Events</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl font-semibold tracking-tight">{m.chk_title()}</h1>
		<p class="text-sm text-muted-foreground">{m.chk_sub()}</p>
	</div>

	<Card.Root class="space-y-3 p-4">
		{#if supported}
			<video
				bind:this={video}
				playsinline
				muted
				class={['w-full max-w-md rounded-lg bg-black', !scanning && 'hidden']}
			></video>
			{#if scanning}
				<Button variant="outline" onclick={stopScan}>{m.chk_stop()}</Button>
			{:else}
				<Button onclick={startScan}><ScanLineIcon class="size-4" />{m.chk_scan()}</Button>
			{/if}
		{:else}
			<p class="text-sm text-muted-foreground">{m.chk_no_camera()}</p>
		{/if}
	</Card.Root>

	<Card.Root class="p-4">
		<div class="mb-3 flex flex-wrap items-center justify-between gap-3">
			<p class="text-sm font-medium">{m.chk_arrived({ n: arrived, total: data.guests.length })}</p>
			<input
				type="search"
				bind:value={query}
				placeholder={m.chk_search()}
				aria-label={m.chk_search()}
				class="h-9 w-full max-w-xs rounded-md border bg-background px-3 text-sm"
			/>
		</div>
		<ul class="divide-y">
			{#each visible as g (g.id)}
				<li class="flex items-center justify-between gap-3 py-2 text-sm">
					<div class="min-w-0">
						<p class="truncate font-medium">{g.fullName}</p>
						<p class="text-xs text-muted-foreground">
							{g.rsvpStatus === 'confirmed'
								? m.chk_party({ n: g.rsvpPartySize ?? 1 })
								: m.ced_waiting()}
						</p>
					</div>
					{#if g.checkedInAt}
						<Badge class="gap-1"><CircleCheckIcon class="size-3.5" />{m.chk_in()}</Badge>
					{:else}
						<ActionForm action="?/checkIn" fields={{ guestId: g.id }}>
							{#snippet children({ busy })}
								<Button type="submit" size="sm" variant="outline" disabled={!!busy}
									>{m.chk_check_in()}</Button
								>
							{/snippet}
						</ActionForm>
					{/if}
				</li>
			{/each}
		</ul>
	</Card.Root>
</div>
