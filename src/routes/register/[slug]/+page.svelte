<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FormFields from '$lib/FormFields.svelte';
	import { addSaved, getSaved } from '$lib/savedLogins.js';
	let { data, form } = $props();
	let busy = $state(false);
	let copied = $state(false);
	let ready = $state(false);

	// Someone who already submitted this form on this device goes to the home (login) page instead.
	// "?new=1" (from the Submit another application card) skips that so they can fill a new form.
	onMount(() => {
		const again = page.url.searchParams.get('new') === '1';
		if (!again && !form?.success && getSaved().some((x) => x.formId === data.form.id)) {
			goto('/login', { replaceState: true });
			return;
		}
		ready = true;
	});

	// remember the login on this device so the home page can fill it in next time
	$effect(() => {
		if (form?.success) addSaved({ number: form.applicationNumber, pin: form.pin, formId: data.form.id, title: form.title, name: form.name || '' });
	});

	async function copy(text) {
		await navigator.clipboard?.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head><title>{data.form.title} — EliteReg</title></svelte:head>

<noscript><style>.pre-ready { visibility: visible !important; }</style></noscript>

<main class="pre-ready mx-auto max-w-2xl px-4 py-8 {ready ? '' : 'invisible'}">
	{#if form?.success}
		<div class="card text-center">
			<div class="mb-2 text-4xl">✅</div>
			<h1 class="text-xl font-bold">Application submitted</h1>
			<p class="mt-1 text-sm text-slate-600">{form.title}</p>

			<div class="mt-5 grid gap-3 text-left sm:grid-cols-2">
				<div class="rounded-lg bg-slate-100 p-3">
					<div class="text-xs text-slate-500">Application Number</div>
					<div class="font-mono text-lg font-bold">{form.applicationNumber}</div>
				</div>
				<div class="rounded-lg bg-slate-100 p-3">
					<div class="text-xs text-slate-500">Access PIN</div>
					<div class="font-mono text-lg font-bold">{form.pin}</div>
				</div>
			</div>
			<p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
				Save both now: the PIN is shown only once and cannot be recovered. They are also remembered on this device, so they fill in automatically when you come back.
			</p>
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<button class="btn-ghost" onclick={() => copy(`Application Number: ${form.applicationNumber}\nAccess PIN: ${form.pin}`)}>
					{copied ? 'Copied ✓' : 'Copy details'}
				</button>
				<button class="btn-ghost" onclick={() => window.print()}>Print</button>
				<a class="btn" href="/login">Go to login</a>
				<a class="btn-ghost" href="/register/{data.form.id}?new=1" data-sveltekit-reload>Submit another</a>
			</div>
		</div>
	{:else}
		<a href="/login" class="mb-4 flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
			<span>Already submitted? Log in with your Application Number and PIN.</span>
			<span class="btn-ghost shrink-0 !px-3 !py-1">Log in</span>
		</a>

		<header class="mb-5">
			<h1 class="text-2xl font-bold">{data.form.title}</h1>
			{#if data.form.description}<p class="mt-1 text-slate-600">{data.form.description}</p>{/if}
		</header>

		{#if data.closed}
			<div class="card border-amber-300 bg-amber-50 text-amber-900">{data.closed}</div>
		{:else}
			<form
				method="POST"
				enctype="multipart/form-data"
				class="card space-y-4"
				use:enhance={() => {
					busy = true;
					return async ({ update }) => {
						await update({ reset: false });
						busy = false;
						window.scrollTo({ top: 0, behavior: 'smooth' });
					};
				}}
			>
				{#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
				<FormFields fields={data.form.fields} values={form?.values} errors={form?.errors} />
				<button class="btn w-full" disabled={busy}>{busy ? 'Submitting…' : 'SUBMIT APPLICATION'}</button>
			</form>
		{/if}

	{/if}
</main>
