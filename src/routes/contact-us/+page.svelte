<script lang="ts">
	import {
		Card,
		CardHeader,
		CardTitle,
		CardContent
	} from '@nahu/admin-kit/components/ui/card/index.js';
	import { Button } from '@nahu/admin-kit/components/ui/button/index.js';
	import { IconBrandFacebook, IconBrandInstagram, IconBrandTiktok } from '@tabler/icons-svelte';
	import { MailIcon, MessageCircleIcon, SendIcon, PhoneIcon, MapPinIcon } from '@lucide/svelte';
	import { createForm } from '@nahu/admin-kit/forms/createForm';
	import InputComp from '@nahu/admin-kit/formComponents/InputComp.svelte';
	import LoadingBtn from '@nahu/admin-kit/formComponents/LoadingBtn.svelte';
	import { contactSchema } from './schema';
	import { SITE } from '$lib/site';
	import { m } from '$lib/paraglide/messages.js';
	import type { PageProps } from './$types';

	let { data }: PageProps = $props();

	// svelte-ignore state_referenced_locally
	const { form, errors, enhance, delayed } = createForm(data.form, contactSchema);

	const subjects = [
		{ value: 'couple', name: m.contact_subject_couple() },
		{ value: 'new_vendor', name: m.contact_subject_new_vendor() },
		{ value: 'vendor', name: m.contact_subject_vendor() },
		{ value: 'press', name: m.contact_subject_press() },
		{ value: 'other', name: m.contact_subject_other() }
	];

	const socialLinks = [
		{ name: 'Instagram', url: SITE.social.instagram, icon: IconBrandInstagram },
		{ name: 'TikTok', url: SITE.social.tiktok, icon: IconBrandTiktok },
		{ name: 'Facebook', url: SITE.social.facebook, icon: IconBrandFacebook },
		{ name: 'Telegram', url: SITE.social.telegram, icon: MessageCircleIcon }
	].filter((s) => s.url);

	const contactInfo = [
		{ icon: MailIcon, label: m.contact_email(), value: SITE.email, href: `mailto:${SITE.email}` },
		{
			icon: MailIcon,
			label: m.contact_email(),
			value: SITE.vendorEmail,
			href: `mailto:${SITE.vendorEmail}`
		},
		SITE.phone && {
			icon: PhoneIcon,
			label: m.contact_phone_label(),
			value: SITE.phone,
			href: `tel:${SITE.phone}`
		},
		SITE.whatsapp && {
			icon: MessageCircleIcon,
			label: m.contact_whatsapp(),
			value: `+${SITE.whatsapp}`,
			href: `https://wa.me/${SITE.whatsapp}`
		}
	].filter((i) => !!i);
</script>

<svelte:head>
	<title>{m.contact_meta_title()}</title>
	<meta name="description" content={m.contact_meta_description()} />
	<meta property="og:title" content={m.contact_meta_title()} />
	<meta property="og:description" content={m.contact_meta_description()} />
</svelte:head>

<div class="mx-auto w-full max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
	<div class="mb-12 text-center">
		<p class="mb-2 text-sm font-semibold tracking-wide text-(--leora-gold-dark) uppercase">
			{m.contact_eyebrow()}
		</p>
		<h1 class="mb-4 text-4xl font-bold sm:text-5xl">{m.contact_title()}</h1>
		<p class="mx-auto max-w-2xl text-lg text-muted-foreground">{m.contact_lead()}</p>
	</div>

	<div class="grid gap-8 lg:grid-cols-3">
		<div class="lg:col-span-2">
			<Card class="border-2">
				<CardHeader>
					<CardTitle>{m.contact_form_title()}</CardTitle>
				</CardHeader>
				<CardContent>
					<form class="space-y-4" action="?/contact" method="POST" use:enhance>
						<div class="grid gap-4 sm:grid-cols-2">
							<InputComp {form} {errors} name="name" label={m.contact_name()} required />
							<InputComp
								{form}
								{errors}
								type="email"
								name="email"
								label={m.contact_email()}
								required
							/>
						</div>
						<div class="grid gap-4 sm:grid-cols-2">
							<InputComp
								{form}
								{errors}
								type="tel"
								name="phone"
								label={m.contact_phone()}
								placeholder="09xxxxxxxx"
							/>
							<InputComp
								{form}
								{errors}
								type="select"
								name="subject"
								label={m.contact_subject()}
								items={subjects}
							/>
						</div>
						<InputComp
							{form}
							{errors}
							type="textarea"
							name="message"
							label={m.contact_message()}
							required
						/>
						<Button type="submit" class="w-full gap-2">
							{#if $delayed}
								<LoadingBtn name={m.contact_sending()} />
							{:else}
								<SendIcon class="h-4 w-4" />
								{m.contact_send()}
							{/if}
						</Button>
					</form>
				</CardContent>
			</Card>
		</div>

		<div class="space-y-6">
			<Card class="border-2">
				<CardHeader>
					<CardTitle class="text-lg">{m.contact_info_title()}</CardTitle>
				</CardHeader>
				<CardContent class="space-y-2">
					{#each contactInfo as info (info.href)}
						<a
							href={info.href}
							class="flex items-start gap-3 rounded-lg p-3 transition-colors hover:bg-accent/10"
						>
							<div class="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
								<info.icon class="h-4 w-4 text-primary" />
							</div>
							<div class="min-w-0 flex-1">
								<p class="text-sm font-medium text-muted-foreground">{info.label}</p>
								<p class="text-sm font-semibold break-all">{info.value}</p>
							</div>
						</a>
					{/each}
					<div class="flex items-start gap-3 p-3">
						<div class="mt-1 flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
							<MapPinIcon class="h-4 w-4 text-primary" />
						</div>
						<div class="flex-1">
							<p class="text-sm font-medium text-muted-foreground">{m.contact_office()}</p>
							<p class="text-sm font-semibold">{SITE.address}</p>
							<p class="text-xs text-muted-foreground">{m.contact_hours()}</p>
						</div>
					</div>
				</CardContent>
			</Card>

			{#if socialLinks.length}
				<Card class="border-2">
					<CardHeader>
						<CardTitle class="text-lg">{m.contact_follow()}</CardTitle>
					</CardHeader>
					<CardContent>
						<div class="grid grid-cols-2 gap-3">
							{#each socialLinks as social (social.url)}
								<a
									href={social.url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex flex-col items-center gap-2 rounded-lg border p-4 transition-all hover:border-primary hover:shadow-lg"
									title={social.name}
								>
									<social.icon class="h-6 w-6" />
									<span class="text-xs font-medium">{social.name}</span>
								</a>
							{/each}
						</div>
					</CardContent>
				</Card>
			{/if}

			<p class="rounded-lg border bg-muted/40 p-4 text-sm text-muted-foreground">
				{m.contact_vendor_support()}
			</p>
		</div>
	</div>
</div>
