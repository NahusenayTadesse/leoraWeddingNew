<script lang="ts">
	import { Heart, Mail, Phone, MapPin } from '@lucide/svelte';
</script>

<footer class="border-t border-leora-gold/10 bg-white pt-16 pb-8">
	<div class="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
		<div class="mb-12 grid gap-12 md:grid-cols-4">
			<!-- Brand -->
			<div class="col-span-2">
				<a href="/" class="mb-4 flex items-center gap-2">
					<div
						class="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-leora-gold to-leora-champagne"
					>
						<Heart class="h-5 w-5 fill-white text-white" />
					</div>
					<div class="flex flex-col">
						<span class="font-display text-2xl font-semibold text-leora-charcoal">Leora</span>
						<span class="text-xs tracking-widest text-leora-gold uppercase">Events</span>
					</div>
				</a>
				<p class="mb-6 max-w-sm text-gray-600">
					Ethiopia's premier luxury wedding planning platform. Making dream weddings come true
					through technology and elegance.
				</p>
				<!-- <div class="flex gap-4">
					{#each [Instagram, Youtube] as Icon}
						<a
							href="#"
							class="flex h-10 w-10 items-center justify-center rounded-full bg-leora-ivory text-leora-charcoal transition-colors hover:bg-leora-gold hover:text-white"
						>
							<Icon class="h-5 w-5" />
						</a>
					{/each}
				</div> -->
			</div>

			<!-- Quick Links -->
			<div>
				<h4 class="font-display mb-4 text-lg font-semibold">Quick Links</h4>
				<ul class="space-y-2">
					{#each [['Find Vendors', '/vendors'], ['Budget Planner', '/budget'], ['My Wedding', '/dashboard'], ['Vendor Portal', '/vendor-dashboard']] as [label, href]}
						<li>
							<a {href} class="text-gray-600 transition-colors hover:text-leora-gold">{label}</a>
						</li>
					{/each}
				</ul>
			</div>

			<!-- Contact -->
			<div>
				<h4 class="font-display mb-4 text-lg font-semibold">Contact</h4>
				<ul class="space-y-3 text-gray-600">
					<li class="flex items-center gap-2">
						<Mail class="h-4 w-4 shrink-0 text-leora-gold" />
						<a href="mailto:hello@leora.events" class="transition-colors hover:text-leora-gold">
							hello@leora.events
						</a>
					</li>
					<li class="flex items-center gap-2">
						<Phone class="h-4 w-4 shrink-0 text-leora-gold" />
						+251 911 234 567
					</li>
					<li class="flex items-center gap-2">
						<MapPin class="h-4 w-4 shrink-0 text-leora-gold" />
						Addis Ababa, Ethiopia
					</li>
				</ul>
			</div>
		</div>

		<div
			class="flex flex-col items-center justify-between gap-4 border-t border-leora-gold/10 pt-8 md:flex-row"
		>
			<p class="text-sm text-gray-500">
				© {new Date().getFullYear()} Leora Events. All rights reserved.
			</p>
			<div class="flex gap-6 text-sm text-gray-500">
				<a href="#" class="transition-colors hover:text-leora-gold">Privacy Policy</a>
				<a href="#" class="transition-colors hover:text-leora-gold">Terms of Service</a>
			</div>
		</div>
	</div>
</footer>
