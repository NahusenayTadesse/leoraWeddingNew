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

<footer class="bg-card mt-24 border-t">
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
				<span class="font-display block text-[18px] font-extrabold tracking-[-0.01em]">
					Leora Events
				</span>
				<small
					class="text-muted-foreground mt-px hidden text-[9px] font-semibold tracking-[0.12em] uppercase sm:block"
				>
					Ethiopia's First Wedding Platform
				</small>
			</span>
		</a>
			{#each columns as column (column.title)}
				<div>
					<h4 class="font-display mb-3.5 text-[13px] font-bold">{column.title}</h4>
					<ul class="space-y-2.5">
						{#each column.links as [label, href] (href)}
							<li>
								<a
									{href}
									class="text-muted-foreground hover:text-foreground text-[13.5px] transition-colors"
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
			class="text-muted-foreground mt-12 flex flex-col items-center justify-between gap-3 border-t pt-7 text-[13px] sm:flex-row"
		>
			<p>© {new Date().getFullYear()} Leora Events. All rights reserved.</p>
			<p>Made for weddings across Ethiopia 🇪🇹</p>
		</div>
	</div>
</footer>
