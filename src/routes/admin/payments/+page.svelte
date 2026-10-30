<script>
	import { PAY, PAY_PREFIXES } from '$lib/payment.js';
	let copied = $state(false);
	async function copy() {
		try {
			await navigator.clipboard.writeText(PAY.account);
			copied = true;
			setTimeout(() => (copied = false), 1500);
		} catch {}
	}
</script>

<svelte:head><title>Payment & Fees — Elite Registration Hub</title></svelte:head>

<h1 class="mb-1 text-3xl font-extrabold">Payment & Fees</h1>
<p class="mb-4 text-slate-600">The payment details applicants see on their registration form.</p>

<section class="pay">
	<div class="amt"><small>Amount</small><b>{PAY.amount}</b></div>
	<div class="line"><small>Account number</small>
		<div class="flex items-center gap-2"><code>{PAY.account}</code><button type="button" class="btn-ghost !px-3 !py-1 text-xs" onclick={copy}>{copied ? 'Copied ✓' : 'Copy'}</button></div>
	</div>
	<div class="line"><small>Bank</small><b>{PAY.bank}</b></div>
	<div class="line"><small>Account name</small><b>{PAY.name}</b></div>
</section>
<p class="mt-3 text-sm text-slate-600">Shown automatically on forms whose application-number prefix is {#each PAY_PREFIXES as p}<code class="rounded bg-teal-50 px-1.5">{p}</code>{/each}. To change these details, edit <code class="rounded bg-teal-50 px-1.5">src/lib/payment.js</code>.</p>

<style>
	.pay { overflow: hidden; border-radius: 1.2rem; background: var(--gold-tint); border: 1px solid #efdcaa; box-shadow: var(--card-shadow); }
	.amt { padding: 1.1rem 1.2rem; color: #fff; background: linear-gradient(150deg, #124a2b, #0a2e1b); }
	.amt small { display: block; color: #e6cd86; } .amt b { font-size: 2.2rem; }
	.line { display: flex; flex-direction: column; gap: .2rem; padding: .85rem 1.2rem; border-bottom: 1px solid #efdcaa; color: #1f2a22; }
	.line:last-child { border-bottom: 0; } .line small { color: #6a5a28; }
	.line code { font-size: 1.4rem; font-weight: 800; letter-spacing: .04em; }
	:global(html.dark) .pay { background: #1b3d29; border-color: #3a5a3f; } :global(html.dark) .line { color: #f1f5ef; }
</style>
