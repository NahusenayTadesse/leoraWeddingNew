/**
 * Column building blocks shared by every table in the app, so a sortable header, a status badge,
 * an amount or a date is written one way everywhere.
 *
 *     const columns: ColumnDef<Row>[] = [
 *       { id: 'vendor', accessorKey: 'vendor', header: sortable('Vendor') },
 *       { id: 'status', accessorKey: 'status', header: 'Status', cell: ({ row }) => status(row.original.status) },
 *       { id: 'amount', accessorKey: 'amount', header: 'Amount', meta: { align: 'right' }, cell: ({ row }) => money(row.original.amount) }
 *     ];
 *
 * In a server-mode table a column's `id` is what `?sort=` and a facet's URL param carry, so it
 * must match the load's `SORTS` and `FILTERS`.
 */
import type { HeaderContext } from '@tanstack/table-core';
import { renderComponent } from '@nahu/admin-kit/components/ui/data-table/index.js';
import DataTableSort from '@nahu/admin-kit/components/Table/data-table-sort.svelte';
import Statuses from '@nahu/admin-kit/components/Table/statuses.svelte';
import BigText from '@nahu/admin-kit/components/Table/bigText.svelte';
import { badge } from '$lib/status';
import { formatETB } from '$lib/money';

/** A header that sorts the column — in memory, or through the URL for a server-mode table. */
export const sortable =
	(name: string) =>
	<T, V>({ column }: HeaderContext<T, V>) =>
		renderComponent(DataTableSort, { name, onclick: column.getToggleSortingHandler() });

/** A stored status as a coloured badge (`$lib/status`). */
export const status = (value: string | null | undefined, label?: string) =>
	renderComponent(Statuses, badge(value, label));

/** Long free text: the first `max` characters and a "…" that opens the rest. */
export const longText = (text: string | null | undefined, max = 40) =>
	text ? renderComponent(BigText, { text, max }) : '—';

export const money = (value: number | string | null | undefined) =>
	value === null || value === undefined ? '—' : formatETB(Number(value));

function toDate(value: string | Date | null | undefined): Date | null {
	if (!value) return null;
	const date = value instanceof Date ? value : new Date(value);
	return Number.isNaN(date.getTime()) ? null : date;
}

export const date = (value: string | Date | null | undefined) =>
	toDate(value)?.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) ??
	'—';

export const dateTime = (value: string | Date | null | undefined) =>
	toDate(value)?.toLocaleString('en-GB', {
		day: 'numeric',
		month: 'short',
		year: 'numeric',
		hour: '2-digit',
		minute: '2-digit'
	}) ?? '—';

/** `bank_transfer` → "Bank transfer". */
export const words = (value: string | null | undefined) =>
	value ? value.charAt(0).toUpperCase() + value.slice(1).replace(/_/g, ' ') : '—';
