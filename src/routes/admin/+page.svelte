<script>
	import { onMount } from 'svelte';
	import { collection, deleteDoc, doc, getDocs, limit, orderBy, query, where, writeBatch } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { closedReason } from '$lib/forms.js';

	let forms = $state([]);
	let recent = $state([]);
	let loading = $state(true);
	let copiedId = $state('');
	let formSearch = $state('');
	const shownForms = $derived.by(() => {
		const q = formSearch.trim().toLowerCase();
		return q ? forms.filter((f) => (f.title || '').toLowerCase().includes(q) || String(f.id).toLowerCase().includes(q)) : forms;
	});

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
	async function removeForm(f) {
		const n = f.counter || 0;
		const msg = n
			? `Delete "${f.title}" and its ${n} application(s)? This cannot be undone.`
			: `Delete "${f.title}"? This cannot be undone.`;
		if (!confirm(msg)) return;
		try {
			const snap = await getDocs(query(collection(firestore, 'applications'), where('formId', '==', f.id)));
			for (let i = 0; i < snap.docs.length; i += 400) {
				const batch = writeBatch(firestore);
				snap.docs.slice(i, i + 400).forEach((d) => batch.delete(d.ref));
				await batch.commit();
			}
			await deleteDoc(doc(firestore, 'forms', f.id));
			forms = forms.filter((x) => x.id !== f.id);
			recent = recent.filter((a) => a.formId !== f.id);
		} catch (e) {
			alert('Could not delete form: ' + (e?.message || e));
		}
	}
	const label = (f) => closedReason(f) ? (f.status === 'active' ? 'Closed' : f.status === 'draft' ? 'Draft' : 'Closed') : 'Active';
</script>

<div class="mb-6 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Dashboard</h1>
	<div class="flex gap-2"><a href="/admin/forms/import" class="btn-ghost">Paste to create</a><a href="/admin/forms/new" class="btn">+ Create new form</a></div>
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
	<input class="input mb-3" type="search" placeholder="Search forms…" bind:value={formSearch} />
	<div class="mb-8 space-y-3">
		{#each shownForms as f (f.id)}
			<div class="card flex flex-wrap items-center justify-between gap-3">
				<div class="flex w-full items-start justify-between gap-2">
					<div class="min-w-0">
					<div class="font-semibold">{f.title}</div>
					<div class="text-sm text-slate-500">
						{(f.counter || 0).toLocaleString()} applications ·
						<span class={label(f) === 'Active' ? 'text-green-700' : 'text-slate-500'}>{label(f)}</span>
					</div>
					</div>
					<button
						type="button"
						class="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
						aria-label="Delete form {f.title}"
						title="Delete form"
						onclick={() => removeForm(f)}
					>
						<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18M8 6V4a1 1 0 0 1 1-1h6a1 1 0 0 1 1 1v2m2 0-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6m5 5v6m4-6v6" /></svg>
					</button>
				</div>
				<div class="flex flex-wrap gap-2">
					<a class="btn-ghost" href="/admin/forms/{f.id}">Manage</a>
					<a class="btn-ghost" href="/admin/forms/{f.id}/applications">View applications</a>
					<button class="btn-ghost" onclick={() => copyLink(f.id)}>{copiedId === f.id ? 'Copied ✓' : 'Copy link'}</button>
				</div>
			</div>
		{:else}
			<p class="text-slate-500">{formSearch.trim() ? 'No forms match your search.' : 'No forms yet. Create your first one.'}</p>
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
