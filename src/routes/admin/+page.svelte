<script>
	import { onMount } from 'svelte';
	import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { closedReason } from '$lib/forms.js';

	let forms = $state([]);
	let recent = $state([]);
	let loading = $state(true);
	let copiedId = $state('');

	const total = $derived(forms.reduce((n, f) => n + (f.counter || 0), 0));
	const activeCount = $derived(forms.filter((f) => !closedReason(f)).length);
	const titleOf = (id) => forms.find((f) => f.id === id)?.title ?? id;

	onMount(async () => {
		const [fs, rs] = await Promise.all([
			getDocs(collection(firestore, 'forms')),
			getDocs(query(collection(firestore, 'applications'), orderBy('submittedAt', 'desc'), limit(8)))
		]);
		forms = fs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
		recent = rs.docs.map((d) => ({ id: d.id, ...d.data() }));
		loading = false;
	});

	async function copyLink(id) {
		await navigator.clipboard.writeText(`${location.origin}/register/${id}`);
		copiedId = id;
		setTimeout(() => (copiedId = ''), 1500);
	}
	const label = (f) => closedReason(f) ? (f.status === 'active' ? 'Closed' : f.status === 'draft' ? 'Draft' : 'Closed') : 'Active';
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Dashboard</h1>
	<a href="/admin/forms/new" class="btn">+ Create new form</a>
</div>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="mb-8 grid gap-3 sm:grid-cols-3">
		<div class="card"><div class="text-sm text-slate-500">Total forms</div><div class="text-3xl font-bold">{forms.length}</div></div>
		<div class="card"><div class="text-sm text-slate-500">Applications</div><div class="text-3xl font-bold">{total.toLocaleString()}</div></div>
		<div class="card"><div class="text-sm text-slate-500">Active forms</div><div class="text-3xl font-bold">{activeCount}</div></div>
	</div>

	<h2 class="mb-3 text-lg font-semibold">Registration forms</h2>
	<div class="mb-8 space-y-3">
		{#each forms as f (f.id)}
			<div class="card flex flex-wrap items-center justify-between gap-3">
				<div>
					<div class="font-semibold">{f.title}</div>
					<div class="text-sm text-slate-500">
						{(f.counter || 0).toLocaleString()} applications ·
						<span class={label(f) === 'Active' ? 'text-green-700' : 'text-slate-500'}>{label(f)}</span>
					</div>
				</div>
				<div class="flex flex-wrap gap-2">
					<a class="btn-ghost" href="/admin/forms/{f.id}">Manage</a>
					<a class="btn-ghost" href="/admin/forms/{f.id}/applications">View applications</a>
					<button class="btn-ghost" onclick={() => copyLink(f.id)}>{copiedId === f.id ? 'Copied ✓' : 'Copy link'}</button>
				</div>
			</div>
		{:else}
			<p class="text-slate-500">No forms yet. Create your first one.</p>
		{/each}
	</div>

	<h2 class="mb-3 text-lg font-semibold">Recent applications</h2>
	<div class="card overflow-x-auto !p-0">
		<table class="w-full text-left text-sm">
			<thead class="bg-slate-50 text-xs uppercase text-slate-500">
				<tr><th class="px-4 py-2">Application No.</th><th class="px-4 py-2">Form</th><th class="px-4 py-2">Date</th><th class="px-4 py-2">Status</th></tr>
			</thead>
			<tbody>
				{#each recent as a (a.id)}
					<tr class="border-t border-slate-100">
						<td class="px-4 py-2 font-mono">{a.applicationNumber}</td>
						<td class="px-4 py-2">{titleOf(a.formId)}</td>
						<td class="px-4 py-2">{new Date(a.submittedAt).toLocaleDateString()}</td>
						<td class="px-4 py-2">{a.status}</td>
					</tr>
				{:else}
					<tr><td colspan="4" class="px-4 py-4 text-slate-500">No applications yet.</td></tr>
				{/each}
			</tbody>
		</table>
	</div>
{/if}
