<script lang="ts">
	import { useDateFormat } from '@nahu/admin-kit/dateFormat.svelte';
	import { dateLocale } from '$lib/dateLocale';
	import { m } from '$lib/paraglide/messages.js';
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

	const formatDay = useDateFormat(dateLocale());
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
		if (filter === 'done') return [{ key: 'done', label: m.tsk_completed(), tasks: visible }];

		const buckets: Record<'overdue' | 'month' | 'upcoming' | 'none' | 'done', typeof visible> = {
			overdue: [],
			month: [],
			upcoming: [],
			none: [],
			done: []
		};
		const LABELS: Record<keyof typeof buckets, string> = {
			overdue: m.tsk_overdue(),
			month: m.tsk_this_month(),
			upcoming: m.tsk_upcoming(),
			none: m.wov_no_due(),
			done: m.tsk_completed()
		};

		for (const t of visible) {
			if (t.isConfirmed) {
				buckets.done.push(t);
				continue;
			}
			const diff = dayDiff(t.dueDate);
			if (diff === null) buckets.none.push(t);
			else if (diff < 0) buckets.overdue.push(t);
			else if (diff <= 30) buckets.month.push(t);
			else buckets.upcoming.push(t);
		}

		return (Object.keys(buckets) as (keyof typeof buckets)[])
			.filter((key) => buckets[key].length > 0)
			.map((key) => ({ key, label: LABELS[key], tasks: buckets[key] }));
	});

	function dueLabel(iso: string) {
		const diff = dayDiff(iso);
		if (diff === null) return null;
		if (diff === 0) return m.wov_due_today();
		if (diff === 1) return m.wov_due_tomorrow();
		if (diff < 0) return m.wov_overdue({ days: Math.abs(diff) });
		if (diff <= 60) return m.wov_in_days({ days: diff });
		return formatDay(iso);
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
	<PageHeader title={m.nav_tasks()} description={m.tsk_desc()}>
		{#snippet actions()}
			{#if data.templateCount > 0}
				<form method="POST" action="?/generate" use:generateEnhance>
					<HiddenField name="confirm" value="yes" />
					<Button type="submit" variant="outline" disabled={$generating || !data.weddingDate}>
						{#if $generating}<LoadingBtn name={m.tsk_suggesting()} />{:else}<Sparkles
								class="size-4"
							/>
							{m.tsk_suggest()}{/if}
					</Button>
				</form>
			{/if}
			<Button onclick={openCreate}>
				<Plus class="size-4" />
				{m.tsk_add()}
			</Button>
		{/snippet}
	</PageHeader>

	<!-- Summary -->
	<Card.Root class="p-5">
		<div class="grid gap-4 sm:grid-cols-3">
			<div>
				<p class="text-xs text-muted-foreground">{m.bud_total()}</p>
				<p class="text-xl font-semibold">{total}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.tsk_completed()}</p>
				<p class="text-xl font-semibold">{done}</p>
			</div>
			<div>
				<p class="text-xs text-muted-foreground">{m.tsk_overdue()}</p>
				<p class="text-xl font-semibold" class:text-destructive={overdue > 0}>{overdue}</p>
			</div>
		</div>

		{#if total > 0}
			<div class="mt-5 space-y-2">
				<Progress value={donePct} class="h-2" />
				<p class="text-xs text-muted-foreground">
					{m.tsk_done_line({ done, total, pct: Math.round(donePct) })}
				</p>
			</div>
		{/if}
	</Card.Root>

	<!-- List -->
	<Card.Root>
		<Card.Header>
			<Tabs.Root bind:value={filter}>
				<Tabs.List>
					<Tabs.Trigger value="open">{m.tsk_tab_todo({ count: total - done })}</Tabs.Trigger>
					<Tabs.Trigger value="done">{m.tsk_tab_done({ count: done })}</Tabs.Trigger>
					<Tabs.Trigger value="all">{m.tsk_tab_all({ count: total })}</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</Card.Header>

		<Card.Content>
			{#if total === 0}
				<div class="p-10 text-center">
					<ListChecks class="mx-auto size-8 text-muted-foreground" />
					<p class="mt-3 text-sm text-muted-foreground">{m.dash_no_tasks()}</p>
					<div class="mt-4 flex justify-center gap-2">
						{#if data.templateCount > 0 && data.weddingDate}
							<form method="POST" action="?/generate" use:generateEnhance>
								<HiddenField name="confirm" value="yes" />
								<Button type="submit" variant="outline" disabled={$generating}>
									<Sparkles class="size-4" />
									{m.tsk_build()}
								</Button>
							</form>
						{/if}
						<Button onclick={openCreate}>
							<Plus class="size-4" />
							{m.gst_add_one()}
						</Button>
					</div>
				</div>
			{:else if visible.length === 0}
				<div class="p-10 text-center text-sm text-muted-foreground">
					{filter === 'open' ? m.wov_all_done() : m.tsk_nothing()}
				</div>
			{:else}
				<div class="space-y-6">
					{#each groups as group (group.label)}
						<div>
							<div class="mb-2 flex items-center gap-2">
								<h3
									class="text-xs font-medium tracking-wide uppercase"
									class:text-destructive={group.key === 'overdue'}
									class:text-muted-foreground={group.key !== 'overdue'}
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
											<button type="submit" class="flex items-center" aria-label={m.tsk_toggle()}>
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
											<Badge variant="secondary">{m.tsk_soon()}</Badge>
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
	title={editing ? m.tsk_edit() : m.tsk_add()}
	action="?/save"
	data={data.form}
	schema={taskSchema}
	bind:open={taskOpen}
	{seed}
	hideTrigger
	submitLabel={editing ? m.wd_save() : m.tsk_add()}
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
		<InputComp {form} {errors} name="title" label={m.tsk_task()} placeholder={m.tsk_task_ph()} />
		<InputComp
			{form}
			{errors}
			name="dueDate"
			label={m.tsk_due_opt()}
			type="date"
			oldDays={true}
			futureDays={true}
			year={true}
		/>
		<InputComp
			{form}
			{errors}
			name="isConfirmed"
			label={m.tsk_status()}
			type="checkboxSingle"
			placeholder={m.tsk_mark_done()}
		/>
	{/snippet}
</FormDialog>

<FormDialog
	title={m.tsk_remove_title()}
	description={m.tsk_remove_desc({ name: removing?.title ?? m.tsk_this_task() })}
	action="?/delete"
	data={data.deleteForm}
	schema={taskIdSchema}
	bind:open={removeOpen}
	seed={{ id: removing?.id }}
	hideTrigger
	submitLabel={m.bud_remove()}
>
	{#snippet fields({ form, errors })}
		<InputComp {form} {errors} name="id" type="hidden" />
	{/snippet}
</FormDialog>
