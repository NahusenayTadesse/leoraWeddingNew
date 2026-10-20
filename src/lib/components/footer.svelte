<script lang="ts">
	// Column structure mirrors the PHP footer.
	const columns = [
		{
			title: 'Platform',
			links: [
				['Marketplace', '/vendors'],
				['Budget Estimator', '/budget-estimator'],
				['Dashboard', '/dashboard'],
				['Leora Card', '/card'],
				['Pricing', '/pricing']
			]
		},
		{
			// Careers and Press were in the PHP footer but never had pages behind
			// them — they 404'd there too. Dropped rather than shipped broken.
			title: 'Company',
			links: [
				['About', '/about-us'],
				['Contact', '/contact-us']
			]
		},
		{
			title: 'Support',
			links: [
				['FAQ', '/#faq'],
				['Browse Vendors', '/vendors'],
				['Vendor Sign Up', '/signup?role=vendor'],
				['Vendor Portal', '/vendor-dashboard']
			]
		},
		{
			title: 'Legal',
			links: [
				['Terms of Service', '/terms'],
				['Privacy Policy', '/privacy']
			]
		}
	] as const;
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
						Ethiopia's First Wedding Platform
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
			<p>© {new Date().getFullYear()} Leora Events. All rights reserved.</p>
			<p>Made for weddings across Ethiopia 🇪🇹</p>
		</div>
	</div>
</footer>
