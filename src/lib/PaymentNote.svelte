<script>
	let { form } = $props();
	const PAY_PREFIXES = ['NMCN-REQUIREMENTS'];
	const show = $derived(PAY_PREFIXES.includes(String(form?.prefix || '').toUpperCase()));
	let copied = $state(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText('9026985870');
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {}
	}
</script>

{#if show}
	<div class="rounded-lg border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
		<div class="mb-1 font-semibold">Payment details</div>
		<div class="mb-2 text-base"><span class="font-semibold">Amount:</span> <span class="font-bold">₦3,000</span></div>
		<div class="text-xs text-emerald-800">Account number</div>
		<div class="flex items-center gap-2">
			<span class="font-mono text-xl font-bold tracking-wide">9026985870</span>
			<button type="button" class="btn-ghost !px-3 !py-1 text-xs" onclick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
		</div>
		<div class="mt-1"><span class="font-semibold">Bank:</span> Opay</div>
		<div><span class="font-semibold">Account name:</span> Awarin Elite</div>
	</div>
{/if}
