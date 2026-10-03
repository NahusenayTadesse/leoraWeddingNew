<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import Filter from '$lib/components/admin/Filter.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Mail } from '@lucide/svelte';

	let { data } = $props();
	let q = $state('');
	const rows = $derived(
		data.rows.filter((m) => `${m.name} ${m.email} ${m.subject} ${m.message}`.toLowerCase().includes(q.toLowerCase()))
	);
</script>

<div class="space-y-6">
	<PageHeader title="Contact messages" description="Enquiries from the public contact form." />
	<Filter bind:value={q} placeholder="Search messages" />

	{#each rows as m (m.id)}
		<Card.Root>
			<Card.Header>
				<Card.Title class="text-base">{m.subject}</Card.Title>
				<Card.Description>{m.name} · {m.email}{m.phone ? ` · ${m.phone}` : ''} · {new Date(m.createdAt).toLocaleString()}</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-3">
				<p class="text-sm whitespace-pre-wrap">{m.message}</p>
				<div class="flex gap-2">
					<Button size="sm" variant="outline" href="mailto:{m.email}?subject={encodeURIComponent('Re: ' + m.subject)}"><Mail class="size-4" /> Reply</Button>
					<ActionForm action="?/remove" fields={{ id: m.id }} label="Delete" variant="destructive" confirmText="Delete this message?" />
				</div>
			</Card.Content>
		</Card.Root>
	{:else}
		<p class="text-muted-foreground text-sm">No messages.</p>
	{/each}
</div>
