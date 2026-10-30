<script>
	import { PAY_PREFIXES, PAY } from '$lib/payment.js';
	let { form } = $props();
	const show = $derived(PAY_PREFIXES.includes(String(form?.prefix || '').trim().toUpperCase()));
	let copied = $state(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(PAY.account);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {}
	}
</script>

{#if show}
	<div class="rounded-lg border border-gold bg-gold-tint p-4 text-sm text-teal-900">
		<div class="mb-1 font-semibold">Payment details</div>
		<div class="mb-2 text-base"><span class="font-semibold">Amount:</span> <span class="font-bold">{PAY.amount}</span></div>
		<div class="text-xs text-teal-800">Account number</div>
		<div class="flex items-center gap-2">
			<span class="font-mono text-xl font-bold tracking-wide">{PAY.account}</span>
			<button type="button" class="btn-ghost !px-3 !py-1 text-xs" onclick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button>
		</div>
		<div class="mt-1"><span class="font-semibold">Bank:</span> {PAY.bank}</div>
		<div><span class="font-semibold">Account name:</span> {PAY.name}</div>
	</div>
{/if}
