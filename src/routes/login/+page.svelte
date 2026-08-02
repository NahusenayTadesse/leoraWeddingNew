<script lang="ts">
	import AuthPanel from '$lib/forms/AuthPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Log In or Sign Up — Leora Events</title>
	<meta name="description" content="Log in to Leora Events to keep planning your wedding day." />
</svelte:head>

<main class="flex flex-1 items-center justify-center">
	<AuthPanel {data} mode="login" />
</main>
