<script lang="ts">
	import AuthPanel from '$lib/forms/AuthPanel.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<svelte:head>
	<title>Sign Up — Leora Events</title>
	<meta
		name="description"
		content="Create your Leora Events account — plan your wedding, or list your business."
	/>
</svelte:head>

<main class="flex flex-1 items-center justify-center">
	<AuthPanel {data} mode="signup" />
</main>
