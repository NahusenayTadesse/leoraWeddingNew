<script lang="ts">
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '@nahu/admin-kit/components/ui/data-table/index.js';
	import DataTable from '@nahu/admin-kit/components/Table/data-table.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import ConfirmAction from '@nahu/admin-kit/components/ConfirmAction.svelte';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import PageHeader from '$lib/components/admin/PageHeader.svelte';
	import { userBanSchema, userRoleSchema } from '$lib/schemas/admin';
	import { date, sortable, status, words } from '$lib/cells';

	let { data } = $props();

	type Row = (typeof data.rows)[number];

	let target = $state<Row | null>(null);
	let banOpen = $state(false);
	let roleOpen = $state(false);

	const roleItems = $derived([
		{ value: 0, name: 'No role' },
		...data.roles.map((r) => ({ value: r.id, name: r.name }))
	]);

	const columns: ColumnDef<Row>[] = [
		{ id: 'name', accessorKey: 'name', header: sortable('User') },
		{
			id: 'email',
			accessorKey: 'email',
			header: sortable('Email'),
			cell: ({ row }) => `${row.original.email}${row.original.emailVerified ? '' : ' · unverified'}`
		},
		{
			id: 'kind',
			accessorKey: 'kind',
			header: 'Type',
			cell: ({ row }) => (row.original.kind === 'none' ? '—' : words(row.original.kind))
		},
		{
			id: 'roleId',
			accessorKey: 'roleName',
			header: 'Role',
			cell: ({ row }) => row.original.roleName ?? 'No role'
		},
		{
			id: 'banned',
			header: 'Status',
			cell: ({ row }) =>
				row.original.banned
					? status(
							'banned',
							row.original.banReason ? `Banned: ${row.original.banReason}` : 'Banned'
						)
					: status('active')
		},
		{
			id: 'createdAt',
			accessorKey: 'createdAt',
			header: sortable('Joined'),
			cell: ({ row }) => date(row.original.createdAt)
		},
		{ id: 'actions', header: '', cell: ({ row }) => renderSnippet(actionsCell, row.original) }
	];
</script>

{#snippet actionsCell(row: Row)}
	<div class="flex justify-end gap-2">
		<Button
			size="sm"
			variant="outline"
			onclick={() => {
				target = row;
				roleOpen = true;
			}}>Role</Button
		>
		{#if row.banned}
			<ConfirmAction
				action="?/unban"
				fields={{ id: row.id }}
				label="Unban"
				variant="outline"
				title="Unban {row.email}?"
				description="They can sign in again straight away."
			/>
		{:else}
			<Button
				size="sm"
				variant="destructive"
				onclick={() => {
					target = row;
					banOpen = true;
				}}>Ban</Button
			>
		{/if}
	</div>
{/snippet}

<div class="space-y-6">
	<PageHeader
		title="Users"
		description="Accounts, roles and access. Banned users are signed out on their next request."
	/>

	<DataTable
		{columns}
		data={data.rows}
		server={data.server}
		facetKeys={['kind', 'roleId', 'banned']}
		facetLabels={{ kind: 'Account type', roleId: 'Role', banned: 'Status' }}
		dateFilter="Joined"
		fileName="Users"
	/>
</div>

<FormDialog
	title="Role for {target?.name ?? ''}"
	action="?/setRole"
	data={data.roleForm}
	schema={userRoleSchema}
	bind:open={roleOpen}
	seed={{ id: target?.id, roleId: target?.roleId ?? 0 }}
	hideTrigger
	submitLabel="Save role"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="roleId" label="Role" type="select" items={roleItems} />
	{/snippet}
</FormDialog>

<FormDialog
	title="Ban {target?.email ?? ''}?"
	description="They are signed out everywhere and refused until unbanned."
	action="?/ban"
	data={data.banForm}
	schema={userBanSchema}
	bind:open={banOpen}
	seed={{ id: target?.id }}
	hideTrigger
	resetOnSuccess
	submitLabel="Ban user"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="reason" label="Reason (optional)" type="textarea" rows={3} />
	{/snippet}
</FormDialog>
