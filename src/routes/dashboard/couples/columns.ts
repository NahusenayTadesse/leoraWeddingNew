import { renderComponent } from '$lib/components/ui/data-table/index.js';
import DataTableLinks from '$lib/components/Table/data-table-links.svelte';
import Copy from '$lib/Copy.svelte';
import DataTableActions from './data-table-actions.svelte';
import Summary from './summary.svelte';
import DataTableSort from '$lib/components/Table/data-table-sort.svelte';

export const columns = [
	{
		accessorKey: 'index',
		header: '#',
		cell: (info) => info.row.index + 1,
		sortable: false
	},

	{
		accessorKey: 'groomName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Groom Name',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableLinks, {
				id: row.original.id,
				name: row.original.groomName,
				link: '/dashboard/couples'
			});
		}
	},
	{
		accessorKey: 'brideName',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Bride Name',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: ({ row }) => {
			// You can pass whatever you need from `row.original` to the component
			return renderComponent(DataTableLinks, {
				id: row.original.id,
				name: row.original.brideName,
				link: '/dashboard/couples'
			});
		}
	},
	{
		accessorKey: 'phone',
		header: 'Phone',
		sortable: true,
		cell: ({ row }) => renderComponent(Copy, { data: row.original.phone })
	},

	{
		accessorKey: 'phone2',
		header: 'Phone 2',
		sortable: true,
		cell: ({ row }) => renderComponent(Copy, { data: row.original.phone2 })
	},
	{
		accessorKey: 'email',
		header: 'Email',
		sortable: true,
		cell: ({ row }) => renderComponent(Copy, { data: row.original.email })
	},
	{
		accessorKey: 'summary',
		header: 'Wedding Summary',
		sortable: true,
		cell: ({ row }) =>
			renderComponent(Summary, {
				weddingDate: row.original.weddingDate,
				weddingStyle: row.original.weddingStyle,
				totalBudget: row.original.totalBudget,
				expectedGuests: row.original.expectedGuests,
				pendingOrders: row.original.pendingOrders
			})
	},

	{
		accessorKey: 'createdAt',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Joined At',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true
	},
	{
		accessorKey: 'daysSinceJoined',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Days Since Added',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,
		cell: (info) => {
			const n = info.getValue(); // number of days
			return `${n} ${n === 1 ? 'day' : 'days'}`;
		}
	},
	{
		accessorKey: 'orderCount',
		header: ({ column }) =>
			renderComponent(DataTableSort, {
				name: 'Order Counts',
				onclick: column.getToggleSortingHandler()
			}),
		sortable: true,

		cell: (info) => {
			const n = info.getValue() ?? 0; // number of days
			return `${n} ${n === 1 ? 'pending order' : 'pending orders'}`;
		}
	}

	// {
	// 	accessorKey: 'actions',
	// 	header: 'Actions',
	// 	cell: ({ row }) => {
	// 		// You can pass whatever you need from `row.original` to the component
	// 		return renderComponent(DataTableActions, {
	// 			id: row.original.extraSettings,
	// 			phone: row.original.phone,
	// 			createdBy: row.original.createdBy,
	// 			createdById: row.original.bookedById,
	// 			customerName: row.original.customerName,
	// 			date: row.original.date
	// 		});
	// 	}
	// }
];
