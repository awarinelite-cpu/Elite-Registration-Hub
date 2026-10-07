<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, deleteDoc, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { appSearchText, closedReason, studentName } from '$lib/forms.js';
	import { loadForms, loadAllApplications } from '$lib/adminSession.svelte.js';

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
			loadAllApplications(forms)
				.then((list) => (allApps = list))
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

	// one folder per form type, chosen when the form was created
	const FOLDERS = [
		{ kind: 'quiz', title: 'MCQ / Quiz forms', icon: '📝' },
		{ kind: 'survey', title: 'Questionnaires / Surveys', icon: '📋' },
		{ kind: 'registration', title: 'Registration forms', icon: '🗂️' }
	];
	const kindOf = (f) => (f.kind === 'quiz' || f.kind === 'survey' ? f.kind : 'registration');
	const inFolder = (k) => shownForms.filter((f) => kindOf(f) === k);
	const allIn = (k) => forms.filter((f) => kindOf(f) === k).length;
	let openFolders = $state({ quiz: true, survey: true, registration: true });

	const total = $derived(forms.reduce((n, f) => n + (f.counter || 0), 0));
	const activeCount = $derived(forms.filter((f) => !closedReason(f)).length);
	const titleOf = (id) => forms.find((f) => f.id === id)?.title ?? id;

	onMount(async () => {
		forms = await loadForms();
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
	<div class="flex gap-2"><a href="/admin/forms/import" class="btn-3d-ghost">Paste to create</a><a href="/admin/forms/import-quiz" class="btn-3d-ghost">Paste quiz</a><a href="/admin/forms/new" class="btn-3d">+ Create new form</a></div>
</div>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="mb-8 grid gap-3 sm:grid-cols-3">
		<div class="card"><div class="text-sm text-slate-500">Total forms</div><div class="text-3xl font-bold">{forms.length}</div></div>
		<div class="card"><div class="text-sm text-slate-500">Applications</div><div class="text-3xl font-bold">{total.toLocaleString()}</div></div>
		<div class="card"><div class="text-sm text-slate-500">Active forms</div><div class="text-3xl font-bold">{activeCount}</div></div>
	</div>

	<input class="input mb-4" type="search" placeholder="Search student name or application number…" bind:value={formSearch} />
	{#if !formSearch.trim()}
		<div class="mb-8 space-y-3">
			{#each FOLDERS as fo (fo.kind)}
				<a href="/admin/folder/{fo.kind}" class="card flex items-center justify-between gap-3">
					<div>
						<div class="text-lg font-semibold">{fo.icon} {fo.title}</div>
						<div class="text-sm text-slate-500">{allIn(fo.kind)} form{allIn(fo.kind) === 1 ? '' : 's'}</div>
					</div>
					<span class="text-2xl text-slate-400">›</span>
				</a>
			{/each}
		</div>
	{/if}

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
