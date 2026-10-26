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
		<div class="hero">
			<span class="hero-ic">{@render ic('users')}</span>
			<div class="hero-txt">
				<div class="hero-label">Applications</div>
				<div class="hero-num">{total.toLocaleString()}</div>
				<div class="hero-sub" class:down={trendDown}>{trendText}</div>
			</div>
			<svg class="hero-spark" viewBox="0 0 120 60" fill="none" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 52 L30 38 L50 44 L78 22 L96 28 L116 8" stroke="#5eead4" stroke-width="3.2" /><path d="M104 8 H116 V20" stroke="#5eead4" stroke-width="3.2" /></svg>
		</div>

		<div class="stats3">
			<div class="stat3" style="--tone:#0f9a8e"><span class="stat-ic">{@render ic('doc')}</span><div class="stat3-label">Total forms</div><div class="stat3-num">{forms.length}</div><div class="stat3-sub">All forms</div></div>
			<div class="stat3" style="--tone:#1f9d6b"><span class="stat-ic">{@render ic('toggle')}</span><div class="stat3-label">Active forms</div><div class="stat3-num">{activeCount}</div><div class="stat3-sub">Live now</div></div>
			<div class="stat3" style="--tone:#7050c8"><span class="stat-ic">{@render ic('note')}</span><div class="stat3-label">Notes</div><div class="stat3-num">{noteCount ?? '–'}</div><div class="stat3-sub">Private notes</div></div>
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

	.stat-ic { flex: none; display: grid; place-items: center; width: 3.7rem; height: 3.7rem; padding: .85rem; border-radius: 1rem; color: var(--tone); background: color-mix(in srgb, var(--tone) 14%, var(--card)); }
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

	/* ===== glass-bubble finish (same recipe as the app-wide theme: clear rim + solid centre + gloss) ===== */
	.dash { --fa: #ffffff; --fb: #e3eaf3; --glow: rgba(255,255,255,.55); --glow-b: rgba(0,0,0,.14); --gloss-a: rgba(255,255,255,.6); --gloss-b: rgba(255,255,255,.06); }
	:global(html.dark) .dash { --fa: #34465f; --fb: #243349; --glow: rgba(255,255,255,.2); --glow-b: rgba(0,0,0,.4); --gloss-a: rgba(255,255,255,.22); --gloss-b: rgba(255,255,255,.03); }
	:global(html.dark.forest) .dash { --fa: #1f4846; --fb: #143230; }

	.stat, .qa, .search, .col, .res-row, .create-btn {
		position: relative; overflow: hidden;
		border: 4px solid transparent;
		background: linear-gradient(to bottom, var(--fa), var(--fb)) padding-box, var(--rim) border-box;
		box-shadow: inset 0 0 7px 1px var(--glow), inset 0 -3px 5px var(--glow-b), var(--ring), var(--glass-drop);
		transition: transform .15s ease, box-shadow .15s ease, filter .15s ease;
	}
	.stat, .col { border-radius: 1.5rem; }
	.qa, .search, .res-row { border-radius: 1.25rem; }
	.create-btn { border-radius: 1.1rem; --fa: #14b8a6; --fb: #0f766e; color: #fff; text-shadow: 0 1px 1px rgba(4,47,46,.55); font-weight: 700; }
	:global(html.dark.forest) .create-btn { --fa: #f7c852; --fb: #dfa01c; color: #12292a; text-shadow: 0 1px 0 rgba(255,255,255,.35); }

	/* clear-coat gloss across the top of each bubble */
	.stat::before, .qa::before, .search::before, .col::before, .res-row::before, .create-btn::before {
		content: ''; position: absolute; pointer-events: none; z-index: 0;
		top: 2px; left: 3px; right: 3px; height: 42%;
		border-radius: 1.1rem 1.1rem 55% 55% / 1.1rem 1.1rem 1rem 1rem;
		background: linear-gradient(to bottom, var(--gloss-a), var(--gloss-b));
	}
	.stat::before, .col::before { height: 34%; }
	.stat > *, .qa > :not(.tag), .search > *, .col > *, .res-row > *, .create-btn > * { position: relative; z-index: 1; }
	.tag { z-index: 1; }

	/* coloured centres for the collection rows, with a rim tinted to match */
	.col {
		--fa: color-mix(in srgb, var(--tone) 10%, white); --fb: color-mix(in srgb, var(--tone) 30%, white);
		--rim: linear-gradient(145deg, #ffffff 0%, color-mix(in srgb, var(--tone) 45%, white) 30%, var(--tone) 66%, color-mix(in srgb, var(--tone) 35%, white) 100%);
		border-color: transparent;
	}
	:global(html.dark) .col { --fa: color-mix(in srgb, var(--tone) 38%, #243349); --fb: color-mix(in srgb, var(--tone) 22%, #1b2740); }

	/* icon tiles: small glass bubbles too */
	.stat-ic, .col-ic {
		position: relative; overflow: hidden;
		box-shadow: inset 0 0 6px 1px rgba(255,255,255,.5), inset 0 -3px 4px rgba(0,0,0,.18), 0 5px 8px -4px rgba(15,27,61,.45);
	}
	.stat-ic { background: linear-gradient(to bottom, color-mix(in srgb, var(--tone) 22%, white), color-mix(in srgb, var(--tone) 42%, white)); border: 2px solid color-mix(in srgb, var(--tone) 55%, white); }
	:global(html.dark) .stat-ic { background: linear-gradient(to bottom, color-mix(in srgb, var(--tone) 55%, #243349), color-mix(in srgb, var(--tone) 30%, #1b2740)); color: #fff; }
	.col-ic { background: linear-gradient(to bottom, color-mix(in srgb, var(--tone) 70%, white), var(--tone)); border: 2px solid color-mix(in srgb, var(--tone) 45%, white); }
	.stat-ic::before, .col-ic::before { content: ''; position: absolute; inset: 2px 3px auto 3px; height: 42%; border-radius: 9999px; background: linear-gradient(to bottom, rgba(255,255,255,.65), rgba(255,255,255,.05)); pointer-events: none; }
	.stat-ic :global(svg), .col-ic :global(svg) { position: relative; z-index: 1; }

	@media (hover: hover) {
		.stat:hover, .qa:hover, .col:hover, .res-row:hover, .search:focus-within { transform: translateY(-3px); }
		.create-btn:hover { filter: brightness(1.08); transform: translateY(-1px); }
	}
	.qa:active, .create-btn:active { transform: translateY(1px) scale(.98); }
	.qa:hover, .col:hover, .res-row:hover { border-color: transparent; }
	@media (prefers-reduced-motion: reduce) { .stat, .qa, .search, .col, .res-row, .create-btn { transition: none; } }

	/* ===== layout from the NurseShift-style home screen ===== */
	.hero { position: relative; overflow: hidden; display: flex; align-items: center; gap: 1rem; padding: 1.15rem 1.2rem; border-radius: 1.4rem; color: #fff;
		background: radial-gradient(circle at 90% 0%, rgba(94,234,212,.28), transparent 50%), linear-gradient(145deg, #0b4f4a 0%, #063633 60%, #052b29 100%);
		border: 3px solid transparent; background-clip: padding-box, border-box;
		box-shadow: inset 0 0 0 1px rgba(255,255,255,.28), inset 0 0 12px rgba(94,234,212,.22), var(--glass-drop); }
	.hero::before { content: ''; position: absolute; pointer-events: none; top: 2px; left: 3px; right: 3px; height: 38%; border-radius: 1.2rem 1.2rem 55% 55% / 1.2rem 1.2rem 1rem 1rem; background: linear-gradient(to bottom, rgba(255,255,255,.2), rgba(255,255,255,.02)); }
	.hero > * { position: relative; }
	.hero-ic { flex: none; width: 3.6rem; height: 3.6rem; padding: .85rem; border-radius: 50%; background: rgba(45,212,191,.22); border: 1px solid rgba(94,234,212,.5); color: #5eead4; }
	.hero-ic :global(svg) { width: 100%; height: 100%; }
	.hero-label { font-size: 1rem; opacity: .85; }
	.hero-num { font-size: 2.5rem; font-weight: 800; line-height: 1.1; letter-spacing: -.01em; }
	.hero-sub { font-size: .98rem; color: #5eead4; font-weight: 500; }
	.hero-sub.down { color: #fda4af; }
	.hero-spark { margin-left: auto; flex: none; width: 6.5rem; height: 3.4rem; }
	:global(html.dark.forest) .hero { background: radial-gradient(circle at 90% 0%, rgba(242,184,58,.25), transparent 50%), linear-gradient(145deg, #1d4a46, #0f2d2b); }

	.stats3 { display: grid; grid-template-columns: repeat(3, 1fr); gap: .7rem; margin-top: .85rem; }
	.stat3 { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: .15rem; padding: .85rem .8rem; border-radius: 1.25rem; border: 4px solid transparent; color: var(--text);
		background: linear-gradient(to bottom, var(--fa), var(--fb)) padding-box, var(--rim) border-box;
		box-shadow: inset 0 0 7px 1px var(--glow), inset 0 -3px 5px var(--glow-b), var(--ring), var(--glass-drop); }
	:global(html.dark) .stat3 { box-shadow: inset 0 0 7px 1px rgba(255,255,255,.2), inset 0 -3px 5px rgba(0,0,0,.4), var(--ring), var(--glass-drop); }
	.stat3::before { content: ''; position: absolute; pointer-events: none; top: 2px; left: 3px; right: 3px; height: 30%; border-radius: 1rem 1rem 55% 55% / 1rem 1rem .8rem .8rem; background: linear-gradient(to bottom, var(--gloss-a), var(--gloss-b)); }
	.stat3 > * { position: relative; z-index: 1; }
	.stat3 .stat-ic { width: 2.9rem; height: 2.9rem; padding: .65rem; margin-bottom: .35rem; }
	.stat3-label { font-size: .98rem; line-height: 1.2; color: var(--sub); }
	.stat3-num { font-size: 1.9rem; font-weight: 800; line-height: 1.1; }
	.stat3-sub { font-size: .82rem; color: var(--sub); }

	/* quick actions: round icon bubble above a centred label */
	.qa { align-items: center; justify-content: center; text-align: center; gap: .45rem; min-height: 5.6rem; }
	.qa-ic { width: 2.9rem; height: 2.9rem; padding: .65rem; border-radius: 50%; color: #0f8f86; background: linear-gradient(to bottom, #d9f6f1, #aee7de); box-shadow: inset 0 0 5px rgba(255,255,255,.8), 0 3px 6px -3px rgba(15,60,70,.5); }
	.qa-ic.word { color: #2563c9; background: linear-gradient(to bottom, #e0ebff, #b9d0fb); }
	:global(html.dark) .qa-ic { background: linear-gradient(to bottom, rgba(94,234,212,.35), rgba(94,234,212,.15)); color: #99f6e4; }
	:global(html.dark) .qa-ic.word { background: linear-gradient(to bottom, rgba(96,165,250,.4), rgba(96,165,250,.18)); color: #bfdbfe; }
	.qa { font-size: .95rem; font-weight: 600; }
	@media (min-width: 720px) { .stats3 { max-width: 40rem; } }

	@media (min-width: 720px) {
			.quick { grid-template-columns: repeat(6, 1fr); }
		.cols { grid-template-columns: repeat(2, 1fr); }
		h1 { font-size: 2.4rem; }
	}
	@media (max-width: 380px) {
		h1 { font-size: 1.8rem; }
		.create-btn { padding: .75rem .9rem; font-size: .98rem; }
			.stat-ic { width: 3rem; height: 3rem; padding: .7rem; }
	}
</style>
