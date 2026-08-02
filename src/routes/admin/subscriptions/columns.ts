import type { ColumnDef } from '@tanstack/table-core';
import { renderSnippet } from '$lib/components/ui/data-table/index.js';
import type { Snippet } from 'svelte';

export interface SubscriberRow {
	id: string;
	planId: number;
	kind: 'couple' | 'vendor';
	name: string;
	email: string | null;
	status: string;
	startedAt: Date | string | null;
	expiresAt: Date | string | null;
}

export function subscriberColumns(snippets: {
	status: Snippet<[SubscriberRow]>;
	dates: Snippet<[SubscriberRow]>;
}): ColumnDef<SubscriberRow>[] {
	return [
		{ accessorKey: 'name', header: 'Name' },
		{ accessorKey: 'email', header: 'Email', cell: ({ row }) => row.original.email ?? '—' },
		{
			accessorKey: 'kind',
			header: 'Account',
			cell: ({ row }) => (row.original.kind === 'couple' ? 'Couple' : 'Vendor')
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderSnippet(snippets.status, row.original)
		},
		{
			id: 'dates',
			header: 'Since / expires',
			cell: ({ row }) => renderSnippet(snippets.dates, row.original)
		}
	];
}
