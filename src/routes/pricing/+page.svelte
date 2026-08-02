<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Badge } from '$lib/components/ui/badge';
	import { Check, Loader2 } from '@lucide/svelte';
	import { toMoney } from '$lib/money';
	import { superForm } from 'sveltekit-superforms/client';
	import { toast } from 'svelte-sonner';

	let { data } = $props();

	const { enhance, delayed } = superForm(data.subscribeForm, {
		onUpdated: ({ form: f }) => {
			if (f.message?.type === 'success' && f.message.checkoutUrl) {
				window.location.href = f.message.checkoutUrl;
			} else if (f.message?.type === 'error') {
				toast.error(f.message.text);
			}
		}
	});

	/** Golden is the recommended tier in the PHP pricing page. */
	const HIGHLIGHTED = 'golden';

	const priceLabel = (price: string | null) => {
		const n = toMoney(price);
		return n === 0 ? 'Free' : `ETB ${n.toLocaleString()}`;
	};

	const cycleLabel = (cycle: string, price: string | null) => {
		if (toMoney(price) === 0) return 'forever';
		return cycle === 'one_time' ? 'one-time' : `per ${cycle === 'yearly' ? 'year' : 'month'}`;
	};

	const faqs = [
		[
			'Can I change plans later?',
			'Yes. Upgrading takes effect immediately and your new plan limits apply straight away.'
		],
		[
			'What happens when my wedding is over?',
			'Nothing disappears. Your budget, guest list and vendor history stay available on your account.'
		],
		[
			'Do you take a cut of what I pay vendors?',
			'No. Couples pay vendors directly; Leora charges vendors a listing commission, not you.'
		],
		[
			'Which payment methods work?',
			'Telebirr, CBE Birr and bank transfer, plus card payments through our payment partner.'
		]
	];
</script>

<svelte:head>
	<title>Pricing — Leora Events</title>
	<meta
		name="description"
		content="Simple plans for couples planning an Ethiopian wedding. Start free, upgrade when you need more."
	/>
</svelte:head>

<section class="mx-auto max-w-[1180px] px-5 pt-16 pb-10 text-center sm:px-8">
	<p class="text-accent-foreground text-[12.5px] font-bold tracking-[0.08em] uppercase">Pricing</p>
	<h1 class="font-display mx-auto mt-2 max-w-2xl text-4xl font-extrabold text-balance sm:text-5xl">
		Plans that fit the wedding you're planning
	</h1>
	<p class="text-muted-foreground mx-auto mt-4 max-w-xl text-[15.5px]">
		Start free and browse every vendor. Upgrade only when you want unlimited tools and a planner in
		your corner.
	</p>
</section>

<section class="mx-auto max-w-[1180px] px-5 pb-16 sm:px-8">
	{#if data.plans.length}
		<div class="grid gap-5 lg:grid-cols-3">
			{#each data.plans as plan (plan.id)}
				{@const highlighted = plan.slug === HIGHLIGHTED}
				{@const isCurrent = data.currentPlanSlug === plan.slug}
				<!-- Card.Root sets overflow-hidden, so the "most popular" marker
				     sits inside the header rather than overhanging the border. -->
				<Card.Root
					class="h-full {highlighted ? 'border-primary ring-primary/25 shadow-lg ring-2' : ''}"
				>
					<Card.Header>
						<div class="flex items-center justify-between gap-2">
							<Card.Title class="font-display text-xl font-extrabold">{plan.name}</Card.Title>
							{#if highlighted}
								<Badge>Most popular</Badge>
							{/if}
						</div>
						<div class="mt-2 flex items-baseline gap-1.5">
							<span class="font-display text-4xl font-extrabold">{priceLabel(plan.price)}</span>
							<span class="text-muted-foreground text-[13px]">
								{cycleLabel(plan.billingCycle, plan.price)}
							</span>
						</div>
					</Card.Header>

					<!-- flex-1 pushes every footer to the same baseline so the
					     upgrade buttons line up across all three cards. -->
					<Card.Content class="flex-1">
						<ul class="space-y-2.5">
							{#each plan.features ?? [] as feature (feature)}
								<li class="flex items-start gap-2.5 text-[13.5px]">
									<Check class="mt-0.5 size-4 shrink-0 text-(--color-success)" />
									<span>{feature}</span>
								</li>
							{/each}
						</ul>
					</Card.Content>

					<Card.Footer>
						{#if isCurrent}
							<Button variant="outline" class="w-full" disabled>Your current plan</Button>
						{:else if toMoney(plan.price) === 0}
							<Button href="/signup" variant="outline" class="w-full">Get started free</Button>
						{:else if !data.hasUser}
							<Button href="/login?redirectTo=/pricing" variant="outline" class="w-full">
								Log in to upgrade
							</Button>
						{:else if !data.hasCouple}
							<Button href="/wedding/profile" variant="outline" class="w-full">
								Complete your profile to upgrade
							</Button>
						{:else}
							<form method="POST" action="?/subscribe" use:enhance class="w-full">
								<input type="hidden" name="planId" value={plan.id} />
								<Button
									type="submit"
									variant={highlighted ? 'default' : 'outline'}
									class="w-full"
									disabled={$delayed}
								>
									{#if $delayed}
										<Loader2 class="mr-2 size-4 animate-spin" />
									{/if}
									Upgrade to {plan.name}
								</Button>
							</form>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<p class="font-display text-lg font-bold">No plans are published yet</p>
				<p class="text-muted-foreground mx-auto mt-2 max-w-sm text-sm">
					Once plans are added to the catalog they'll appear here automatically.
				</p>
			</Card.Content>
		</Card.Root>
	{/if}
</section>

<section class="mx-auto max-w-[760px] px-5 pb-20 sm:px-8">
	<h2 class="font-display text-2xl font-extrabold">Pricing questions</h2>
	<Accordion.Root type="single" class="mt-5">
		{#each faqs as [q, a], i (q)}
			<Accordion.Item value={`pricing-faq-${i}`}>
				<Accordion.Trigger class="text-left text-[15px] font-semibold">{q}</Accordion.Trigger>
				<Accordion.Content class="text-muted-foreground text-[14px] leading-relaxed">
					{a}
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</section>
