<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, deleteDoc, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { appSearchText, closedReason, studentName } from '$lib/forms.js';

	let forms = $state([]);
	let loading = $state(true);
	let copiedId = $state('');
	let formSearch = $state('');
	let allApps = $state(null);
	let loadingApps = $state(false);
	const formOf = (id) => forms.find((f) => f.id === id);
	const nameOfApp = (a) => studentName(formOf(a.formId), a);

	$effect(() => {
		if (formSearch.trim() && allApps === null && !loadingApps) {
			loadingApps = true;
			getDocs(query(collection(firestore, 'applications'), orderBy('submittedAt', 'desc')))
				.then((snap) => (allApps = snap.docs.map((d) => ({ id: d.id, ...d.data() }))))
				.catch(() => (allApps = []))
				.finally(() => (loadingApps = false));
		}
	});

	const matchedApps = $derived.by(() => {
		const q = formSearch.trim().toLowerCase();
		if (!q || !allApps) return [];
		return allApps.filter((a) => appSearchText(formOf(a.formId), a).includes(q)).slice(0, 30);
	});

	const shownForms = $derived.by(() => {
		const q = formSearch.trim().toLowerCase();
		return q ? forms.filter((f) => (f.title || '').toLowerCase().includes(q) || String(f.id).toLowerCase().includes(q)) : forms;
	});

	const total = $derived(forms.reduce((n, f) => n + (f.counter || 0), 0));
	const activeCount = $derived(forms.filter((f) => !closedReason(f)).length);
	const titleOf = (id) => forms.find((f) => f.id === id)?.title ?? id;

	onMount(async () => {
		const fs = await getDocs(collection(firestore, 'forms'));
		forms = fs.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => (b.createdAt || 0) - (a.createdAt || 0));
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
		} catch (e) {
			alert('Could not delete form: ' + (e?.message || e));
		}
	}
	// tapping anywhere on a form card (except its own buttons/links) opens that form's applications
	const openApps = (e, f) => {
		if (e.target.closest('a,button')) return;
		goto(`/admin/forms/${f.id}/applications`);
	};
	const label = (f) => closedReason(f) ? (f.status === 'active' ? 'Closed' : f.status === 'draft' ? 'Draft' : 'Closed') : 'Active';
</script>

<div class="mb-6 flex flex-wrap items-center justify-between gap-3">
	<h1 class="text-2xl font-bold">Dashboard</h1>
	<div class="flex gap-2"><a href="/admin/forms/import" class="btn-3d-ghost">Paste to create</a><a href="/admin/forms/new" class="btn-3d">+ Create new form</a></div>
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
	<input class="input mb-3" type="search" placeholder="Search forms or student name…" bind:value={formSearch} />
	<div class="mb-8 space-y-3">
		{#each shownForms as f (f.id)}
			<div
				class="card flex cursor-pointer flex-wrap items-center justify-between gap-3"
				role="link"
				tabindex="0"
				onclick={(e) => openApps(e, f)}
				onkeydown={(e) => e.key === 'Enter' && openApps(e, f)}
			>
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
					<a class="btn" href="/admin/forms/{f.id}/fill">Fill form</a>
					<a class="btn-ghost" href="/admin/forms/{f.id}">Manage</a>
					<a class="btn-ghost" href="/admin/forms/{f.id}/applications">View applications</a>
					<button class="btn-ghost" onclick={() => copyLink(f.id)}>{copiedId === f.id ? 'Copied ✓' : 'Copy link'}</button>
				</div>
			</div>
		{:else}
			{#if !formSearch.trim()}<p class="text-slate-500">No forms yet. Create your first one.</p>{/if}
		{/each}
	</div>

	{#if formSearch.trim()}
		<h2 class="mb-3 text-lg font-semibold">Matching applications</h2>
		<div class="mb-8 space-y-3">
			{#if loadingApps || allApps === null}
				<p class="text-slate-500">Searching…</p>
			{:else}
				{#each matchedApps as a (a.id)}
					<a href="/admin/forms/{a.formId}/applications?q={encodeURIComponent(a.applicationNumber)}" class="card block !py-3">
						<div class="font-semibold">{nameOfApp(a) || '—'}</div>
						<div class="font-mono text-xs text-slate-500">{a.applicationNumber}</div>
						<div class="text-sm text-slate-500">{titleOf(a.formId)} · {new Date(a.submittedAt).toLocaleDateString()} · {a.status}</div>
					</a>
				{:else}
					<p class="text-slate-500">No applications match "{formSearch.trim()}".</p>
				{/each}
			{/if}
		</div>
	{/if}
{/if}
