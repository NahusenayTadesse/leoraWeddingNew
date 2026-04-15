<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Save, Video, Image as ImageIcon, AlertCircle } from '@lucide/svelte';
	import LoadingBtn from '$lib/formComponents/LoadingBtn.svelte';
	import { superForm } from 'sveltekit-superforms';
	import InputComp from '$lib/formComponents/InputComp.svelte';
	import { toast } from 'svelte-sonner';
	import FormCard from '$lib/formComponents/FormCard.svelte';
	import AddVideo from './addVideo.svelte';

	let { data } = $props();

	let images: string[] = $derived(data?.gallery ?? []);
	let rawUrl = $derived(data?.video);

	const { form, errors, enhance, delayed, message } = superForm(data.form, {});

	$effect(() => {
		$form.existing = images;
		if ($message) {
			if ($message.type === 'error') {
				toast.error($message.text);
			} else {
				toast.success($message.text);
			}
		}
	});

	let videoId = $derived.by(() => {
		const regex =
			/(?:youtube\.com\/(?:[^\/]+\/.+\/|(?:v|e(?:mbed)?)\/|.*[?&]v=)|youtu\.be\/)([^"&?\/\s]{11})/i;
		const match = rawUrl?.match(regex);
		return match ? match[1] : null;
	});
</script>

<svelte:head>
	<title>Gallery and Video</title>
</svelte:head>

<main class="container mx-auto max-w-6xl space-y-8 p-4">
	<div class="border-b pb-4">
		<h1 class="text-3xl font-bold tracking-tight">Homepage Content</h1>
		<p class="text-muted-foreground">Manage your featured video and image gallery display.</p>
	</div>

	<div class="grid grid-cols-1 gap-8 lg:grid-cols-12">
		<section class="space-y-4 lg:col-span-5">
			<div class="flex items-center gap-2 text-lg font-semibold">
				<Video class="h-5 w-5 text-primary" />
				<h2>Featured Video</h2>
			</div>

			<div class="overflow-hidden rounded-xl border bg-card shadow-sm">
				<div class="bg-muted/30 p-4">
					{#key rawUrl}
						<AddVideo data={data.videoForm} />
					{/key}
				</div>

				<div class="p-4">
					{#if videoId}
						<div
							class="group relative aspect-video w-full overflow-hidden rounded-lg bg-black shadow-inner"
						>
							<iframe
								src="https://www.youtube.com/embed/{videoId}"
								title="YouTube video player"
								class="absolute inset-0 h-full w-full"
								frameborder="0"
								allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
								allowfullscreen
							></iframe>
						</div>
					{:else if rawUrl && rawUrl !== ''}
						<div
							class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed border-destructive/50 bg-destructive/5 p-8 text-center"
						>
							<AlertCircle class="mb-2 h-10 w-10 text-destructive" />
							<p class="text-sm font-medium text-destructive">Invalid YouTube URL</p>
							<p class="text-xs text-muted-foreground">Please check the link in the input above.</p>
						</div>
					{:else}
						<div
							class="flex aspect-video w-full flex-col items-center justify-center rounded-lg border-2 border-dashed bg-muted"
						>
							<Video class="mb-2 h-12 w-12 text-muted-foreground/50" />
							<p class="px-4 text-center text-sm text-muted-foreground">
								No video configured.<br />Enter a URL to preview.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</section>

		<section class="space-y-4 lg:col-span-7">
			<div class="flex items-center gap-2 text-lg font-semibold">
				<ImageIcon class="h-5 w-5 text-primary" />
				<h2>Image Gallery</h2>
			</div>

			<FormCard
				title="Gallery Images ({images.length})"
				description="These images will scroll on your homepage."
				className="w-full shadow-sm border"
			>
				<form
					method="post"
					action="?/editGallery"
					use:enhance
					class="space-y-6"
					enctype="multipart/form-data"
				>
					<InputComp label="" name="existing" type="hidden" {form} {errors} required={true} />

					<div class="min-h-[200px] rounded-lg border bg-muted/10 p-2">
						<InputComp
							{form}
							{errors}
							type="gallery"
							name="gallery"
							label=""
							placeholder="Drop images here or click to upload"
							required
							bind:images
						/>
					</div>

					<div class="flex justify-end pt-2">
						<Button type="submit" class="w-full px-8 sm:w-auto" size="lg">
							{#if $delayed}
								<LoadingBtn name="Saving Changes..." />
							{:else}
								<Save class="mr-2 h-4 w-4" /> Save Gallery
							{/if}
						</Button>
					</div>
				</form>
			</FormCard>
		</section>
	</div>
</main>
