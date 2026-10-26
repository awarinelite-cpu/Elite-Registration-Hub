<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { addSaved, getSaved, removeSaved, clearSaved } from '$lib/savedLogins.js';
	let { form } = $props();
	let busy = $state(false);
	let number = $state(form?.number ?? '');
	let pin = $state('');
	let saved = $state([]);
	let picking = $state(false);

	onMount(() => {
		saved = getSaved();
		document.body.classList.add('login-dark');
		return () => document.body.classList.remove('login-dark');
	});

	// forms the applicant has submitted from this device, one "submit another" card each
	const forms = $derived([...new Map(saved.filter((s) => s.formId).map((s) => [s.formId, s.title || s.formId])).entries()]);

	function choose(e) {
		number = e.number;
		pin = e.pin;
		picking = false;
	}
	// tapping the Application Number box fills itself in (a short list appears if there are several)
	function tapNumber() {
		if (!saved.length || number) return;
		if (saved.length === 1) choose(saved[0]);
		else picking = true;
	}
	function forget(n) {
		removeSaved(n);
		saved = getSaved();
		if (!saved.length) picking = false;
	}
	function forgetAll() {
		clearSaved();
		saved = [];
		picking = false;
	}
</script>

<svelte:head><title>My application — EliteReg</title></svelte:head>

<main class="land mx-auto flex min-h-screen max-w-md flex-col justify-center gap-5 px-4 py-8">
	<div class="relative flex flex-col items-center justify-center gap-2 pb-2 pt-2">
		<a href="/admin" aria-label="Back to admin login" title="Back to admin login" class="btn-3d-ghost btn-3d-lg !absolute left-0 top-0 !px-3 !text-teal-800">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
		</a>
		<div class="land-mark">
			<svg viewBox="0 0 40 34" width="64" height="54" aria-hidden="true">
				<path d="M12 1.5h27l-4.6 8.6H7.4z" fill="#2dd4bf" />
				<path d="M7.5 12.7h22l-4.6 8.6H2.9z" fill="#14b8a6" />
				<path d="M3.1 23.9h27.4l-4.6 8.6H-1.5z" fill="#2dd4bf" />
			</svg>
		</div>
		<div class="land-name">EliteReg</div>
	</div>
	<form
		method="POST"
		class="card space-y-4"
		use:enhance={({ formData }) => {
			busy = true;
			const n = String(formData.get('number') || '').trim().toUpperCase();
			const p = String(formData.get('pin') || '').trim();
			return async ({ result, update }) => {
				// a successful login is remembered on this device so the next visit fills in by itself
				if (result.type === 'redirect') addSaved({ number: n, pin: p });
				await update({ reset: false });
				busy = false;
			};
		}}
	>
		<h1 class="text-xl font-extrabold">View or edit your application</h1>
		{#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
		<div class="relative">
			<label class="label" for="number">Application Number</label>
			<input
				class="input font-mono uppercase"
				id="number"
				name="number"
				placeholder="FUOYE-2026-0001"
				bind:value={number}
				onfocus={tapNumber}
				onclick={tapNumber}
				autocomplete="off"
				required
			/>
			{#if picking}
				<div class="absolute left-0 right-0 z-10 mt-1 overflow-hidden rounded-xl border border-slate-200 bg-white shadow-lg">
					{#each saved as s (s.number)}
						<div class="flex items-center justify-between gap-2 border-b border-slate-100 px-3 py-2 last:border-0">
							<button type="button" class="min-w-0 flex-1 text-left" onclick={() => choose(s)}>
								<div class="truncate text-sm font-semibold">{s.name || s.number}</div>
								<div class="truncate font-mono text-xs text-slate-500">{s.number}</div>
							</button>
							<button type="button" class="shrink-0 text-xs text-red-600 hover:underline" onclick={() => forget(s.number)}>Forget</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
		<div>
			<label class="label" for="pin">Access PIN</label>
			<input class="input font-mono" id="pin" name="pin" type="password" inputmode="numeric" maxlength="6" placeholder="6-digit PIN" bind:value={pin} autocomplete="off" required />
		</div>
		<button class="btn w-full" disabled={busy}>{busy ? 'Checking…' : 'Continue'}</button>
	</form>

	{#if forms.length}
		<div class="card space-y-3">
			<h2 class="font-bold">Submit another application</h2>
			<p class="text-sm text-slate-600">Applying for someone else? Start a new form below.</p>
			{#each forms as [id, title] (id)}
				<a class="btn-ghost block text-center" href="/register/{id}?new=1" data-sveltekit-reload>{title}</a>
			{/each}
			<button type="button" class="text-xs text-slate-500 underline" onclick={forgetAll}>Forget saved logins on this device</button>
		</div>
	{/if}
</main>

<style>
	:global(body.login-dark) {
		background:
			radial-gradient(circle at 85% 8%, rgba(45, 212, 191, .28), transparent 38%),
			radial-gradient(circle at 5% 55%, rgba(20, 184, 166, .22), transparent 42%),
			linear-gradient(165deg, #04302f 0%, #07504b 55%, #052f2c 100%) fixed;
		color: #e8fffb;
	}
	.land { position: relative; }
	.land::before { content: ''; position: absolute; z-index: -1; right: -3.5rem; top: 5.5rem; width: 15rem; height: 15rem; border-radius: 50%; border: 2px solid rgba(94, 234, 212, .22); box-shadow: 0 0 0 2.2rem rgba(94, 234, 212, .05), 0 0 0 4.4rem rgba(94, 234, 212, .03); }
	.land-mark { display: grid; place-items: center; width: 6rem; height: 6rem; border-radius: 1.75rem; background: linear-gradient(145deg, rgba(255,255,255,.2), rgba(255,255,255,.04)); border: 1px solid rgba(255,255,255,.35); box-shadow: inset 0 0 14px rgba(255,255,255,.2), 0 18px 30px -12px rgba(0,0,0,.6); }
	.land-name { font-size: 2.2rem; font-weight: 800; letter-spacing: -.01em; color: #fff; text-shadow: 0 2px 10px rgba(0,0,0,.35); }
	.land :global(.btn) { --fa: #22d3b4; --fb: #0f9f8c; padding-top: .8rem; padding-bottom: .8rem; font-size: 1.05rem; }
</style>
