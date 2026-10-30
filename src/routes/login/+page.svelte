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

<main class="mx-auto flex max-w-md flex-col gap-5 px-4 pb-10 pt-1">
	<a href="/admin" aria-label="Back to admin login" title="Back to admin login" class="btn-3d-ghost btn-3d-lg self-start !px-3 !text-teal-800">
		<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
	</a>
	<section class="welcome">
		<div>
			<div class="w-hi">Welcome,</div>
			<div class="w-name">Applicant</div>
			<p>Your one-stop platform for easy and seamless registration.</p>
		</div>
		<blockquote>“Your goals are valid. Keep going.”</blockquote>
	</section>
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
	.welcome { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: .7rem; padding: 1.2rem 1.3rem; border-radius: 1.3rem; color: #fff; background: radial-gradient(circle at 80% 15%, rgba(255,255,255,.07), transparent 45%), linear-gradient(150deg, #124a2b, #0a2e1b 65%, #08261a); border: 1px solid #1d5a38; box-shadow: var(--card-shadow); }
	.welcome::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: -1px; height: 3px; background: linear-gradient(90deg, transparent, #c9a13b 30%, #e6cd86 60%, transparent); }
	.w-hi { font-size: 1.15rem; opacity: .95; }
	.w-name { font-size: 2rem; font-weight: 800; line-height: 1.1; }
	.welcome p { margin: .45rem 0 0; font-size: .98rem; opacity: .92; }
	.welcome blockquote { margin: 0; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 1.15rem; color: #e6cd86; }
	main :global(.btn) { border-radius: 1rem; padding-top: .85rem; padding-bottom: .85rem; font-size: 1.05rem; }
	main :global(.card) { border-radius: 1.3rem; }
</style>
