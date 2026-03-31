<script lang="ts">
	let { value, label }: { value: string; label: string } = $props();
</script>

<div class="glass-card rounded-xl p-4 text-center">
	<div class="text-2xl font-bold text-leora-gold">{value}</div>
	<div class="text-sm text-gray-600">{label}</div>
</div>
