<script lang="ts">
	import { m } from '$lib/paraglide/messages.js';
	// Column structure mirrors the PHP footer.
	const columns = $derived([
		{
			title: m.footer_platform(),
			links: [
				[m.nav_marketplace(), '/vendors'],
				[m.footer_budget_estimator(), '/budget-estimator'],
				[m.footer_dashboard(), '/dashboard'],
				[m.nav_card(), '/card'],
				[m.nav_pricing(), '/pricing']
			]
		},
		{
			// Careers and Press were in the PHP footer but never had pages behind
			// them — they 404'd there too. Dropped rather than shipped broken.
			title: m.footer_company(),
			links: [
				[m.footer_about(), '/about-us'],
				[m.footer_contact(), '/contact-us']
			]
		},
		{
			title: m.footer_support(),
			links: [
				[m.footer_faq(), '/#faq'],
				[m.footer_browse_vendors(), '/vendors'],
				[m.footer_vendor_signup(), '/signup?role=vendor'],
				[m.footer_vendor_portal(), '/vendor-dashboard']
			]
		},
		{
			title: m.footer_legal(),
			links: [
				[m.footer_terms(), '/terms'],
				[m.footer_privacy(), '/privacy']
			]
		}
	] as const);
</script>

<footer class="mt-24 border-t bg-card">
	<div class="mx-auto max-w-[1180px] px-5 py-16 sm:px-8">
		<div class="grid gap-10 md:grid-cols-[1.6fr_repeat(4,1fr)]">
			<a href="/" class="flex shrink-0 items-center gap-2.5">
				<img
					src="/leora-logo.jpg"
					alt=""
					width="38"
					height="38"
					class="size-9.5 rounded-[10px] object-cover"
				/>
				<span class="leading-tight">
					<span class="block font-display text-[18px] font-extrabold tracking-[-0.01em]">
						Leora Events
					</span>
					<small
						class="mt-px hidden text-[9px] font-semibold tracking-[0.12em] text-muted-foreground uppercase sm:block"
					>
						{m.site_tagline()}
					</small>
				</span>
			</a>
			{#each columns as column (column.title)}
				<div>
					<h4 class="mb-3.5 font-display text-[13px] font-bold">{column.title}</h4>
					<ul class="space-y-2.5">
						{#each column.links as [label, href] (href)}
							<li>
								<a
									{href}
									class="text-[13.5px] text-muted-foreground transition-colors hover:text-foreground"
								>
									{label}
								</a>
							</li>
						{/each}
					</ul>
				</div>
			{/each}
		</div>

		<div
			class="mt-12 flex flex-col items-center justify-between gap-3 border-t pt-7 text-[13px] text-muted-foreground sm:flex-row"
		>
			<p>© {new Date().getFullYear()} Leora Events. {m.footer_rights()}</p>
			<p>{m.footer_made_for()}</p>
		</div>
	</div>
</footer>
