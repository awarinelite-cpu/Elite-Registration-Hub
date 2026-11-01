<script>
	import { onMount } from 'svelte';
	import { collection, getDocs, query, where } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { ihs } from '$lib/ihsSession.svelte.js';
	import { REPORT_TITLE, REPORT_FIELDS, showValue } from '$lib/ihs.js';

	const dateField = REPORT_FIELDS[0];
	let reports = $state([]);
	let status = $state('loading'); // loading | ok | error

	onMount(async () => {
		try {
			// only this user's reports (the security rules enforce the same); newest report date first
			const snap = await getDocs(query(collection(firestore, 'ihsReports'), where('ownerId', '==', ihs.uid)));
			reports = snap.docs
				.map((d) => ({ id: d.id, ...d.data() }))
				.sort((a, b) => String(b.date || '').localeCompare(String(a.date || '')) || (b.createdAt || 0) - (a.createdAt || 0));
			status = 'ok';
		} catch {
			status = 'error';
		}
	});
</script>

<div class="mb-4 flex items-start justify-between gap-3">
	<div>
		<p class="text-sm text-slate-600">Welcome{ihs.name ? `, ${ihs.name}` : ''}</p>
		<h1 class="text-xl font-extrabold">{REPORT_TITLE}</h1>
	</div>
	<a class="btn shrink-0" href="/ihs/new">+ New report</a>
</div>

{#if status === 'loading'}
	<div class="py-10 text-center text-slate-500">Loading…</div>
{:else if status === 'error'}
	<div class="card text-center text-slate-600">Could not load your reports. Check your connection and refresh.</div>
{:else if !reports.length}
	<div class="card space-y-3 text-center">
		<p class="text-slate-600">You have not saved any report yet.</p>
		<a class="btn" href="/ihs/new">Fill your first report sheet</a>
	</div>
{:else}
	<ul class="space-y-3">
		{#each reports as r (r.id)}
			<li>
				<a href="/ihs/{r.id}" class="card block !p-4 no-underline">
					<div class="flex items-center justify-between gap-3">
						<div class="min-w-0">
							<div class="font-bold">{showValue(dateField, r.date)} · Truck {r.truckNo || '—'}</div>
							<div class="mt-0.5 truncate text-sm text-slate-600">
								Site {r.siteId || '—'} · Supplied {r.volumeSupplied || '—'}{r.vendor ? ` · ${r.vendor}` : ''}
							</div>
						</div>
						<span class="text-xl text-slate-400" aria-hidden="true">›</span>
					</div>
				</a>
			</li>
		{/each}
	</ul>
{/if}
