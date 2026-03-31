import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import DataTableActions from './data-table-actions.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';
import DiscountName from './discountName.svelte';
import Discount from './discount.svelte';

import ImageViewer from '$lib/components/Table/image-viewer.svelte';
import PriceList from './priceList.svelte';
import type { ColumnDef } from '@tanstack/table-core';
import { Checkbox } from '$lib/components/ui/checkbox/index.js';

export const columns = [
	{
		id: 'select',
		accessorKey: 'id',
		header: ({ table }) =>
			renderComponent(Checkbox, {
				checked: table.getIsAllPageRowsSelected(),
				class: 'bg-primary text-foreground',
				indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
				onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value),
				'aria-label': 'Select all'
			}),
		cell: ({ row }) =>
			renderComponent(Checkbox, {
				class: 'bg-primary text-foreground',
				checked: row.getIsSelected(),
				onCheckedChange: (value) => row.toggleSelected(!!value),
				'aria-label': 'Select row'
			}),
		enableSorting: false,
		enableHiding: false
	},

	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1,
		sortable: false
	},

	{
		accessorKey: 'image',
		header: 'Image',
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(ImageViewer, {
				src: row.original.image,
				alt: row.original.name
			});
		}
	},

	{
		accessorKey: 'name',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Name',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableLinks, {
				id: row.original.id,
				name: row.original.name,
				link: '/dashboard/products/single'
			});
		}
	},

	{
		accessorKey: 'prices',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Price',

				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,

		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(PriceList, {
				priceList: row.original.priceList
			});
		}
	},

	{
		accessorKey: 'category',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Category',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},

	{
		accessorKey: 'description',
		header: 'Description'
	},

	{
		accessorKey: 'discount',
		header: 'Discount Percentage',
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(Discount, {
				discount: row.original.discountPercentage
			});
		}
	},

	{
		accessorKey: 'discountName',
		header: 'Discount Name',
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DiscountName, {
				discountName: row.original.discountName,
				discountDescription: row.original.discountDescription
			});
		}
	},
	{
		accessorKey: 'actions',
		header: 'Actions',
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableActions, { id: row.original.id, name: row.original.name });
		}
	}
];
