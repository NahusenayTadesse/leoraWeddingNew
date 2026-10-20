<script lang="ts">
	import ActionForm from '@nahu/admin-kit/formComponents/ActionForm.svelte';
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import { taskSchema, taskIdSchema, generateSchema } from '$lib/schemas/task';
	import PageHeader from '@nahu/admin-kit/components/PageHeader.svelte';
	import FormDialog from '@nahu/admin-kit/formComponents/FormDialog.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Checkbox } from '@nahu/admin-kit/components/ui/checkbox/index.js';
	import { Progress } from '@nahu/admin-kit/components/ui/progress/index.js';
	import { Separator } from '@nahu/admin-kit/components/ui/separator/index.js';
	import { Plus, Pencil, Trash2, ListChecks, Sparkles, CalendarClock } from '@lucide/svelte';

	let { data } = $props();

	type Task = (typeof data.tasks)[number];

	let editing = $state<Task | null>(null);
	let taskOpen = $state(false);
	let removing = $state<Task | null>(null);
	let removeOpen = $state(false);
	let filter = $state('open');

	// svelte-ignore state_referenced_locally
	const { enhance: generateEnhance, delayed: generating } = createForm(
		data.generateForm,
		generateSchema,
		{ id: 'generate' }
	);

	// eslint-disable-next-line svelte/prefer-svelte-reactivity -- computed once per page view
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
		editing = null;
		taskOpen = true;
	}

	function openEdit(task: Task) {
		editing = task;
		taskOpen = true;
	}

	function confirmDelete(task: Task) {
		removing = task;
		removeOpen = true;
	}

	const seed = $derived(
		editing
			? {
					id: editing.id,
					title: editing.title ?? '',
					dueDate: editing.dueDate ?? '',
					isConfirmed: editing.isConfirmed ?? false
				}
			: { id: undefined, title: '', dueDate: '', isConfirmed: false }
	);
</script>

<div class="space-y-6">
	<PageHeader
		title="Tasks"
		description="Your planning checklist, counted back from the wedding day."
	>
		{#snippet actions()}
			{#if data.templateCount > 0}
				<form method="POST" action="?/generate" use:generateEnhance>
					<HiddenField name="confirm" value="yes" />
					<Button type="submit" variant="outline" disabled={$generating || !data.weddingDate}>
						{#if $generating}<LoadingBtn name="Suggesting" />{:else}<Sparkles class="size-4" /> Suggest
							tasks{/if}
					</Button>
				</form>
			{/if}
			<Button onclick={openCreate}>
				<Plus class="size-4" /> Add task
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-3">
			<div>
				<p class="text-xs text-muted-foreground">Total</p>
				<p class="text-xl font-semibold">{total}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Completed</p>
				<p class="text-xl font-semibold">{done}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">Overdue</p>
				<p class="text-xl font-semibold" class:text-destructive={overdue > 0}>{overdue}</p>
			</div>
		</div>

		{#if total > 0}
			<div class="mt-5 space-y-2">
				<Progress value={donePct} class="h-2" />
				<p class="text-xs text-muted-foreground">
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
					<ListChecks class="mx-auto size-8 text-muted-foreground" />
					<p class="mt-3 text-sm text-muted-foreground">No tasks yet.</p>
					<div class="mt-4 flex justify-center gap-2">
						{#if data.templateCount > 0 && data.weddingDate}
							<form method="POST" action="?/generate" use:generateEnhance>
								<HiddenField name="confirm" value="yes" />
								<Button type="submit" variant="outline" disabled={$generating}>
									<Sparkles class="size-4" /> Build my checklist
								</Button>
							</form>
						{/if}
						<Button onclick={openCreate}>
							<Plus class="size-4" /> Add one
						</Button>
					</div>
				</div>
			{:else if visible.length === 0}
				<div class="p-10 text-center text-sm text-muted-foreground">
					{filter === 'open' ? 'Everything is done. Nice.' : 'Nothing here yet.'}
				</div>
			{:else}
				<div class="space-y-6">
					{#each groups as group (group.label)}
						<div>
							<div class="mb-2 flex items-center gap-2">
								<h3
									class="text-xs font-medium tracking-wide uppercase"
									class:text-destructive={group.label === 'Overdue'}
									class:text-muted-foreground={group.label !== 'Overdue'}
								>
									{group.label}
								</h3>
								<Separator class="flex-1" />
								<span class="text-xs text-muted-foreground">{group.tasks.length}</span>
							</div>

							<ul class="divide-y rounded-lg border">
								{#each group.tasks as task (task.id)}
									{@const diff = dayDiff(task.dueDate)}
									<li class="flex items-center gap-3 px-3 py-2.5">
										<ActionForm
											action="?/toggle"
											submit={() =>
												async ({ update }) =>
													await update({ reset: false })}
										>
											<HiddenField name="id" value={task.id} />
											<button
												type="submit"
												class="flex items-center"
												aria-label="Toggle task completion"
											>
												<Checkbox checked={task.isConfirmed} class="pointer-events-none" />
											</button>
										</ActionForm>

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

<FormDialog
	title={editing ? 'Edit task' : 'Add task'}
	action="?/save"
	data={data.form}
	schema={taskSchema}
	bind:open={taskOpen}
	{seed}
	hideTrigger
	submitLabel={editing ? 'Save changes' : 'Add task'}
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="title" label="Task" placeholder="Book the photographer" />
		<InputComp
			{form}
			{errors}
			name="dueDate"
			label="Due date (optional)"
			type="date"
			oldDays={true}
			futureDays={true}
			year={true}
		/>
		<InputComp
			{form}
			{errors}
			name="isConfirmed"
			label="Status"
			type="checkboxSingle"
			placeholder="Mark as completed"
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title="Remove this task?"
	description="{removing?.title ?? 'This task'} will be permanently removed from your checklist."
	action="?/delete"
	data={data.deleteForm}
	schema={taskIdSchema}
	bind:open={removeOpen}
	seed={{ id: removing?.id }}
	hideTrigger
	submitLabel="Remove"
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
	{/snippet}
</FormDialog>
