<script lang="ts">
	import './layout.css';
	import { getFlash } from 'sveltekit-flash-message';
	import { page, updated } from '$app/state';
	import { Toaster } from '$lib/components/ui/sonner/index.js';
	import { ProgressBar } from '@prgm/sveltekit-progress-bar';
	import { toastmsg } from '$lib/global.svelte';

	const flash = getFlash(page, { clearAfterMs: 5000 });

	import { ModeWatcher } from 'mode-watcher';
	import { fly } from 'svelte/transition';

	import { Button } from '$lib/components/ui/button';
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
	import FloatingChat from '$lib/components/FloatingChat.svelte'

	let { data, children } = $props();

	// async function requestNotificationPermission() {
	// 	if (!('Notification' in window)) return;
	// 	await Notification.requestPermission();
	// }

	// let iconify = $state('h-6 w-6 animate-ping');

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
</svelte:head>
<ModeWatcher />

<Toaster position="bottom-right" richColors closeButton />

<ProgressBar color="#3B82F6" zIndex={1000} />

{#if updated.current}
	<div class={toastmsg} transition:fly={{ x: 20, duration: 300 }}>
		<p>
			A new version of the app is available

			<Button onclick={() => location.reload()}>Reload the page</Button>
		</p>
	</div>
{/if}
<!--
	Routes that ship their own full-page shell (sidebar + own chrome) opt out of
	the marketing header/footer. `/dashboard` is NOT one of them — it is the
	couple's planner and carries the normal site header, as dashboard.php did.
-->
{#if !page.url.pathname.startsWith('/vendor-dashboard')}
	<Header data={data?.user?.name ?? ''} />
	{@render children()}
	<Footer />
	<FloatingChat />
{:else}
	{@render children()}
{/if}
