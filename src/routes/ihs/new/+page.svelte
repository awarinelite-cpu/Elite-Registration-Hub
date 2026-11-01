<script>
	import { goto } from '$app/navigation';
	import { addDoc, collection } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { ihs } from '$lib/ihsSession.svelte.js';
	import { REPORT_TITLE } from '$lib/ihs.js';
	import IhsReportForm from '$lib/IhsReportForm.svelte';

	async function save(data) {
		const now = Date.now();
		const ref = await addDoc(collection(firestore, 'ihsReports'), { ...data, ownerId: ihs.uid, createdAt: now, updatedAt: now });
		await goto(`/ihs/${ref.id}`);
	}
</script>

<svelte:head><title>New report — IHS DMO</title></svelte:head>

<div class="mb-3">
	<a href="/ihs" class="text-sm font-semibold text-teal-800 underline">← All reports</a>
	<h1 class="mt-1 text-xl font-extrabold">{REPORT_TITLE}</h1>
	<p class="text-sm text-slate-600">Fill in the sheet and save. You can then copy each value across to the IHS site.</p>
</div>
<IhsReportForm onsave={save} />
