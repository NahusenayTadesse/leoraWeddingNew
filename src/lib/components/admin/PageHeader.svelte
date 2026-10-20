<script lang="ts">
	import type { Snippet } from 'svelte';
	import KitPageHeader from '@nahu/admin-kit/components/PageHeader.svelte';

	/** The kit's page header, with the admin console's tab title. `children` are the page's buttons. */
	let {
		title,
		description,
		children
	}: { title: string; description?: string; children?: Snippet } = $props();
</script>

<KitPageHeader {title} {description} tabTitle="{title} — Admin Console" actions={children} />
