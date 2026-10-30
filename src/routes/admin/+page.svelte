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
		hourglass: '<path d="M7 3h10M7 21h10"/><path d="M8 3c0 4 2 5 4 7-2 2-4 3-4 7M16 3c0 4-2 5-4 7 2 2 4 3 4 7"/>',
		x: '<path d="M6 6l12 12M18 6L6 18"/>',
		clock: '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
		arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
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
		loadRecent();
	});

	const shownNotes = $derived.by(() => {
		const q = formSearch.trim().toLowerCase();
		return q ? notes.filter((n) => (n.title || '').toLowerCase().includes(q)).slice(0, 20) : [];
	});


	// ---- Elite design extras: greeting + recent activity feed ----
	import { limit, orderBy } from 'firebase/firestore';
	import Logo from '$lib/Logo.svelte';
	const hr = new Date().getHours();
	const greeting = hr < 12 ? 'Good Morning' : hr < 17 ? 'Good Afternoon' : 'Good Evening';
	let recent = $state([]);
	let recentLoading = $state(true);
	const day = (ms) => new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
	const clock = (ms) => new Date(ms).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
	function look(status) {
		if (status === 'rejected') return { title: 'Application Rejected', icon: 'x', tone: 'red', badge: 'Rejected' };
		if (status === 'approved' || status === 'done') return { title: 'Application Approved', icon: 'doc', tone: 'gold', badge: 'Completed' };
		if (status === 'reviewed') return { title: 'Under Review', icon: 'hourglass', tone: 'slate', badge: 'In Progress' };
		return { title: 'Application Submitted', icon: 'doc', tone: 'green', badge: 'Completed' };
	}
	async function loadRecent() {
		try {
			if (session.role === 'sub') recent = (await loadAllApplications(forms)).slice(0, 6);
			else recent = (await getDocs(query(collection(firestore, 'applications'), orderBy('submittedAt', 'desc'), limit(6)))).docs.map((d) => ({ id: d.id, ...d.data() }));
			session.pending = recent.filter((a) => a.status === 'submitted' || a.status === 'reviewed').length;
		} catch {}
		recentLoading = false;
	}
</script>

{#snippet ic(name)}
	<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">{@html ICONS[name]}</svg>
{/snippet}


<div class="dash">
	{#if docError}<div class="mb-3 w-full rounded-lg bg-red-50 p-3 text-sm text-red-700">{docError}</div>{/if}

	{#if loading}
		<p class="muted">Loading…</p>
	{:else}
		<section class="banner">
			<div class="b-text">
				<div class="b-hi">{greeting},</div>
				<div class="b-name">{session.name || 'Admin'}</div>
				<p class="b-sub">Your one-stop platform for easy and seamless registration.</p>
			</div>
			<div class="b-mark"><Logo size={104} /></div>
			<blockquote class="b-quote">“Your goals are valid. Keep going.”</blockquote>
		</section>

		<section class="stats">
			<a href="/admin/applications" class="stat st-total"><span class="st-ic">{@render ic('users')}</span><span class="st-num">{total.toLocaleString()}</span><span class="st-label">Applications</span><span class="st-link" class:down={trendDown}>{trendText}</span></a>
			<div class="stat st-approved"><span class="st-ic">{@render ic('doc')}</span><span class="st-num">{forms.length}</span><span class="st-label">Total forms</span><span class="st-link">All forms</span></div>
			<div class="stat st-pending"><span class="st-ic">{@render ic('toggle')}</span><span class="st-num">{activeCount}</span><span class="st-label">Active forms</span><span class="st-link">Live now</span></div>
			<a href="/admin/notes" class="stat st-rejected"><span class="st-ic">{@render ic('note')}</span><span class="st-num">{noteCount ?? '–'}</span><span class="st-label">Notes</span><span class="st-link">Private notes</span></a>
		</section>

		<div class="sec"><h2>Quick Actions</h2></div>
		<section class="quick2">
			<a href="/admin/forms/new" class="tile t-dark"><span class="t-ic">{@render ic('docPlus')}</span><span class="t-txt"><b>New form</b><small>Create a form</small></span><span class="t-go">{@render ic('chevron')}</span></a>
			<button type="button" class="tile t-cream" onclick={() => (showCsv = true)}><b class="tag tag-csv">CSV</b><span class="t-ic">{@render ic('cloudUp')}</span><span class="t-txt"><b>Upload CSV</b><small>Import a quiz</small></span><span class="t-go">{@render ic('chevron')}</span></button>
			<a href="/admin/forms/import-quiz" class="tile t-gold"><span class="t-ic">{@render ic('clipboard')}</span><span class="t-txt"><b>Paste quiz</b><small>From pasted text</small></span><span class="t-go">{@render ic('chevron')}</span></a>
			<a href="/admin/forms/import" class="tile t-cream"><span class="t-ic">{@render ic('doc')}</span><span class="t-txt"><b>Paste form</b><small>From pasted text</small></span><span class="t-go">{@render ic('chevron')}</span></a>
			<a href="/admin/notes/new" class="tile t-gold"><span class="t-ic">{@render ic('pencilDoc')}</span><span class="t-txt"><b>Paste notes</b><small>Write or paste</small></span><span class="t-go">{@render ic('chevron')}</span></a>
			<label class="tile t-dark" class:busy={docBusy}><b class="tag tag-docx">DOCX</b><span class="t-ic">{@render ic('wordDoc')}</span><span class="t-txt"><b>{docBusy ? 'Reading…' : 'Word file'}</b><small>Import a document</small></span><span class="t-go">{@render ic('chevron')}</span>
				<input type="file" class="sr-only" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange={onWordFile} disabled={docBusy} />
			</label>
			<a href="/admin/applications" class="tile t-cream"><span class="t-ic">{@render ic('users')}</span><span class="t-txt"><b>Applications</b><small>View all entries</small></span><span class="t-go">{@render ic('chevron')}</span></a>
			<a href="/admin/payments" class="tile t-gold"><span class="t-ic">{@render ic('clipboard')}</span><span class="t-txt"><b>Payment &amp; Fees</b><small>Applicant payment info</small></span><span class="t-go">{@render ic('chevron')}</span></a>
		</section>

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

		{#if !formSearch.trim()}
			<div class="sec"><h2><span class="clk">{@render ic('clock')}</span>Recent Activity</h2><a href="/admin/applications" class="sec-link">View all <i>{@render ic('arrow')}</i></a></div>
			<section class="feed">
				{#if recentLoading}<p class="empty">Loading…</p>
				{:else if !recent.length}<p class="empty">No applications yet.</p>
				{:else}
					{#each recent as a (a.id)}
						{@const l = look(a.status)}
						<a href="/admin/forms/{a.formId}/applications?q={encodeURIComponent(a.applicationNumber || '')}" class="row">
							<span class="r-ic tone-{l.tone}">{@render ic(l.icon)}</span>
							<span class="r-txt"><b>{l.title}</b><small>{nameOfApp(a) || a.applicationNumber} · {titleOf(a.formId)}</small></span>
							<span class="r-meta"><em class="badge-{l.tone}">{l.badge}</em><small>{day(a.submittedAt)} • {clock(a.submittedAt)}</small></span>
						</a>
					{/each}
				{/if}
			</section>
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

	/* ===== flat finish ===== */
	.stat3, .qa, .search, .col, .res-row {
		border: 1px solid var(--line); background: var(--card); box-shadow: var(--shadow);
		transition: transform .15s ease, border-color .15s ease;
	}
	.stat3, .col { border-radius: 1.1rem; }
	.qa, .search, .res-row { border-radius: .95rem; }
	.create-btn { border: 0; background: var(--accent); color: var(--accent-text); text-shadow: none; box-shadow: 0 6px 14px -6px color-mix(in srgb, var(--accent) 70%, black); transition: filter .15s ease, transform .15s ease; }
	.col { background: color-mix(in srgb, var(--tone) 9%, var(--card)); border-color: color-mix(in srgb, var(--tone) 28%, var(--card)); box-shadow: none; }
	.stat-ic { background: color-mix(in srgb, var(--tone) 14%, var(--card)); color: var(--tone); }
	:global(html.dark) .stat-ic { color: color-mix(in srgb, var(--tone) 55%, white); }
	.col-ic { background: var(--tone); color: #fff; }
	.stat3, .qa, .search, .col, .res-row { position: relative; }
	@media (hover: hover) {
		.qa:hover, .col:hover, .res-row:hover { border-color: var(--tone, var(--accent)); }
		.create-btn:hover { filter: brightness(1.07); }
	}
	.qa:active, .create-btn:active { transform: scale(.98); }
	.qa-ic { background: color-mix(in srgb, #0f8f86 14%, var(--card)); box-shadow: none; }
	.qa-ic.word { background: color-mix(in srgb, #2563c9 14%, var(--card)); }
	@media (prefers-reduced-motion: reduce) { .stat3, .qa, .col, .create-btn { transition: none; } }

	/* ===== layout from the NurseShift-style home screen ===== */
	.hero { position: relative; overflow: hidden; display: flex; align-items: center; gap: 1rem; padding: 1.15rem 1.2rem; border-radius: 1.4rem; color: #fff;
		background: radial-gradient(circle at 90% 0%, rgba(94,234,212,.28), transparent 50%), linear-gradient(145deg, #0b4f4a 0%, #063633 60%, #052b29 100%);
		box-shadow: var(--shadow); }
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
	.stat3 { position: relative; overflow: hidden; display: flex; flex-direction: column; gap: .15rem; padding: .85rem .8rem; color: var(--text); }
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

/* banner */
	.banner { position: relative; overflow: hidden; display: grid; grid-template-columns: 1fr auto; align-items: center; gap: .6rem; padding: 1.3rem 1.2rem 1.3rem 1.4rem; border-radius: 1.3rem; color: #fff;
		background: radial-gradient(circle at 70% 20%, rgba(255,255,255,.07), transparent 45%), linear-gradient(150deg, #124a2b, #0a2e1b 65%, #08261a); border: 1px solid #1d5a38; box-shadow: var(--card-shadow); }
	.banner::after { content: ''; position: absolute; left: -10%; right: -10%; bottom: -1px; height: 3px; background: linear-gradient(90deg, transparent, #c9a13b 30%, #e6cd86 60%, transparent); }
	.b-hi { font-size: 1.2rem; font-weight: 500; opacity: .95; }
	.b-name { font-size: 2.1rem; font-weight: 800; letter-spacing: -.01em; line-height: 1.1; margin: .1rem 0 .5rem; overflow-wrap: anywhere; }
	.b-sub { margin: 0; max-width: 16rem; font-size: .98rem; line-height: 1.35; opacity: .92; }
	.b-mark { display: none; width: 6.5rem; height: 6.5rem; }
	.b-quote { grid-column: 1 / -1; margin: .6rem 0 0; font-family: Georgia, 'Times New Roman', serif; font-style: italic; font-size: 1.2rem; line-height: 1.3; color: #e6cd86; }
	@media (min-width: 520px) {
		.banner { grid-template-columns: 1fr 6.5rem 9rem; }
		.b-mark { display: block; }
		.b-quote { grid-column: auto; margin: 0; padding-left: .8rem; border-left: 2px solid rgba(201,161,59,.5); }
	}

	/* stats */
	.stats { display: grid; grid-template-columns: repeat(2, 1fr); gap: .7rem; margin-top: 1rem; }
	@media (min-width: 620px) { .stats { grid-template-columns: repeat(4, 1fr); } }
	.stat { display: flex; flex-direction: column; gap: .2rem; padding: .9rem .9rem .8rem; border-radius: 1rem; text-decoration: none; color: var(--ink); background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.st-ic { width: 3.2rem; height: 3.2rem; padding: .8rem; border-radius: 50%; color: #fff; margin-bottom: .25rem; }
	.st-num { font-size: 2rem; font-weight: 800; line-height: 1.1; }
	.st-label { font-size: 1rem; }
	.st-link { margin-top: .35rem; display: inline-flex; align-items: center; gap: .35rem; font-size: .85rem; color: var(--sub); }
	.st-total { border-color: #2e7a4d; background: color-mix(in srgb, #1f6a3f 5%, var(--surface)); }
	.st-total .st-ic { background: linear-gradient(145deg, #1f6a3f, #0b3320); }
	.st-approved { border-color: #ecd28a; background: var(--gold-tint); }
	.st-approved .st-ic { background: linear-gradient(145deg, #e0b845, #b8901f); }
	.st-pending .st-ic { background: linear-gradient(145deg, #a39a6b, #7c7549); }
	.st-rejected .st-ic { background: linear-gradient(145deg, #7b8489, #576065); }
	:global(html.dark) .st-approved { background: color-mix(in srgb, #d4a937 14%, var(--surface)); }

	/* section heads */
	.sec { display: flex; align-items: center; justify-content: space-between; margin: 1.6rem 0 .7rem; }
	h2 { display: flex; align-items: center; gap: .55rem; margin: 0; font-size: 1.45rem; font-weight: 700; color: var(--ink); }
	.clock { width: 1.9rem; height: 1.9rem; }
	.sec-link { display: inline-flex; align-items: center; gap: .4rem; color: var(--sub); text-decoration: none; font-size: 1.02rem; }
	.sec-link:hover { color: var(--ink); }

	/* quick actions */
			.qa { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: .7rem; min-height: 7.4rem; padding: .9rem; border-radius: 1rem; text-decoration: none; border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.t-xx-ic { width: 3rem; height: 3rem; padding: .7rem; border-radius: 50%; }
	.t-xx-txt { display: flex; flex-direction: column; padding-right: 1.9rem; line-height: 1.25; }
	.t-xx-txt b { font-size: 1.08rem; font-weight: 700; }
	.t-xx-txt small { font-size: .85rem; opacity: .85; }
	.t-xx-go { position: absolute; right: .75rem; bottom: .85rem; display: grid; place-items: center; width: 1.9rem; height: 1.9rem; padding: .45rem; border-radius: 50%; }
	.t-xx-dark { color: #fff; background: linear-gradient(150deg, #165530, #0a2e1b); border-color: #0a2e1b; }
	.t-xx-dark .t-xx-ic { border: 1.5px solid rgba(255,255,255,.75); color: #fff; }
	.t-xx-dark .t-xx-go { background: rgba(255,255,255,.16); }
	.t-xx-cream { color: var(--ink); background: var(--surface); }
	.t-xx-cream .t-xx-ic { background: linear-gradient(145deg, #5f8a45, #3f6a2c); color: #fff; }
	.t-xx-cream .t-xx-go { background: var(--surface-2); color: var(--sub); }
	.t-xx-gold { color: var(--ink); background: var(--gold-tint); border-color: #efdcaa; }
	.t-xx-gold .t-xx-ic { background: linear-gradient(145deg, #e0b845, #b8901f); color: #fff; }
	.t-xx-gold .t-xx-go { background: rgba(201,161,59,.22); color: #7a5c0f; }
	:global(html.dark) .t-xx-gold { background: color-mix(in srgb, #d4a937 14%, var(--surface)); border-color: #4a4a22; }
	:global(html.dark) .t-xx-gold .t-xx-go { color: #e6cd86; }

	/* activity */
	.feed { border-radius: 1rem; overflow: hidden; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.row { display: flex; align-items: center; gap: .85rem; padding: .85rem .9rem; text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--edge); }
	.row:last-child { border-bottom: 0; }
	.row:hover { background: var(--surface-2); }
	.r-ic { flex: none; width: 3.2rem; height: 3.2rem; padding: .8rem; border-radius: 50%; color: #fff; }
	.tone-green { background: linear-gradient(145deg, #1f7a45, #0f5a2d); }
	.tone-gold { background: linear-gradient(145deg, #e0b845, #b8901f); }
	.tone-slate { background: linear-gradient(145deg, #6b7a99, #4b5873); }
	.tone-red { background: linear-gradient(145deg, #f25b5b, #dc2f3a); }
	.r-txt { flex: 1; min-width: 0; display: flex; flex-direction: column; line-height: 1.3; }
	.r-txt b { font-size: 1.05rem; font-weight: 700; }
	.r-txt small { color: #5a6b7e; font-size: .9rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.r-meta { flex: none; display: flex; flex-direction: column; align-items: flex-start; gap: .25rem; }
	.r-meta em { font-style: normal; padding: .1rem .65rem; border-radius: 9999px; font-size: .82rem; font-weight: 600; }
	.r-meta small { font-size: .82rem; color: var(--sub); white-space: nowrap; }
	.badge-green, .badge-gold { background: #dcf3e2; color: #1a6b36; }
	.badge-slate { background: #fdeccd; color: #a2640a; }
	.badge-red { background: #fde2e2; color: #c02626; }
	.r-go { flex: none; width: 1.3rem; height: 1.3rem; color: var(--sub); }
	.empty { margin: 0; padding: 1.3rem; text-align: center; color: var(--sub); }
	@media (max-width: 500px) { .r-meta small { display: none; } .r-meta { align-items: flex-end; } .r-ic { width: 2.8rem; height: 2.8rem; padding: .7rem; } }

	/* picture-style action tiles */
	.quick2 { display: grid; grid-template-columns: repeat(2, 1fr); gap: .7rem; }
	@media (min-width: 560px) { .quick2 { grid-template-columns: repeat(3, 1fr); } }
	.tile { position: relative; display: flex; flex-direction: column; justify-content: space-between; gap: .7rem; min-height: 7.4rem; padding: .9rem; border-radius: 1rem; text-decoration: none; text-align: left; cursor: pointer; border: 1px solid var(--edge); box-shadow: var(--card-shadow); font: inherit; }
	.tile.busy { opacity: .6; }
	.t-ic { display: block; width: 3rem; height: 3rem; padding: .7rem; border-radius: 50%; }
	.t-txt { display: flex; flex-direction: column; padding-right: 1.9rem; line-height: 1.25; }
	.t-txt b { font-size: 1.08rem; font-weight: 700; } .t-txt small { font-size: .85rem; opacity: .85; }
	.t-go { position: absolute; right: .75rem; bottom: .85rem; display: grid; place-items: center; width: 1.9rem; height: 1.9rem; padding: .45rem; border-radius: 50%; }
	.t-dark { color: #fff; background: linear-gradient(150deg, #165530, #0a2e1b); border-color: #0a2e1b; }
	.t-dark .t-ic { border: 1.5px solid rgba(255,255,255,.75); color: #fff; } .t-dark .t-go { background: rgba(255,255,255,.16); }
	.t-cream { color: var(--ink); background: var(--surface); }
	.t-cream .t-ic { background: linear-gradient(145deg, #5f8a45, #3f6a2c); color: #fff; } .t-cream .t-go { background: var(--surface-2); color: var(--sub); }
	.t-gold { color: var(--ink); background: var(--gold-tint); border-color: #efdcaa; }
	.t-gold .t-ic { background: linear-gradient(145deg, #e0b845, #b8901f); color: #fff; } .t-gold .t-go { background: rgba(201,161,59,.22); color: #7a5c0f; }
	:global(html.dark) .t-gold { background: color-mix(in srgb, #d4a937 14%, var(--surface)); border-color: #4a4a22; }
	.tile :global(svg) { width: 100%; height: 100%; }
	.tile .tag { position: absolute; top: .6rem; right: .6rem; padding: .12rem .5rem; border-radius: .4rem; color: #fff; font-size: .72rem; font-weight: 800; }
	.dash :global(svg) { width: 100%; height: 100%; }
	.sec { margin-top: 1.6rem; }
	.search { margin-top: 1rem; }
	h2 { margin: 0; }
	.clk { width: 1.9rem; height: 1.9rem; display: inline-flex; }
	.st-link.down { color: #d9534f; }

	/* ===== mobile-first: banner logo always visible; stats + actions 4 per row ===== */
	.banner { grid-template-columns: 1fr 5rem; }
	.b-mark { display: block; width: 5rem; height: 5rem; }
	.b-quote { grid-column: 1 / -1; }
	@media (min-width: 520px) {
		.banner { grid-template-columns: 1fr 6.5rem 9rem; }
		.b-mark { width: 6.5rem; height: 6.5rem; }
		.b-quote { grid-column: auto; }
	}

	.stats { grid-template-columns: repeat(4, 1fr); gap: .5rem; }
	.stat { padding: .65rem .5rem .6rem; border-radius: .9rem; min-width: 0; }
	.st-ic { width: 2.4rem; height: 2.4rem; padding: .55rem; margin-bottom: .15rem; }
	.st-num { font-size: 1.5rem; }
	.st-label { font-size: .78rem; line-height: 1.15; overflow-wrap: anywhere; }
	.st-link { margin-top: .2rem; font-size: .66rem; line-height: 1.2; }
	@media (min-width: 620px) {
		.stats { gap: .7rem; }
		.stat { padding: .9rem .9rem .8rem; }
		.st-ic { width: 3.2rem; height: 3.2rem; padding: .8rem; }
		.st-num { font-size: 2rem; }
		.st-label { font-size: 1rem; }
		.st-link { font-size: .85rem; }
	}

	.quick2, .quick2 { grid-template-columns: repeat(4, 1fr); gap: .5rem; }
	.tile { align-items: center; justify-content: center; text-align: center; gap: .4rem; min-height: 5.8rem; padding: .7rem .3rem .6rem; border-radius: .9rem; min-width: 0; }
	.t-ic { width: 2.5rem; height: 2.5rem; padding: .6rem; }
	.t-txt { padding-right: 0; align-items: center; }
	.t-txt b { font-size: .78rem; line-height: 1.15; }
	.t-txt small, .t-go { display: none; }
	.tile .tag { top: .3rem; right: .3rem; padding: .05rem .3rem; font-size: .58rem; }
	@media (min-width: 620px) {
		.quick2 { gap: .7rem; }
		.tile { min-height: 8.2rem; padding: .9rem .6rem; }
		.t-ic { width: 3rem; height: 3rem; padding: .7rem; }
		.t-txt b { font-size: 1rem; }
		.t-txt small { display: block; font-size: .8rem; }
		.tile .tag { font-size: .68rem; }
	}
</style>
