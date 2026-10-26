<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, getCountFromServer, getDocs, query, where } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { appSearchText, closedReason, studentName } from '$lib/forms.js';
	import { loadForms, loadAllApplications, adminFetch, session } from '$lib/adminSession.svelte.js';
	import { QUIZ_SAMPLE, handoff, noteHandoff, downloadQuizTemplate, titleFromFile } from '$lib/quizImport.js';
	import { docxToNoteText } from '$lib/docxImport.js';

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

	// "Upload Word file": read a .docx here, then open the note editor with it ready to preview
	let docBusy = $state(false);
	let docError = $state('');
	async function onWordFile(e) {
		const input = e.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		docError = '';
		docBusy = true;
		try {
			noteHandoff.text = await docxToNoteText(file);
			noteHandoff.fileTitle = titleFromFile(file.name);
			await goto('/admin/notes/new');
		} catch (err) {
			docError = err.message || 'Could not read that Word document.';
		}
		docBusy = false;
	}

	let forms = $state([]);
	let loading = $state(true);
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
		{ kind: 'quiz', title: 'MCQ/Quiz forms', sub: 'Multiple choice quizzes and assessments', icon: 'list', tone: '#d99a14' },
		{ kind: 'survey', title: 'Questionnaires', sub: 'Feedback, surveys and evaluations', icon: 'flower', tone: '#e06a76' },
		{ kind: 'registration', title: 'Registration forms', sub: 'Event, membership and sign-ups', icon: 'userPlus', tone: '#12907f' }
	];
	const ICONS = {
		doc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
		docPlus: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M12 11.5v6M9 14.5h6"/>',
		users: '<circle cx="9" cy="8" r="3.2"/><path d="M3 20c0-3.3 2.7-5.5 6-5.5s6 2.2 6 5.5"/><circle cx="17.5" cy="9" r="2.4"/><path d="M17 14.6c2.4.2 4 1.9 4 4.4"/>',
		toggle: '<rect x="3" y="4" width="18" height="7" rx="3.5"/><rect x="3" y="13" width="18" height="7" rx="3.5"/><circle cx="7" cy="7.5" r="1.5" fill="currentColor"/><circle cx="17" cy="16.5" r="1.5" fill="currentColor"/>',
		cloudUp: '<path d="M7 18a4.5 4.5 0 0 1-.5-9A6 6 0 0 1 18 9.5a4 4 0 0 1-.5 8.5H16"/><path d="M12 12v8M9 15l3-3 3 3"/>',
		clipboard: '<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M8.5 11l1.5 1.5L12.5 10M8.5 16.5l1.5 1.5 2.5-2.5M14.5 11.5H16M14.5 17H16"/>',
		pencilDoc: '<path d="M13 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6"/><path d="M13 3v5h5"/><path d="M20 4.5l-6 6-2.5.6.6-2.5 6-6z"/>',
		wordDoc: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h6"/>',
		list: '<rect x="3.5" y="4" width="17" height="16" rx="2.5"/><path d="M8 9h9M8 15h9"/><circle cx="6" cy="9" r=".6" fill="currentColor"/><circle cx="6" cy="15" r=".6" fill="currentColor"/>',
		flower: '<path d="M12 21v-7"/><path d="M12 14c-3.4 0-5.5-2.3-5.5-5.5 3.2 0 5.5 2.1 5.5 5.5zM12 14c3.4 0 5.5-2.3 5.5-5.5-3.2 0-5.5 2.1-5.5 5.5z"/><path d="M12 14c-1.8-1.3-2.4-3.9-.9-7 .5-1 .9-1.7.9-2 0 .3.4 1 .9 2 1.5 3.1.9 5.7-.9 7z"/>',
		userPlus: '<circle cx="10" cy="8" r="3.5"/><path d="M3 20c0-3.5 3-6 7-6"/><path d="M18 14v6M15 17h6"/>',
		note: '<path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6M9 17h4"/>',
		search: '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
		chevron: '<path d="M9 6l6 6-6 6"/>',
		plusCircle: '<circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/>'
	};
	const kindOf = (f) => (f.kind === 'quiz' || f.kind === 'survey' ? f.kind : 'registration');
	const allIn = (k) => forms.filter((f) => kindOf(f) === k).length;

	const total = $derived(forms.reduce((n, f) => n + (f.counter || 0), 0));
	const activeCount = $derived(forms.filter((f) => !closedReason(f)).length);
	const titleOf = (id) => forms.find((f) => f.id === id)?.title ?? id;

	let notes = $state([]);
	let noteCount = $state(null);
	let trend = $state(null); // applications this month vs last month

	async function loadTrend() {
		if (session.role === 'sub') return; // sub-admins only see their own forms; skip the account-wide trend
		const now = new Date();
		const start = new Date(now.getFullYear(), now.getMonth(), 1).getTime();
		const prev = new Date(now.getFullYear(), now.getMonth() - 1, 1).getTime();
		const apps = collection(firestore, 'applications');
		try {
			const [cur, last] = await Promise.all([
				getCountFromServer(query(apps, where('submittedAt', '>=', start))),
				getCountFromServer(query(apps, where('submittedAt', '>=', prev), where('submittedAt', '<', start)))
			]);
			trend = { cur: cur.data().count, last: last.data().count };
		} catch {
			/* keep the plain sub-label */
		}
	}
	const trendText = $derived.by(() => {
		if (!trend) return 'All applications';
		if (trend.last > 0) {
			const pct = Math.round(((trend.cur - trend.last) / trend.last) * 100);
			return `${pct >= 0 ? '↑' : '↓'} ${Math.abs(pct)}% this month`;
		}
		return trend.cur > 0 ? `↑ ${trend.cur} this month` : 'None this month';
	});
	const trendDown = $derived(!!trend && trend.last > 0 && trend.cur < trend.last);

	onMount(async () => {
		adminFetch('/api/admin/notes').then((r) => { notes = r.notes; noteCount = r.notes.length; }).catch(() => {});
		loadTrend();
		forms = await loadForms();
		loading = false;
	});

	const shownNotes = $derived.by(() => {
		const q = formSearch.trim().toLowerCase();
		return q ? notes.filter((n) => (n.title || '').toLowerCase().includes(q)).slice(0, 20) : [];
	});

</script>

{#snippet ic(name)}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[name]}</svg>
{/snippet}

<div class="dash">
	<div class="dash-top">
		<h1>Dashboard</h1>
		<a href="/admin/forms/new" class="create-btn">Create new form <span class="create-ic">{@render ic('plusCircle')}</span></a>
	</div>
	{#if docError}<div class="mb-3 w-full rounded-lg bg-red-50 p-3 text-sm text-red-700">{docError}</div>{/if}

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<div class="stats">
			<div class="stat" style="--tone:#0f9a8e">
				<span class="stat-ic">{@render ic('doc')}</span>
				<div><div class="stat-label">Total forms</div><div class="stat-num">{forms.length}</div><div class="stat-sub"><i class="dot"></i>All forms</div></div>
			</div>
			<div class="stat" style="--tone:#1f9d6b">
				<span class="stat-ic">{@render ic('users')}</span>
				<div><div class="stat-label">Applications</div><div class="stat-num">{total.toLocaleString()}</div><div class="stat-sub trend" class:down={trendDown}>{trendText}</div></div>
			</div>
			<div class="stat" style="--tone:#0f9a8e">
				<span class="stat-ic">{@render ic('toggle')}</span>
				<div><div class="stat-label">Active forms</div><div class="stat-num">{activeCount}</div><div class="stat-sub"><i class="dot"></i>Live now</div></div>
			</div>
			<div class="stat" style="--tone:#7050c8">
				<span class="stat-ic">{@render ic('note')}</span>
				<div><div class="stat-label">Notes</div><div class="stat-num">{noteCount ?? '–'}</div><div class="stat-sub"><i class="dot" style="background:#7b55d0"></i>Private notes</div></div>
			</div>
		</div>

		<h2>Quick actions</h2>
		<div class="quick">
			<a href="/admin/forms/new" class="qa"><span class="qa-ic">{@render ic('docPlus')}</span>New form</a>
			<button type="button" class="qa" onclick={() => (showCsv = true)}><span class="qa-ic">{@render ic('cloudUp')}</span><b class="tag tag-csv">CSV</b>Upload CSV</button>
			<a href="/admin/forms/import-quiz" class="qa"><span class="qa-ic">{@render ic('clipboard')}</span>Paste quiz</a>
			<a href="/admin/forms/import" class="qa"><span class="qa-ic">{@render ic('doc')}</span>Paste form</a>
			<a href="/admin/notes/new" class="qa"><span class="qa-ic">{@render ic('pencilDoc')}</span>Paste notes</a>
			<label class="qa" class:busy={docBusy}>
				<span class="qa-ic word">{@render ic('wordDoc')}</span><b class="tag tag-docx">DOCX</b>{docBusy ? 'Reading…' : 'Word file'}
				<input type="file" class="sr-only" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange={onWordFile} disabled={docBusy} />
			</label>
		</div>

		<label class="search">
			<span class="search-ic">{@render ic('search')}</span>
			<input type="search" placeholder="Search forms, collections, notes..." bind:value={formSearch} />
		</label>

		{#if !formSearch.trim()}
			<h2>Collections</h2>
			<div class="cols">
				{#each FOLDERS as fo (fo.kind)}
					<a href="/admin/folder/{fo.kind}" class="col" style="--tone:{fo.tone}">
						<span class="col-ic">{@render ic(fo.icon)}</span>
						<span class="col-txt"><b>{fo.title}</b><small>{fo.sub}</small></span>
						<span class="col-badge">{allIn(fo.kind)} form{allIn(fo.kind) === 1 ? '' : 's'}</span>
						<span class="col-chev">{@render ic('chevron')}</span>
					</a>
				{/each}
				<a href="/admin/notes" class="col" style="--tone:#7b55d0">
					<span class="col-ic">{@render ic('note')}</span>
					<span class="col-txt"><b>Notes</b><small>Private notes and reference materials</small></span>
					<span class="col-badge">{noteCount === null ? '…' : `${noteCount} note${noteCount === 1 ? '' : 's'}`}</span>
					<span class="col-chev">{@render ic('chevron')}</span>
				</a>
			</div>
		{:else}
			{#if shownForms.length}
				<h2>Matching forms</h2>
				<div class="res">
					{#each shownForms.slice(0, 20) as f (f.id)}
						<a href="/admin/forms/{f.id}/applications" class="res-row"><b>{f.title || f.id}</b><small>{f.counter || 0} application{(f.counter || 0) === 1 ? '' : 's'} · {closedReason(f) ? 'Closed' : 'Live'}</small></a>
					{/each}
				</div>
			{/if}
			{#if shownNotes.length}
				<h2>Matching notes</h2>
				<div class="res">
					{#each shownNotes as n (n.id)}
						<a href="/admin/notes/{n.id}" class="res-row"><b>{n.title}</b><small>Note</small></a>
					{/each}
				</div>
			{/if}
			<h2>Matching applications</h2>
			<div class="res">
				{#if loadingApps || allApps === null}
					<p class="muted">Searching…</p>
				{:else}
					{#each matchedApps as a (a.id)}
						<a href="/admin/forms/{a.formId}/applications?q={encodeURIComponent(a.applicationNumber)}" class="res-row">
							<b>{nameOfApp(a) || '—'}</b>
							<small class="mono">{a.applicationNumber}</small>
							<small>{titleOf(a.formId)} · {new Date(a.submittedAt).toLocaleDateString()} · {a.status}</small>
						</a>
					{:else}
						<p class="muted">No applications match "{formSearch.trim()}".</p>
					{/each}
				{/if}
			</div>
		{/if}
	{/if}
</div>

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

<style>
	.dash {
		--text: #0f1b3d; --sub: #5b6785; --card: #ffffff; --line: #e8edf3; --accent: #0e8f8c; --accent-text: #ffffff;
		--shadow: 0 1px 2px rgba(15, 27, 61, .05), 0 6px 18px -8px rgba(15, 27, 61, .14);
		color: var(--text);
	}
	:global(html.dark) .dash { --text: #f1f5f9; --sub: #a5b4cc; --card: #1b2740; --line: #2c3a56; --accent: #14a39d; --shadow: 0 1px 2px rgba(0,0,0,.3), 0 6px 18px -8px rgba(0,0,0,.6); }
	:global(html.dark.forest) .dash { --text: #fbf7e8; --sub: #c9c7a6; --card: #184240; --line: #2f5c55; --accent: #f2b83a; --accent-text: #12292a; }

	.dash-top { display: flex; align-items: center; justify-content: space-between; gap: .75rem; margin-bottom: 1.1rem; }
	h1 { margin: 0; font-size: 2.15rem; font-weight: 800; letter-spacing: -.02em; line-height: 1.1; }
	h2 { margin: 1.5rem 0 .65rem; font-size: 1.2rem; font-weight: 700; }
	.create-btn { display: inline-flex; align-items: center; gap: .55rem; padding: .85rem 1.15rem; border-radius: .95rem; background: var(--accent); color: var(--accent-text); font-weight: 600; font-size: 1.08rem; white-space: nowrap; text-decoration: none; box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--accent) 70%, black); }
	.create-ic { display: inline-flex; width: 1.65rem; height: 1.65rem; }
	.create-ic :global(svg), .qa-ic :global(svg), .col-ic :global(svg), .stat-ic :global(svg), .search-ic :global(svg), .col-chev :global(svg) { width: 100%; height: 100%; }

	.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: .8rem; }
	.stat { display: flex; align-items: center; gap: .9rem; padding: .95rem; border: 1px solid var(--line); border-radius: 1.1rem; background: var(--card); box-shadow: var(--shadow); }
	.stat-ic { flex: none; display: grid; place-items: center; width: 3.7rem; height: 3.7rem; padding: .85rem; border-radius: 1rem; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, var(--card)); }
	.stat-label { font-size: 1.02rem; font-weight: 500; }
	.stat-num { font-size: 2.2rem; font-weight: 800; line-height: 1.1; }
	.stat-sub { display: flex; align-items: center; gap: .4rem; font-size: .98rem; color: var(--sub); }
	.dot { width: .55rem; height: .55rem; border-radius: 50%; background: #0f9a8e; display: inline-block; }
	.trend { color: #0f9a8e; font-weight: 500; }
	.trend.down { color: #d9534f; }

	.quick { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; }
	.qa { position: relative; display: flex; flex-direction: column; justify-content: flex-end; gap: .4rem; min-height: 4.9rem; padding: .8rem .8rem .65rem; border: 1px solid var(--line); border-radius: .95rem; background: var(--card); box-shadow: var(--shadow); color: var(--text); font-size: 1.02rem; font-weight: 500; text-align: left; text-decoration: none; cursor: pointer; }
	.qa:hover { border-color: var(--accent); }
	.qa.busy { opacity: .6; }
	.qa-ic { display: block; width: 1.75rem; height: 1.75rem; color: #0f8f86; }
	.qa-ic.word { color: #2563c9; }
	:global(html.dark.forest) .qa-ic { color: #f2b83a; }
	.tag { position: absolute; top: .55rem; right: .55rem; padding: .12rem .5rem; border-radius: .4rem; color: #fff; font-size: .72rem; font-weight: 800; letter-spacing: .02em; }
	.tag-csv { background: #3e8f3e; }
	.tag-docx { background: #2f6fd6; }

	.search { display: flex; align-items: center; gap: .7rem; margin-top: .9rem; padding: .85rem 1rem; border: 1px solid var(--line); border-radius: .95rem; background: var(--card); box-shadow: var(--shadow); }
	.search:focus-within { border-color: var(--accent); }
	.search-ic { width: 1.5rem; height: 1.5rem; color: var(--sub); flex: none; }
	.search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--text); font-size: 1.05rem; }
	.search input::placeholder { color: var(--sub); opacity: .8; }

	.cols { display: grid; gap: .65rem; }
	.col { display: flex; align-items: center; gap: .9rem; padding: .85rem 1rem; border-radius: 1rem; text-decoration: none; color: var(--text);
		background: color-mix(in srgb, var(--tone) 9%, var(--card)); border: 1px solid color-mix(in srgb, var(--tone) 28%, var(--card)); }
	.col:hover { border-color: var(--tone); }
	.col-ic { flex: none; display: grid; place-items: center; width: 3.25rem; height: 3.25rem; padding: .8rem; border-radius: 50%; color: #fff; background: var(--tone); }
	.col-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; }
	.col-txt b { font-size: 1.22rem; font-weight: 700; color: color-mix(in srgb, var(--tone) 40%, var(--text)); }
	.col-txt small { font-size: .98rem; color: color-mix(in srgb, var(--tone) 18%, var(--text)); opacity: .9; }
	.col-badge { flex: none; padding: .32rem .8rem; border-radius: 9999px; font-size: 1rem; font-weight: 600; white-space: nowrap; background: color-mix(in srgb, var(--tone) 30%, var(--card)); color: color-mix(in srgb, var(--tone) 70%, var(--text)); }
	.col-chev { flex: none; width: 1.4rem; height: 1.4rem; color: var(--sub); }

	.res { display: grid; gap: .55rem; }
	.res-row { display: flex; flex-direction: column; gap: .1rem; padding: .75rem 1rem; border: 1px solid var(--line); border-radius: .9rem; background: var(--card); color: var(--text); text-decoration: none; }
	.res-row:hover { border-color: var(--accent); }
	.res-row small { color: var(--sub); }
	.mono { font-family: ui-monospace, monospace; }
	.muted { color: var(--sub); }

	@media (min-width: 720px) {
		.stats { grid-template-columns: repeat(4, 1fr); }
		.quick { grid-template-columns: repeat(6, 1fr); }
		.cols { grid-template-columns: repeat(2, 1fr); }
		h1 { font-size: 2.4rem; }
	}
	@media (max-width: 380px) {
		h1 { font-size: 1.8rem; }
		.create-btn { padding: .75rem .9rem; font-size: .98rem; }
		.stat-num { font-size: 1.9rem; }
		.stat-ic { width: 3rem; height: 3rem; padding: .7rem; }
	}
</style>
