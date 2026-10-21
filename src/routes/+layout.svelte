<script lang="ts">
	import DemoLinks from './demo/DemoLinks.svelte';
	import { m } from '$lib/paraglide/messages.js';
	import './layout.css';
	import { getFlash } from 'sveltekit-flash-message';
	import { page, updated } from '$app/state';
	import { Toaster } from '@nahu/admin-kit/components/ui/sonner/index.js';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';
	import { toastmsg } from '$lib/global.svelte';

	const flash = getFlash(page, { clearAfterMs: 5000 });

	import { ModeWatcher } from 'mode-watcher';
	import { fly } from 'svelte/transition';

	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { toast } from 'svelte-sonner';

	async function notifyBrowser(title: string, body: string) {
		if (!('Notification' in window)) return; // Safari iOS etc.
		if (Notification.permission === 'granted') {
			new Notification(title, { body, icon: '/leora-logo.jpg' });
		} else if (Notification.permission !== 'denied') {
			const perm = await Notification.requestPermission();
			if (perm === 'granted') new Notification(title, { body, icon: '/leora-logo.jpg' });
		}
	}
	import Header from '$lib/components/header.svelte';
	import Footer from '$lib/components/footer.svelte';
	import FloatingChat from '$lib/components/FloatingChat.svelte';

	let { data, children } = $props();

	// async function requestNotificationPermission() {
	// 	if (!('Notification' in window)) return;
	// 	await Notification.requestPermission();
	// }

	// let iconify = $state('h-6 w-6 animate-ping');

	// Results of plain form actions (the kit's `ConfirmAction`, `$lib/server/adminAction`).
	// Superforms actions keep their message on the form and toast through `createForm`.
	$effect(() => {
		const message = (page.form as { message?: { type: string; text: string } } | null)?.message;
		if (!message?.text) return;
		if (message.type === 'error') toast.error(message.text);
		else toast.success(message.text);
	});

	$effect(() => {
		if (!$flash) return;
		if (page.data.flash?.type === 'success') toast.success($flash.message);
		if (page.data.flash?.type === 'error') toast.error($flash?.message);
		if (Notification.permission === 'granted') {
			notifyBrowser(
				page.data.flash?.type === 'success'
					? 'Success'
					: page.data.flash?.type === 'error'
						? 'Error'
						: 'Message',
				$flash.message
			);
		}
		$flash = undefined;
	});
</script>

<svelte:head>
	<link rel="icon" href="/leora-logo.jpg" />
	<!-- Defaults for link previews; pages add their own title/description. -->
	<meta property="og:site_name" content="Leora Events" />
	<meta property="og:type" content="website" />
	<meta property="og:url" content={page.url.origin + page.url.pathname} />
	<meta property="og:image" content="{page.url.origin}/leora-logo.jpg" />
	<meta name="twitter:card" content="summary" />
	<link rel="canonical" href={page.url.origin + page.url.pathname} />
</svelte:head>
<ModeWatcher />

<Toaster position="bottom-right" richColors closeButton />

<ProgressBar color="#3B82F6" zIndex={1000} />

{#if updated.current}
	<div class={toastmsg} transition:fly={{ x: 20, duration: 300 }}>
		<p>
			{m.app_updated()}

			<Button onclick={() => location.reload()}>{m.app_reload()}</Button>
		</p>
	</div>
{/if}
<!--
	Routes that ship their own full-page shell (sidebar + own chrome) opt out of
	the marketing header/footer. `/dashboard` is NOT one of them — it is the
	couple's planner and carries the normal site header, as dashboard.php did.

	`data-site-type` keeps the admin kit's dashboard typography (its h1–h4 and p sizes) off the
	public site, which sizes its own headings with Tailwind.
-->
<!-- Invitations (/i/…) stand alone: no site header, footer or chat around a couple's card. -->
{#if page.url.pathname.startsWith('/i/')}
	{@render children()}
{:else if !page.url.pathname.startsWith('/vendor-dashboard') && !page.url.pathname.startsWith('/admin')}
	<div data-site-type>
		<Header data={data?.user?.name ?? ''} />
		<main id="content">
			{@render children()}
		</main>
		<Footer />
		<FloatingChat />
	</div>
{:else}
	{@render children()}
{/if}

<DemoLinks />
