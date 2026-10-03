<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';

	let { data } = $props();
</script>

<div class="space-y-6">
	<PageHeader title="Activity log" description="Latest 300 entries. Every admin change is recorded here." />
	<form method="GET" class="flex gap-2">
		<Input name="action" value={data.action} placeholder="Action prefix, e.g. payout or user" class="max-w-xs" />
		<Button type="submit" variant="outline">Filter</Button>
	</form>

	<Card.Root><Card.Content class="overflow-x-auto p-0">
		<Table.Root>
			<Table.Header><Table.Row>
				<Table.Head>When</Table.Head><Table.Head>Who</Table.Head><Table.Head>Action</Table.Head><Table.Head>Target</Table.Head><Table.Head>Details</Table.Head><Table.Head>IP</Table.Head>
			</Table.Row></Table.Header>
			<Table.Body>
				{#each data.rows as r (r.id)}
					<Table.Row>
						<Table.Cell class="text-sm whitespace-nowrap">{new Date(r.createdAt).toLocaleString()}</Table.Cell>
						<Table.Cell>{r.who ?? 'System'}<div class="text-muted-foreground text-xs">{r.email ?? ''}</div></Table.Cell>
						<Table.Cell class="font-mono text-sm">{r.action}</Table.Cell>
						<Table.Cell>{r.entityType ?? '—'}{r.entityId ? ` #${r.entityId}` : ''}</Table.Cell>
						<Table.Cell class="text-muted-foreground max-w-xs truncate font-mono text-xs">{r.meta ? JSON.stringify(r.meta) : ''}</Table.Cell>
						<Table.Cell class="text-muted-foreground text-xs">{r.ip ?? ''}</Table.Cell>
					</Table.Row>
				{:else}
					<Table.Row><Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No entries.</Table.Cell></Table.Row>
				{/each}
			</Table.Body>
		</Table.Root>
	</Card.Content></Card.Root>
</div>
