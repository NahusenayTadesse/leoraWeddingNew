<script lang="ts">
	/** Badges the couple earns as planning moves along, each one shareable. */
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import { toast } from 'svelte-sonner';
	import {
		CalendarHeart,
		Users,
		Wallet,
		Store,
		Stars,
		UserPlus,
		Mail,
		MailCheck,
		ListChecks,
		BadgeCheck,
		Share2
	} from '@lucide/svelte';
	import { m } from '$lib/paraglide/messages.js';

	let {
		dateSet,
		daysAway,
		partnerJoined,
		budgetItems,
		vendorsBooked,
		guests,
		cardPublished,
		rsvps,
		tasksDone,
		tasksTotal,
		allPaid
	}: {
		dateSet: boolean;
		daysAway: number | null;
		partnerJoined: boolean;
		budgetItems: number;
		vendorsBooked: number;
		guests: number;
		cardPublished: boolean;
		rsvps: number;
		tasksDone: number;
		tasksTotal: number;
		allPaid: boolean;
	} = $props();

	const badges = $derived([
		{ label: m.ms_date(), icon: CalendarHeart, earned: dateSet },
		{ label: m.ms_partner(), icon: UserPlus, earned: partnerJoined },
		{ label: m.ms_budget(), icon: Wallet, earned: budgetItems > 0 },
		{ label: m.ms_first_vendor(), icon: Store, earned: vendorsBooked >= 1 },
		{ label: m.ms_three_vendors(), icon: Stars, earned: vendorsBooked >= 3 },
		{ label: m.ms_guests(), icon: Users, earned: guests >= 50 },
		{ label: m.ms_card(), icon: Mail, earned: cardPublished },
		{ label: m.ms_rsvps(), icon: MailCheck, earned: rsvps >= 50 },
		{
			label: m.ms_half_tasks(),
			icon: ListChecks,
			earned: tasksTotal > 0 && tasksDone * 2 >= tasksTotal
		},
		{ label: m.ms_paid(), icon: BadgeCheck, earned: allPaid }
	]);
	const earned = $derived(badges.filter((b) => b.earned).length);

	async function share(label: string) {
		const text =
			daysAway !== null && daysAway > 0
				? m.ms_share_text({ milestone: label, days: daysAway })
				: m.ms_share_text_nodate({ milestone: label });
		const url = location.origin;
		try {
			if (navigator.share) await navigator.share({ text, url });
			else {
				await navigator.clipboard.writeText(`${text} ${url}`);
				toast.success(m.partner_copied());
			}
		} catch {
			// Share sheet dismissed.
		}
	}
</script>

<Card.Root>
	<Card.Header class="flex flex-row items-center justify-between">
		<Card.Title>{m.ms_title()}</Card.Title>
		<span class="text-sm text-muted-foreground tabular-nums">{earned} / {badges.length}</span>
	</Card.Header>
	<Card.Content>
		<ul class="grid grid-cols-2 gap-2 sm:grid-cols-5">
			{#each badges as badge (badge.label)}
				{@const Icon = badge.icon}
				<li
					class="flex flex-col items-center gap-1.5 rounded-lg border p-3 text-center text-xs {badge.earned
						? 'border-(--leora-gold) bg-(--leora-gold-soft) text-foreground'
						: 'text-muted-foreground opacity-60'}"
				>
					<Icon class="size-5" aria-hidden="true" />
					<span class="font-medium">{badge.label}</span>
					{#if badge.earned}
						<button
							type="button"
							class="flex items-center gap-1 text-[11px] underline"
							onclick={() => share(badge.label)}
						>
							<Share2 class="size-3" />{m.ms_share()}
						</button>
					{/if}
				</li>
			{/each}
		</ul>
	</Card.Content>
</Card.Root>
