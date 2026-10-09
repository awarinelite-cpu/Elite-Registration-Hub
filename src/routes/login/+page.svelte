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

	onMount(() => (saved = getSaved()));

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

<main class="mx-auto flex min-h-screen max-w-md flex-col justify-center gap-4 px-4 py-8">
	<div class="relative flex items-center justify-center">
		<a href="/admin" aria-label="Back to admin login" title="Back to admin login" class="btn-3d-ghost btn-3d-lg !absolute left-0 !px-3 !text-teal-800">
			<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
		</a>
		<div class="text-xl font-extrabold text-teal-700">EliteReg</div>
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
		<h1 class="text-lg font-bold">View or edit your application</h1>
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
