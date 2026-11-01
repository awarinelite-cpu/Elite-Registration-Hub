<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { doc, getDoc, updateDoc } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { ihs } from '$lib/ihsSession.svelte.js';
	import { REPORT_TITLE } from '$lib/ihs.js';
	import IhsReportForm from '$lib/IhsReportForm.svelte';

	const id = page.params.id;
	let status = $state('loading'); // loading | ok | missing
	let report = $state(null);

	onMount(async () => {
		try {
			const snap = await getDoc(doc(firestore, 'ihsReports', id));
			if (snap.exists() && snap.data().ownerId === ihs.uid) {
				report = snap.data();
				status = 'ok';
			} else status = 'missing';
		} catch {
			status = 'missing';
		}
	});

	async function save(data) {
		await updateDoc(doc(firestore, 'ihsReports', id), { ...data, updatedAt: Date.now() });
		await goto(`/ihs/${id}`);
	}
</script>

<svelte:head><title>Edit report — IHS DMO</title></svelte:head>

<div class="mb-3">
	<a href="/ihs/{id}" class="text-sm font-semibold text-teal-800 underline">← Back to report</a>
	<h1 class="mt-1 text-xl font-extrabold">Edit — {REPORT_TITLE}</h1>
</div>
{#if status === 'loading'}
	<div class="py-10 text-center text-slate-500">Loading…</div>
{:else if status === 'missing'}
	<div class="card text-center text-slate-600">Report not found.</div>
{:else}
	<IhsReportForm initial={report} onsave={save} submitLabel="Save changes" />
{/if}
