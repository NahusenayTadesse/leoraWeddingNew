<script lang="ts">
	import { superForm } from 'sveltekit-superforms';
	import { zod4Client } from 'sveltekit-superforms/adapters';
	import { enhance as formEnhance } from '$app/forms';
	import { taskSchema } from '$lib/schemas/task';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as AlertDialog from '$lib/components/ui/alert-dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Progress } from '$lib/components/ui/progress';
	import { Separator } from '$lib/components/ui/separator';
	import { toast } from 'svelte-sonner';
	import {
		Plus,
		Pencil,
		Trash2,
		Loader2,
		ListChecks,
		Sparkles,
		CalendarClock
	} from '@lucide/svelte';

	let { data } = $props();

	let dialogOpen = $state(false);
	let editingId = $state<number | null>(null);
	let pendingDelete = $state<{ id: number; label: string } | null>(null);
	let filter = $state('open');

	const sf = superForm(data.form, {
		id: 'task',
		validators: zod4Client(taskSchema),
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.valid && form.message) {
				toast.success(form.message);
				dialogOpen = false;
				editingId = null;
			}
		}
	});
	const { form, errors, enhance, submitting } = sf;

	const df = superForm(data.deleteForm, {
		id: 'delete',
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
			pendingDelete = null;
		}
	});
	const { form: deleteData, enhance: deleteEnhance, submitting: deleting } = df;

	const gf = superForm(data.generateForm, {
		id: 'generate',
		onUpdated: ({ form }) => {
			if (form.message) toast.success(form.message);
		}
	});
	const { enhance: generateEnhance, submitting: generating } = gf;

	const today = new Date();
	today.setHours(0, 0, 0, 0);
	const todayMs = today.getTime();

	function dayDiff(iso: string) {
		if (!iso) return null;
		const d = new Date(`${iso}T00:00:00`);
		if (isNaN(d.getTime())) return null;
		return Math.round((d.getTime() - todayMs) / 86_400_000);
	}

	const total = $derived(data.tasks.length);
	const done = $derived(data.tasks.filter((t) => t.isConfirmed).length);
	const overdue = $derived(
		data.tasks.filter((t) => {
			if (t.isConfirmed) return false;
			const diff = dayDiff(t.dueDate);
			return diff !== null && diff < 0;
		}).length
	);
	const donePct = $derived(total > 0 ? (done / total) * 100 : 0);

	const visible = $derived(
		data.tasks.filter((t) =>
			filter === 'open' ? !t.isConfirmed : filter === 'done' ? t.isConfirmed : true
		)
	);

	/** Buckets tasks by urgency; only applied to the open list. */
	const groups = $derived.by(() => {
		if (filter === 'done') return [{ label: 'Completed', tasks: visible }];

		const buckets: Record<string, typeof visible> = {
			Overdue: [],
			'This month': [],
			Upcoming: [],
			'No due date': [],
			Completed: []
		};

		for (const t of visible) {
			if (t.isConfirmed) {
				buckets.Completed.push(t);
				continue;
			}
			const diff = dayDiff(t.dueDate);
			if (diff === null) buckets['No due date'].push(t);
			else if (diff < 0) buckets.Overdue.push(t);
			else if (diff <= 30) buckets['This month'].push(t);
			else buckets.Upcoming.push(t);
		}

		return Object.entries(buckets)
			.filter(([, tasks]) => tasks.length > 0)
			.map(([label, tasks]) => ({ label, tasks }));
	});

	function dueLabel(iso: string) {
		const diff = dayDiff(iso);
		if (diff === null) return null;
		if (diff === 0) return 'Due today';
		if (diff === 1) return 'Due tomorrow';
		if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) === 1 ? '' : 's'} overdue`;
		if (diff <= 60) return `In ${diff} days`;
		return new Date(`${iso}T00:00:00`).toLocaleDateString('en-GB', {
			day: 'numeric',
			month: 'short',
			year: 'numeric'
		});
	}

	function openCreate() {
		editingId = null;
		$form.id = undefined;
		$form.title = '';
		$form.dueDate = '';
		$form.isConfirmed = false;
		dialogOpen = true;
	}

	function openEdit(task: (typeof data.tasks)[number]) {
		editingId = task.id;
		$form.id = task.id;
		$form.title = task.title ?? '';
		$form.dueDate = task.dueDate ?? '';
		$form.isConfirmed = task.isConfirmed ?? false;
		dialogOpen = true;
	}

	function confirmDelete(task: (typeof data.tasks)[number]) {
		pendingDelete = { id: task.id, label: task.title ?? 'This task' };
		$deleteData.id = task.id;
	}
</script>

<div class="space-y-6">
	<div class="flex flex-wrap items-start justify-between gap-4">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight">Tasks</h1>
			<p class="text-muted-foreground text-sm">
				Your planning checklist, counted back from the wedding day.
			</p>
		</div>
		<div class="flex gap-2">
			{#if data.templateCount > 0}
				<form method="POST" action="?/generate" use:generateEnhance>
					<input type="hidden" name="confirm" value="yes" />
					<Button type="submit" variant="outline" disabled={$generating || !data.weddingDate}>
						{#if $generating}
							<Loader2 class="mr-2 size-4 animate-spin" />
						{:else}
							<Sparkles class="mr-2 size-4" />
						{/if}
						Suggest tasks
					</Button>
				</form>
			{/if}
			<Button onclick={openCreate}>
				<Plus class="mr-2 size-4" /> Add task
			</Button>
		</div>
	</div>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-3">
			<div>
				<p class="text-muted-foreground text-xs">Total</p>
				<p class="text-xl font-semibold">{total}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Completed</p>
				<p class="text-xl font-semibold">{done}</p>
			</div>
			<div>
				<p class="text-muted-foreground text-xs">Overdue</p>
				<p class="text-xl font-semibold" class:text-destructive={overdue > 0}>{overdue}</p>
			</div>
		</div>

		{#if total > 0}
			<div class="mt-5 space-y-2">
				<Progress value={donePct} class="h-2" />
				<p class="text-muted-foreground text-xs">
					{done} of {total} done ({Math.round(donePct)}%)
				</p>
			</div>
		{/if}
	</Card.Root>

	<!-- List -->
	<Card.Root>
		<Card.Header>
			<Tabs.Root bind:value={filter}>
				<Tabs.List>
					<Tabs.Trigger value="open">To do ({total - done})</Tabs.Trigger>
					<Tabs.Trigger value="done">Done ({done})</Tabs.Trigger>
					<Tabs.Trigger value="all">All ({total})</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</Card.Header>

		<Card.Content>
			{#if total === 0}
				<div class="p-10 text-center">
					<ListChecks class="text-muted-foreground mx-auto size-8" />
					<p class="text-muted-foreground mt-3 text-sm">No tasks yet.</p>
					<div class="mt-4 flex justify-center gap-2">
						{#if data.templateCount > 0 && data.weddingDate}
							<form method="POST" action="?/generate" use:generateEnhance>
								<input type="hidden" name="confirm" value="yes" />
								<Button type="submit" variant="outline" disabled={$generating}>
									<Sparkles class="mr-2 size-4" /> Build my checklist
								</Button>
							</form>
						{/if}
						<Button onclick={openCreate}>
							<Plus class="mr-2 size-4" /> Add one
						</Button>
					</div>
				</div>
			{:else if visible.length === 0}
				<div class="text-muted-foreground p-10 text-center text-sm">
					{filter === 'open' ? 'Everything is done. Nice.' : 'Nothing here yet.'}
				</div>
			{:else}
				<div class="space-y-6">
					{#each groups as group (group.label)}
						<div>
							<div class="mb-2 flex items-center gap-2">
								<h3
									class="text-xs font-medium uppercase tracking-wide"
									class:text-destructive={group.label === 'Overdue'}
									class:text-muted-foreground={group.label !== 'Overdue'}
								>
									{group.label}
								</h3>
								<Separator class="flex-1" />
								<span class="text-muted-foreground text-xs">{group.tasks.length}</span>
							</div>

							<ul class="divide-y rounded-lg border">
								{#each group.tasks as task (task.id)}
									{@const diff = dayDiff(task.dueDate)}
									<li class="flex items-center gap-3 px-3 py-2.5">
										<form
											method="POST"
											action="?/toggle"
											use:formEnhance={() => async ({ update }) =>
												await update({ reset: false })}
										>
											<input type="hidden" name="id" value={task.id} />
											<button
												type="submit"
												class="flex items-center"
												aria-label="Toggle task completion"
											>
												<Checkbox checked={task.isConfirmed} class="pointer-events-none" />
											</button>
										</form>

										<div class="min-w-0 flex-1">
											<p
												class="truncate text-sm font-medium"
												class:line-through={task.isConfirmed}
												class:text-muted-foreground={task.isConfirmed}
											>
												{task.title}
											</p>
											{#if task.dueDate && !task.isConfirmed}
												<p
													class="flex items-center gap-1 text-xs"
													class:text-destructive={diff !== null && diff < 0}
													class:text-muted-foreground={diff === null || diff >= 0}
												>
													<CalendarClock class="size-3" />
													{dueLabel(task.dueDate)}
												</p>
											{/if}
										</div>

										{#if !task.isConfirmed && diff !== null && diff >= 0 && diff <= 7}
											<Badge variant="secondary">Soon</Badge>
										{/if}

										<div class="flex gap-1">
											<Button variant="ghost" size="icon" onclick={() => openEdit(task)}>
												<Pencil class="size-4" />
											</Button>
											<Button
												variant="ghost"
												size="icon"
												class="text-destructive"
												onclick={() => confirmDelete(task)}
											>
												<Trash2 class="size-4" />
											</Button>
										</div>
									</li>
								{/each}
							</ul>
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<!-- Create / edit -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="sm:max-w-md">
		<Dialog.Header>
			<Dialog.Title>{editingId ? 'Edit task' : 'Add task'}</Dialog.Title>
		</Dialog.Header>

		<form method="POST" action="?/save" use:enhance class="space-y-1">
			<input type="hidden" name="id" bind:value={$form.id} />

			<InputComp
				label="task"
				{form}
				{errors}
				name="title"
				type="text"
				placeholder="Book the photographer"
			/>

			<InputComp
				label="due date (optional)"
				{form}
				{errors}
				name="dueDate"
				type="date"
				oldDays={true}
				futureDays={true}
				year={true}
			/>

			<InputComp
				label="status"
				{form}
				{errors}
				name="isConfirmed"
				type="checkboxSingle"
				placeholder="Mark as completed"
			/>

			<Dialog.Footer class="pt-4">
				<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}>Cancel</Button>
				<Button type="submit" disabled={$submitting}>
					{#if $submitting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					{editingId ? 'Save changes' : 'Add task'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete -->
<AlertDialog.Root open={!!pendingDelete} onOpenChange={(v) => !v && (pendingDelete = null)}>
	<AlertDialog.Content>
		<AlertDialog.Header>
			<AlertDialog.Title>Remove this task?</AlertDialog.Title>
			<AlertDialog.Description>
				{pendingDelete?.label} will be permanently removed from your checklist.
			</AlertDialog.Description>
		</AlertDialog.Header>
		<form method="POST" action="?/delete" use:deleteEnhance>
			<input type="hidden" name="id" bind:value={$deleteData.id} />
			<AlertDialog.Footer>
				<AlertDialog.Cancel type="button">Cancel</AlertDialog.Cancel>
				<Button type="submit" variant="destructive" disabled={$deleting}>
					{#if $deleting}<Loader2 class="mr-2 size-4 animate-spin" />{/if}
					Remove
				</Button>
			</AlertDialog.Footer>
		</form>
	</AlertDialog.Content>
</AlertDialog.Root>