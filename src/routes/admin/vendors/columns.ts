import type { ColumnDef } from '@tanstack/table-core';
import { renderSnippet } from '$lib/components/ui/data-table/index.js';
import type { Snippet } from 'svelte';

export interface VendorRow {
	id: number;
	businessName: string;
	category: string | null;
	city: string | null;
	email: string | null;
	phone: string | null;
	status: 'pending' | 'approved' | 'rejected' | 'suspended';
	isVerified: boolean;
	createdAt: Date;
}

/**
 * Cell markup lives in +page.svelte as snippets — Badge/DropdownMenu need
 * Svelte snippet children, which only a .svelte file can author — this file
 * just wires each snippet to its column via `renderSnippet`.
 */
export function vendorColumns(snippets: {
	business: Snippet<[VendorRow]>;
	status: Snippet<[VendorRow]>;
	actions: Snippet<[VendorRow]>;
}): ColumnDef<VendorRow>[] {
	return [
		{
			accessorKey: 'businessName',
			header: 'Business',
			cell: ({ row }) => renderSnippet(snippets.business, row.original)
		},
		{
			accessorKey: 'category',
			header: 'Category',
			cell: ({ row }) => row.original.category ?? '—'
		},
		{
			accessorKey: 'city',
			header: 'City',
			cell: ({ row }) => row.original.city ?? '—'
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderSnippet(snippets.status, row.original)
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) => renderSnippet(snippets.actions, row.original)
		}
	];
}
