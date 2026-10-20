<script lang="ts">
	import HiddenField from '@nahu/admin-kit/formComponents/HiddenField.svelte';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import * as Dialog from '@nahu/admin-kit/components/ui/dialog/index.js';
	import * as Tabs from '@nahu/admin-kit/components/ui/tabs/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import * as Card from '@nahu/admin-kit/components/ui/card/index.js';
	import * as Accordion from '$lib/components/ui/accordion';
	import { Badge } from '@nahu/admin-kit/components/ui/badge/index.js';
	import { Check, Loader2 } from '@lucide/svelte';
	import { formatETB, toMoney } from '$lib/money';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import { enhance as kitEnhance } from '$app/forms';
	import { planTransferSchema } from '$lib/schemas/payment';
	import TransferFields from '$lib/components/payments/TransferFields.svelte';
	import { m } from '$lib/paraglide/messages.js';

	let { data } = $props();

	type Plan = (typeof data.plans)[number];

	let checkoutPlan = $state<Plan | null>(null);
	let payMode = $state<'chapa' | 'transfer'>('chapa');
	let couponCode = $state('');
	let quote = $state<{ discount: number; total: number; code: string } | null>(null);
	let quoteError = $state('');

	const planPrice = $derived(checkoutPlan ? toMoney(checkoutPlan.price) : 0);
	const total = $derived(quote ? quote.total : planPrice);

	// svelte-ignore state_referenced_locally
	const {
		form: transferData,
		errors: transferErrors,
		enhance: transferEnhance,
		submitting: sendingReceipt
	} = createForm(data.transferForm, planTransferSchema, {
		id: 'plan-transfer',
		resetForm: true,
		onUpdated: ({ form }) => {
			if (form.message?.type === 'success') checkoutPlan = null;
		}
	});

	function openCheckout(plan: Plan) {
		checkoutPlan = plan;
		payMode = 'chapa';
		couponCode = '';
		quote = null;
		quoteError = '';
		$transferData.planId = plan.id;
		$transferData.couponCode = '';
	}

	/** superforms nests a file field's errors differently; this reads the first message of any. */
	function firstError(errors: unknown): string | undefined {
		if (Array.isArray(errors)) return errors[0];
		return (errors as { _errors?: string[] } | undefined)?._errors?.[0];
	}

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
			"No. You pay the vendor's agreed price through Leora; our commission comes out of the vendor's share, not yours."
		],
		[
			'Which payment methods work?',
			'Telebirr, CBE Birr, M-Pesa and cards through Chapa, or a bank transfer with your receipt.'
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
	<p class="text-[12.5px] font-bold tracking-[0.08em] text-accent-foreground uppercase">Pricing</p>
	<h1 class="mx-auto mt-2 max-w-2xl font-display text-4xl font-extrabold text-balance sm:text-5xl">
		Plans that fit the wedding you're planning
	</h1>
	<p class="mx-auto mt-4 max-w-xl text-[15.5px] text-muted-foreground">
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
					class="h-full {highlighted ? 'border-primary shadow-lg ring-2 ring-primary/25' : ''}"
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
							<span class="text-[13px] text-muted-foreground">
								{cycleLabel(plan.billingCycle, plan.price)}
							</span>
						</div>
					</Card.Header>

					<!-- flex-1 pushes every footer to the same baseline so the
					     upgrade buttons line up across all three cards. -->
					<Card.Content class="flex-1">
						<ul class="space-y-2.5">
							<!-- Keyed by index, not by the string. Features are free text an
							     admin typed, so the same line can legitimately appear twice —
							     keying on the value itself crashed the page with
							     each_key_duplicate the moment a plan repeated a bullet. -->
							{#each plan.features ?? [] as feature, i (i)}
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
							<Button
								variant={highlighted ? 'default' : 'outline'}
								class="w-full"
								onclick={() => openCheckout(plan)}
							>
								Upgrade to {plan.name}
							</Button>
						{/if}
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<Card.Root>
			<Card.Content class="py-16 text-center">
				<p class="font-display text-lg font-bold">No plans are published yet</p>
				<p class="mx-auto mt-2 max-w-sm text-sm text-muted-foreground">
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
				<Accordion.Content class="text-[14px] leading-relaxed text-muted-foreground">
					{a}
				</Accordion.Content>
			</Accordion.Item>
		{/each}
	</Accordion.Root>
</section>

<Dialog.Root open={!!checkoutPlan} onOpenChange={(open) => !open && (checkoutPlan = null)}>
	<Dialog.Content class="max-h-[90dvh] overflow-y-auto sm:max-w-lg">
		{#if checkoutPlan}
			<Dialog.Header>
				<Dialog.Title>Upgrade to {checkoutPlan.name}</Dialog.Title>
				<Dialog.Description>
					{#if quote}
						<span class="line-through">{formatETB(planPrice)}</span>
						<strong class="ml-1">{formatETB(total)}</strong> ({quote.code})
					{:else}
						{formatETB(planPrice)}
					{/if}
				</Dialog.Description>
			</Dialog.Header>

			<form
				method="POST"
				action="?/quote"
				class="flex items-end gap-2"
				use:kitEnhance={() =>
					async ({ result }) => {
						if (result.type === 'success') {
							quote = (result.data as { quote: typeof quote }).quote;
							quoteError = '';
						} else if (result.type === 'failure') {
							quote = null;
							quoteError = (result.data as { quoteError?: string })?.quoteError ?? '';
						}
					}}
			>
				<input type="hidden" name="planId" value={checkoutPlan.id} />
				<label class="flex-1 space-y-1.5 text-sm font-medium">
					<span>{m.pay_coupon()}</span>
					<input
						name="couponCode"
						bind:value={couponCode}
						oninput={() => (quote = null)}
						class="h-10 w-full rounded-md border bg-background px-3 uppercase"
					/>
				</label>
				<Button type="submit" variant="outline">{m.pay_coupon_apply()}</Button>
			</form>
			{#if quoteError}<p class="text-sm text-destructive">{quoteError}</p>{/if}

			<Tabs.Root bind:value={payMode} class="mt-2">
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="chapa">{m.pay_method_chapa()}</Tabs.Trigger>
					<Tabs.Trigger value="transfer">{m.pay_method_transfer()}</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="chapa" class="pt-3">
					<p class="mb-4 text-sm text-muted-foreground">{m.pay_method_chapa_hint()}</p>
					<!-- A plain post: the server answers with a 303 to Chapa. -->
					<form method="POST" action="?/subscribe">
						<input type="hidden" name="planId" value={checkoutPlan.id} />
						<input type="hidden" name="couponCode" value={quote ? couponCode : ''} />
						<Button type="submit" class="w-full">{m.pay_chapa_submit()}</Button>
					</form>
				</Tabs.Content>

				<Tabs.Content value="transfer" class="pt-3">
					{#if data.accounts.length === 0}
						<p class="text-sm text-muted-foreground">{m.pay_no_accounts()}</p>
					{:else}
						<form
							method="POST"
							action="?/transfer"
							enctype="multipart/form-data"
							use:transferEnhance
							class="space-y-4"
						>
							<HiddenField name="planId" value={checkoutPlan.id} />
							<HiddenField name="couponCode" value={quote ? couponCode : ''} />
							<TransferFields
								form={transferData}
								accounts={data.accounts}
								{total}
								accountError={firstError($transferErrors.bankAccountId)}
								receiptError={firstError($transferErrors.receipt)}
							/>
							<InputComp
								label={m.pay_reference()}
								form={transferData}
								errors={transferErrors}
								name="reference"
							/>
							<Button type="submit" class="w-full" disabled={$sendingReceipt}>
								{#if $sendingReceipt}
									<Loader2 class="mr-2 size-4 animate-spin" />{m.pay_uploading()}
								{:else}
									{m.pay_transfer_submit()}
								{/if}
							</Button>
						</form>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		{/if}
	</Dialog.Content>
</Dialog.Root>
