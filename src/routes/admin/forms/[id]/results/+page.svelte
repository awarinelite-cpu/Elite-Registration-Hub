<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { collection, doc, getDoc, getDocs, query, where } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { studentName, scoreForm } from '$lib/forms.js';
	import BackButton from '$lib/BackButton.svelte';

	const formId = page.params.id;
	let form = $state(null);
	let apps = $state([]);
	let loading = $state(true);
	let error = $state('');

	onMount(async () => {
		try {
			const fs = await getDoc(doc(firestore, 'forms', formId));
			if (!fs.exists()) throw new Error('Form not found.');
			form = { id: fs.id, ...fs.data() };
			const snap = await getDocs(query(collection(firestore, 'applications'), where('formId', '==', formId)));
			apps = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
		} catch (e) {
			error = e.message || 'Could not load results.';
		}
		loading = false;
	});

	const MATRIC = /matric|reg(istration)?\.?\s*(no|number|num)|student\s*(id|no|number)/i;
	const matricOf = (a) => {
		const f = (form?.fields || []).find((x) => !x.scored && MATRIC.test(x.label || ''));
		const v = f && a.data?.[f.id];
		return typeof v === 'string' ? v.trim() : '';
	};

	// one scored row per student
	const rows = $derived.by(() => {
		if (!form) return [];
		return apps
			.map((a) => {
				const s = scoreForm(form.fields, a.data || {}, form.quiz);
				return { id: a.id, name: studentName(form, a) || '—', matric: matricOf(a) || '—', appNo: a.applicationNumber, answered: s.answered, questions: s.questions, score: s.score, total: s.total, pct: s.pct, passed: s.passed, at: a.submittedAt || 0, items: s.items };
			})
			.sort((x, y) => y.score - x.score || x.at - y.at)
			.map((r, i) => ({ ...r, pos: i + 1 }));
	});

	// per-question pass/fail counts
	const qstats = $derived.by(() => {
		const map = new Map();
		for (const r of rows) {
			for (const it of r.items) {
				const m = map.get(it.id) || { id: it.id, label: it.label, ok: 0, n: 0, order: map.size };
				m.n++;
				if (it.ok) m.ok++;
				map.set(it.id, m);
			}
		}
		return [...map.values()].map((m) => ({ ...m, pct: m.n ? Math.round((m.ok / m.n) * 1000) / 10 : 0 }));
	});
	const mostPassed = $derived([...qstats].sort((a, b) => b.pct - a.pct || a.order - b.order).slice(0, 5));
	const mostFailed = $derived([...qstats].sort((a, b) => a.pct - b.pct || a.order - b.order).slice(0, 5));

	const top = $derived(rows.length ? rows[0] : null);
	const topAll = $derived(top ? rows.filter((r) => r.score === top.score) : []);
	const avg = $derived(rows.length ? Math.round((rows.reduce((n, r) => n + r.pct, 0) / rows.length) * 10) / 10 : 0);
	const passCount = $derived(rows.filter((r) => r.passed === true).length);
	const hasPass = $derived(rows.some((r) => r.passed !== null));
	const today = new Date().toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' });
</script>

<svelte:head>
	<title>Results — {form?.title || ''}</title>
	{@html '<style>@media print { @page { size: A4; margin: 12mm; } header, .no-print { display: none !important; } body, main { background: #fff !important; } main { max-width: none !important; padding: 0 !important; } .sheet { box-shadow: none !important; border: 0 !important; padding: 0 !important; width: auto !important; max-width: none !important; } .sheet table { page-break-inside: auto; } .sheet tr { page-break-inside: avoid; } .sheet thead { display: table-header-group; } }</style>'}
</svelte:head>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="no-print mb-4 flex flex-wrap items-center justify-between gap-2">
		<BackButton fallback="/admin" />
		<button class="btn" onclick={() => window.print()} disabled={!rows.length}>🖨️ Print result sheet (A4)</button>
	</div>

	<article class="sheet mx-auto bg-white p-6 text-slate-900 shadow md:w-[210mm] md:max-w-full" style="color:#0f172a;background:#fff">
		<div class="mb-4 border-b-2 border-slate-800 pb-3 text-center">
			<h1 class="text-xl font-bold uppercase">{form.title}</h1>
			<p class="text-sm font-semibold">RESULT SHEET</p>
			<p class="text-xs text-slate-600">{today}{#if form.quiz?.passMark} · Pass mark {form.quiz.passMark}%{/if}</p>
		</div>

		{#if !rows.length}
			<p class="py-6 text-center text-slate-600">No students have taken this exam yet.</p>
		{:else}
			<div class="mb-4 grid grid-cols-2 gap-2 text-sm sm:grid-cols-4">
				<div class="rounded border border-slate-300 p-2"><div class="text-xs text-slate-600">Students</div><div class="text-lg font-bold">{rows.length}</div></div>
				<div class="rounded border border-slate-300 p-2"><div class="text-xs text-slate-600">Average</div><div class="text-lg font-bold">{avg}%</div></div>
				<div class="rounded border border-slate-300 p-2"><div class="text-xs text-slate-600">Highest score</div><div class="text-lg font-bold">{top.score}/{top.total} ({top.pct}%)</div></div>
				<div class="rounded border border-slate-300 p-2"><div class="text-xs text-slate-600">{hasPass ? 'Passed' : 'Questions'}</div><div class="text-lg font-bold">{hasPass ? `${passCount}/${rows.length}` : top.questions}</div></div>
			</div>
			<p class="mb-3 text-sm"><strong>Highest scorer{topAll.length > 1 ? 's' : ''}:</strong> {topAll.map((r) => r.name).join(', ')} — {top.score}/{top.total} ({top.pct}%)</p>

			<table class="w-full border-collapse text-sm">
				<thead>
					<tr class="bg-slate-100">
						<th class="border border-slate-400 px-2 py-1 text-left">S/N</th>
						<th class="border border-slate-400 px-2 py-1 text-left">Name</th>
						<th class="border border-slate-400 px-2 py-1 text-left">Matric No.</th>
						<th class="border border-slate-400 px-2 py-1 text-center">Answered</th>
						<th class="border border-slate-400 px-2 py-1 text-center">Score</th>
						<th class="border border-slate-400 px-2 py-1 text-center">%</th>
					</tr>
				</thead>
				<tbody>
					{#each rows as r (r.id)}
						<tr>
							<td class="border border-slate-400 px-2 py-1">{r.pos}</td>
							<td class="border border-slate-400 px-2 py-1">{r.name}</td>
							<td class="border border-slate-400 px-2 py-1">{r.matric}</td>
							<td class="border border-slate-400 px-2 py-1 text-center">{r.answered}/{r.questions}</td>
							<td class="border border-slate-400 px-2 py-1 text-center">{r.score}/{r.total}</td>
							<td class="border border-slate-400 px-2 py-1 text-center font-semibold">{r.pct}%</td>
						</tr>
					{/each}
				</tbody>
			</table>

			<div class="no-print mt-5 grid gap-4 sm:grid-cols-2" style="page-break-inside:avoid">
				{#each [{ t: 'Most passed questions', l: mostPassed, k: 'ok' }, { t: 'Most failed questions', l: mostFailed, k: 'bad' }] as g}
					<div>
						<h2 class="mb-1 text-sm font-bold uppercase">{g.t}</h2>
						<table class="w-full border-collapse text-xs">
							<thead><tr class="bg-slate-100"><th class="border border-slate-400 px-1.5 py-1 text-left">Question</th><th class="border border-slate-400 px-1.5 py-1 text-center">Correct</th><th class="border border-slate-400 px-1.5 py-1 text-center">%</th></tr></thead>
							<tbody>
								{#each g.l as q}
									<tr><td class="border border-slate-400 px-1.5 py-1">{q.label}</td><td class="border border-slate-400 px-1.5 py-1 text-center">{q.ok}/{q.n}</td><td class="border border-slate-400 px-1.5 py-1 text-center font-semibold">{q.pct}%</td></tr>
								{/each}
							</tbody>
						</table>
					</div>
				{/each}
			</div>
		{/if}
	</article>
{/if}
