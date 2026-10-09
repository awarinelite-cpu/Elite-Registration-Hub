<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, deleteDoc, doc, getDocs, orderBy, query, where, writeBatch } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { appSearchText, closedReason, studentName } from '$lib/forms.js';
	import { loadForms, loadAllApplications, adminFetch } from '$lib/adminSession.svelte.js';
	import { QUIZ_SAMPLE, handoff, downloadQuizTemplate, titleFromFile } from '$lib/quizImport.js';

	// "Upload CSV file" pop-up: pick a quiz CSV (or the example), then continue to the quiz preview
	let showCsv = $state(false);
	let csvFile = $state(null);
	let csvBusy = $state(false);
	const closeCsv = () => { showCsv = false; csvFile = null; };
	async function previewCsv() {
		if (!csvFile) return;
		csvBusy = true;
		handoff.text = await csvFile.text();
		handoff.fileTitle = titleFromFile(csvFile.name);
		csvBusy = false;
		goto('/admin/forms/import-quiz');
	}
	function useExample() {
		handoff.text = 'Sample Quiz\n\n' + QUIZ_SAMPLE;
		handoff.fileTitle = '';
		goto('/admin/forms/import-quiz');
	}

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
		{ kind: 'quiz', title: 'MCQ / Quiz forms', icon: '📝', tone: 'amber' },
		{ kind: 'survey', title: 'Questionnaires / Surveys', icon: '📋', tone: 'rose' },
		{ kind: 'registration', title: 'Registration forms', icon: '🗂️', tone: 'teal' }
	];
	const kindOf = (f) => (f.kind === 'quiz' || f.kind === 'survey' ? f.kind : 'registration');
	const inFolder = (k) => shownForms.filter((f) => kindOf(f) === k);
	const allIn = (k) => forms.filter((f) => kindOf(f) === k).length;
	let openFolders = $state({ quiz: true, survey: true, registration: true });

	const total = $derived(forms.reduce((n, f) => n + (f.counter || 0), 0));
	const activeCount = $derived(forms.filter((f) => !closedReason(f)).length);
	const titleOf = (id) => forms.find((f) => f.id === id)?.title ?? id;

	let noteCount = $state(null);
	onMount(async () => {
		adminFetch('/api/admin/notes').then((r) => (noteCount = r.notes.length)).catch(() => {});
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
	<div class="flex flex-wrap gap-2"><button type="button" class="btn-3d-ghost" onclick={() => (showCsv = true)}>Upload CSV file</button><a href="/admin/forms/import" class="btn-3d-ghost">Paste to create</a><a href="/admin/forms/import-quiz" class="btn-3d-ghost">Paste quiz</a><a href="/admin/notes/new" class="btn-3d-ghost">Paste notes</a><a href="/admin/forms/new" class="btn-3d">+ Create new form</a></div>
</div>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="mb-8 grid gap-3 sm:grid-cols-3">
		<div class="card card-pill flex items-center justify-between"><div class="text-base font-medium text-slate-500">Total forms</div><div class="text-3xl font-bold">{forms.length}</div></div>
		<div class="card card-pill flex items-center justify-between"><div class="text-base font-medium text-slate-500">Applications</div><div class="text-3xl font-bold">{total.toLocaleString()}</div></div>
		<div class="card card-pill flex items-center justify-between"><div class="text-base font-medium text-slate-500">Active forms</div><div class="text-3xl font-bold">{activeCount}</div></div>
	</div>

	<input class="input mb-4" type="search" placeholder="Search student name or application number…" bind:value={formSearch} />
	{#if !formSearch.trim()}
		<div class="mb-8 space-y-3">
			{#each FOLDERS as fo (fo.kind)}
				<a href="/admin/folder/{fo.kind}" class="card card-pill flex items-center justify-between gap-3">
					<div>
						<div class="text-lg font-semibold">{fo.icon} {fo.title}</div>
						<div class="text-sm text-slate-500">{allIn(fo.kind)} form{allIn(fo.kind) === 1 ? '' : 's'}</div>
					</div>
					<span class="text-2xl text-slate-400">›</span>
				</a>
			{/each}
			<a href="/admin/notes" class="card card-pill flex items-center justify-between gap-3">
				<div>
					<div class="text-lg font-semibold">📓 Notes</div>
					<div class="text-sm text-slate-500">{noteCount === null ? 'Notebook' : `${noteCount} note${noteCount === 1 ? '' : 's'}`}</div>
				</div>
				<span class="text-2xl text-slate-400">›</span>
			</a>
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

<svelte:window onkeydown={(e) => { if (showCsv && e.key === 'Escape') closeCsv(); }} />

{#if showCsv}
	<!-- svelte-ignore a11y_click_events_have_key_events, a11y_no_static_element_interactions -->
	<div class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onclick={(e) => { if (e.target === e.currentTarget) closeCsv(); }}>
		<div class="card max-h-[90vh] w-full max-w-md space-y-3 overflow-y-auto" role="dialog" aria-modal="true" aria-label="Upload CSV file">
			<div class="flex items-start justify-between gap-2">
				<h2 class="text-lg font-bold">Upload CSV file</h2>
				<button type="button" class="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700" aria-label="Close" onclick={closeCsv}>✕</button>
			</div>
			<div class="rounded-lg border border-dashed border-teal-300 bg-teal-50/60 p-3">
				<label class="label" for="dashcsv">Upload a CSV file</label>
				<input class="input file:mr-3 file:rounded file:border-0 file:bg-teal-100 file:px-3 file:py-1 file:text-teal-800" id="dashcsv" type="file" accept=".csv,.txt,text/csv" onchange={(e) => (csvFile = e.currentTarget.files?.[0] ?? null)} />
				<p class="mt-1 text-xs text-slate-600">Columns: <code>question, option_a, option_b, option_c, option_d, answer</code> (letter such as B, or A,C for several), plus optional <code>explanation, topic, marks, image</code> (image = Imgur/ImgChest link). Extra columns like year are ignored.</p>
				<button type="button" class="btn-ghost mt-2 !px-3 !py-1 text-sm" onclick={downloadQuizTemplate}>⬇ Download CSV template</button>
			</div>
			<div class="flex flex-wrap gap-2">
				<button type="button" class="btn" onclick={previewCsv} disabled={!csvFile || csvBusy}>{csvBusy ? 'Reading…' : 'Preview quiz'}</button>
				<button type="button" class="btn-ghost" onclick={useExample}>Use example</button>
			</div>
		</div>
	</div>
{/if}
