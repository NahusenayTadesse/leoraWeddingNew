<script lang="ts">
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import ActionForm from '$lib/components/admin/ActionForm.svelte';
	import StatusBadge from '$lib/components/admin/StatusBadge.svelte';
	import Filter from '$lib/components/admin/Filter.svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';

	let { data } = $props();
	let q = $state('');
	let kind = $state('all');

	const rows = $derived(
		data.users.filter(
			(u) =>
				(kind === 'all' || u.kind === kind) &&
				(`${u.name} ${u.email}`.toLowerCase().includes(q.toLowerCase()))
		)
	);
</script>

<div class="space-y-6">
	<PageHeader title="Users" description="Accounts, roles and access. Banned users are signed out on their next request." />

	<div class="flex flex-wrap items-center gap-3">
		<Filter bind:value={q} placeholder="Search name or email" />
		<select bind:value={kind} class="border-input bg-background h-9 rounded-md border px-3 text-sm" aria-label="Account type">
			<option value="all">All accounts</option>
			<option value="couple">Couples</option>
			<option value="vendor">Vendors</option>
			<option value="none">No profile</option>
		</select>
		<span class="text-muted-foreground text-sm">{rows.length} shown</span>
	</div>

	<Card.Root>
		<Card.Content class="overflow-x-auto p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>User</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Role</Table.Head>
						<Table.Head>Status</Table.Head>
						<Table.Head>Joined</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each rows as u (u.id)}
						<Table.Row>
							<Table.Cell>
								<div class="font-medium">{u.name}</div>
								<div class="text-muted-foreground text-xs">{u.email}{u.emailVerified ? '' : ' · unverified'}</div>
							</Table.Cell>
							<Table.Cell class="capitalize">{u.kind === 'none' ? '—' : u.kind}</Table.Cell>
							<Table.Cell>
								<ActionForm action="?/setRole" fields={{ id: u.id }} label="Set">
									<select name="roleId" class="border-input bg-background h-8 rounded-md border px-2 text-sm" aria-label="Role for {u.name}">
										<option value="0" selected={!u.roleId}>No role</option>
										{#each data.roles as r (r.id)}
											<option value={r.id} selected={u.roleId === r.id}>{r.name}</option>
										{/each}
									</select>
								</ActionForm>
							</Table.Cell>
							<Table.Cell>
								{#if u.banned}
									<StatusBadge status="banned" />
									{#if u.banReason}<div class="text-muted-foreground mt-1 text-xs">{u.banReason}</div>{/if}
								{:else}
									<Badge variant="outline">active</Badge>
								{/if}
							</Table.Cell>
							<Table.Cell class="text-muted-foreground text-sm">{new Date(u.createdAt).toLocaleDateString()}</Table.Cell>
							<Table.Cell class="text-right">
								{#if u.banned}
									<ActionForm action="?/unban" fields={{ id: u.id }} label="Unban" />
								{:else}
									<ActionForm action="?/ban" fields={{ id: u.id }} label="Ban" variant="destructive" confirmText="Ban {u.email}?">
										<input name="reason" placeholder="Reason" class="border-input bg-background h-8 w-32 rounded-md border px-2 text-sm" />
									</ActionForm>
								{/if}
							</Table.Cell>
						</Table.Row>
					{:else}
						<Table.Row><Table.Cell colspan={6} class="text-muted-foreground py-8 text-center">No users match.</Table.Cell></Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>
