<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { enhance } from '$app/forms';
	import { doc, getDoc } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { closedReason, migrateScratchFields } from '$lib/forms.js';
	import FormFields from '$lib/FormFields.svelte';
	import BulkFill from '$lib/BulkFill.svelte';

	const formId = page.params.id;
	let form = $state(null);
	let loading = $state(true);
	let loadError = $state('');
	let busy = $state(false);
	let fail = $state(null); // { message, errors, values }
	let done = $state(null); // { applicationNumber, pin, title }
	let round = $state(0);
	let copied = $state(false);

	onMount(async () => {
		try {
			const s = await getDoc(doc(firestore, 'forms', formId));
			if (!s.exists()) loadError = 'Form not found.';
			else {
				const d = s.data();
				form = { id: s.id, ...d, fields: migrateScratchFields(d.fields) };
			}
		} catch (e) {
			loadError = 'Could not load form: ' + (e?.message || e);
		}
		loading = false;
	});

	const closed = $derived(form ? closedReason(form) : null);

	async function copy(text) {
		await navigator.clipboard?.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
	function another() {
		done = null;
		fail = null;
		round += 1;
		window.scrollTo({ top: 0 });
	}
</script>

<a href="/admin" class="mb-3 inline-block text-sm text-teal-700 hover:underline">← Dashboard</a>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else if loadError}
	<div class="card text-red-700">{loadError}</div>
{:else if done}
	<div class="card mx-auto max-w-2xl text-center">
		<div class="mb-2 text-4xl">✅</div>
		<h1 class="text-xl font-bold">Application submitted</h1>
		<p class="mt-1 text-sm text-slate-600">{done.title}</p>
		<div class="mt-5 grid gap-3 text-left sm:grid-cols-2">
			<div class="rounded-lg bg-slate-100 p-3"><div class="text-xs text-slate-500">Application Number</div><div class="font-mono text-lg font-bold">{done.applicationNumber}</div></div>
			<div class="rounded-lg bg-slate-100 p-3"><div class="text-xs text-slate-500">Access PIN</div><div class="font-mono text-lg font-bold">{done.pin}</div></div>
		</div>
		<p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">Give the student both now — the PIN is shown only once and cannot be recovered.</p>
		<div class="mt-4 flex flex-wrap justify-center gap-2">
			<button class="btn-ghost" onclick={() => copy(`Application Number: ${done.applicationNumber}\nAccess PIN: ${done.pin}`)}>{copied ? 'Copied ✓' : 'Copy details'}</button>
			<button class="btn" onclick={another}>Fill another student</button>
		</div>
	</div>
{:else}
	<main class="mx-auto max-w-2xl">
		<header class="mb-5">
			<h1 class="text-2xl font-bold">{form.title}</h1>
			<p class="text-sm text-slate-500">Admin entry — fill a student's application</p>
		</header>

		{#if closed}
			<div class="card border-amber-300 bg-amber-50 text-amber-900">{closed}</div>
		{:else}
			{#key round}
				<BulkFill fields={form.fields} />
				<form
					method="POST"
					action="/register/{form.id}"
					enctype="multipart/form-data"
					class="card space-y-4"
					use:enhance={() => {
						busy = true;
						fail = null;
						return async ({ result }) => {
							busy = false;
							if (result.type === 'success') done = result.data;
							else if (result.type === 'failure') {
								fail = result.data;
								window.scrollTo({ top: 0, behavior: 'smooth' });
							} else fail = { message: 'Something went wrong. Please try again.' };
						};
					}}
				>
					{#if fail?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{fail.message}</div>{/if}
					<FormFields fields={form.fields} errors={fail?.errors} />
					<button class="btn w-full" disabled={busy}>{busy ? 'Submitting…' : 'SUBMIT APPLICATION'}</button>
				</form>
			{/key}
		{/if}
	</main>
{/if}
