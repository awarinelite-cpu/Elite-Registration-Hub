<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { collection, deleteDoc, doc, getDoc, getDocs, query, updateDoc, where } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import { STATUSES, studentName, joinArray, migrateFormFields, isLegacyScratch, isLegacySsce, ssceLine, scratchLine } from '$lib/forms.js';
	import { downloadCsv } from '$lib/csv.js';

	const formId = page.params.id;
	let form = $state(null);
	let apps = $state([]);
	let loading = $state(true);
	let search = $state(page.url.searchParams.get('q') || '');
	let statusFilter = $state('all');
	let selected = $state(null);
	let error = $state('');

	onMount(async () => {
		const fs = await getDoc(doc(firestore, 'forms', formId));
		if (!fs.exists()) {
			error = 'Form not found.';
			loading = false;
			return;
		}
		const d = fs.data();
		form = { id: fs.id, ...d, fields: migrateFormFields(d.fields, { keepLegacy: true }) };
		const snap = await getDocs(query(collection(firestore, 'applications'), where('formId', '==', formId)));
		apps = snap.docs.map((d) => ({ id: d.id, ...d.data() })).sort((a, b) => b.submittedAt - a.submittedAt);
		loading = false;
	});

	const display = (f, a) => {
		const v = a.data?.[f.id];
		if (v == null) return '';
		if (Array.isArray(v)) return joinArray(v, '; ');
		if (typeof v === 'object') return v.name;
		return v;
	};
	const nameOf = (a) => studentName(form, a);

	const filtered = $derived.by(() => {
		const q = search.trim().toLowerCase();
		return apps.filter((a) => {
			if (statusFilter !== 'all' && a.status !== statusFilter) return false;
			if (!q) return true;
			return a.applicationNumber.toLowerCase().includes(q) || form.fields.some((f) => String(display(f, a)).toLowerCase().includes(q));
		});
	});

	async function setStatus(a, status) {
		await updateDoc(doc(firestore, 'applications', a.id), { status });
		a.status = status;
	}

	async function remove(a) {
		if (!confirm(`Delete ${a.applicationNumber}? This cannot be undone.`)) return;
		await deleteDoc(doc(firestore, 'applications', a.id));
		apps = apps.filter((x) => x.id !== a.id);
		selected = null;
	}

	function exportCsv() {
		const head = ['Application No.', 'Status', 'Submitted', 'Last updated', ...form.fields.map((f) => f.label)];
		const rows = filtered.map((a) => [
			a.applicationNumber,
			a.status,
			new Date(a.submittedAt).toISOString(),
			new Date(a.updatedAt || a.submittedAt).toISOString(),
			...form.fields.map((f) => display(f, a))
		]);
		downloadCsv(`${form.id}-applications.csv`, [head, ...rows]);
	}

	let copiedId = $state('');

	// One card per value; SSCE exam / scratch card sittings each get their own card.
	// Old single-box fields (replaced by the grouped fields) are hidden when empty.
	const detailItems = $derived.by(() => {
		if (!selected || !form) return [];
		const grouped = form.fields.some((f) => f.type === 'ssceexams' || f.type === 'scratchcards');
		const out = [];
		for (const f of form.fields) {
			const v = selected.data?.[f.id];
			const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
			if (grouped && empty && f.type !== 'ssceexams' && f.type !== 'scratchcards' && (isLegacySsce(f) || isLegacyScratch(f))) continue;
			if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object')) {
				v.forEach((x, i) => {
					const line = 'number' in x ? ssceLine(x) : scratchLine(x);
					const tag = v.length > 1 ? (i === 0 ? ' (First sitting)' : ' (Second sitting)') : '';
					out.push({ id: `${f.id}-${i}`, label: f.label + tag, v: line, text: line, second: i > 0 });
				});
				continue;
			}
			const text = v == null ? '' : Array.isArray(v) ? joinArray(v) : typeof v === 'object' ? '' : String(v);
			out.push({ id: f.id, label: f.label, v, text });
		}
		return out;
	});
	async function copyValue(id, text) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			const t = document.createElement('textarea');
			t.value = text;
			t.style.position = 'fixed';
			t.style.opacity = '0';
			document.body.appendChild(t);
			t.select();
			document.execCommand('copy');
			t.remove();
		}
		copiedId = id;
		setTimeout(() => copiedId === id && (copiedId = ''), 1200);
	}

	function appToText(a) {
		const lines = [
			`Application No.: ${a.applicationNumber}`,
			`Status: ${a.status}`,
			`Submitted: ${new Date(a.submittedAt).toLocaleString()}`
		];
		for (const f of form.fields) {
			const v = a.data?.[f.id];
			const text = v == null ? '' : Array.isArray(v) ? joinArray(v) : typeof v === 'object' ? v.name || '' : String(v);
			lines.push(`${f.label}: ${text || '—'}`);
		}
		return lines.join('\n');
	}

	let downloading = $state('');
	// saves the file straight to the device, named with the application number so files from different applicants don't clash
	async function downloadFile(file, fieldId) {
		downloading = fieldId;
		try {
			const token = await auth.currentUser.getIdToken();
			const res = await fetch(`/api/admin/file?path=${encodeURIComponent(file.path)}`, { headers: { authorization: `Bearer ${token}` } });
			if (!res.ok) return alert('Could not download file.');
			const url = URL.createObjectURL(await res.blob());
			const a = document.createElement('a');
			a.href = url;
			a.download = `${selected?.applicationNumber || 'application'}_${file.name}`;
			document.body.appendChild(a);
			a.click();
			a.remove();
			setTimeout(() => URL.revokeObjectURL(url), 10000);
		} finally {
			downloading = '';
		}
	}

	async function openFile(file) {
		const token = await auth.currentUser.getIdToken();
		const res = await fetch(`/api/admin/file?path=${encodeURIComponent(file.path)}`, { headers: { authorization: `Bearer ${token}` } });
		if (!res.ok) return alert('Could not load file.');
		window.open(URL.createObjectURL(await res.blob()), '_blank');
	}
</script>

{#if error}
	<p class="text-red-600">{error}</p>
{:else if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<div>
			<a href="/admin" class="btn-3d-ghost btn-3d-lg mb-2 !text-teal-800">← Dashboard</a>
			<h1 class="text-2xl font-bold">{form.title}</h1>
			<p class="text-sm text-slate-500">{apps.length} applications</p>
		</div>
		<div class="flex gap-2">
			<a class="btn-3d-ghost btn-3d-lg" href="/admin/forms/{form.id}">Manage form</a>
			<button class="btn-3d btn-3d-lg disabled:cursor-not-allowed disabled:opacity-50" onclick={exportCsv} disabled={!filtered.length}>Export CSV ({filtered.length})</button>
		</div>
	</div>

	<div class="mb-3 flex flex-wrap gap-2">
		<input class="input max-w-xs" placeholder="Search number or any field…" bind:value={search} />
		<select class="input max-w-[10rem]" bind:value={statusFilter}>
			<option value="all">All statuses</option>
			{#each STATUSES as s}<option value={s}>{s}</option>{/each}
		</select>
	</div>

	<div class="space-y-4">
		{#each filtered as a (a.id)}
			<div class="card space-y-3">
				<div class="flex items-start justify-between gap-2">
					<div class="min-w-0">
						<p class="break-all font-mono text-sm font-semibold">{a.applicationNumber}</p>
						<p class="mt-1 text-base font-bold">{nameOf(a) || '—'}</p>
						<p class="text-xs text-slate-500">{new Date(a.submittedAt).toLocaleDateString()}</p>
					</div>
					<button
						type="button"
						class="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700"
						aria-label="Copy everything in this application"
						title="Copy all"
						onclick={() => copyValue('row-' + a.id, appToText(a))}
					>
						{#if copiedId === 'row-' + a.id}
							<svg class="h-4 w-4 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
						{:else}
							<svg class="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" /></svg>
						{/if}
					</button>
				</div>
				<div class="flex items-center justify-between gap-2">
					<select class="input !w-auto !py-1" value={a.status} onchange={(e) => setStatus(a, e.currentTarget.value)}>
						{#each STATUSES as s}<option value={s}>{s}</option>{/each}
					</select>
					<button class="btn-3d-ghost btn-3d-lg" onclick={() => (selected = a)}>View</button>
				</div>
			</div>
		{:else}
			<p class="text-slate-500">No applications found.</p>
		{/each}
	</div>
{/if}

{#if selected}
	<div class="fixed inset-0 z-50 grid place-items-center bg-black/50 p-3 md:p-8" role="dialog" aria-modal="true">
		<div class="max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white p-5 shadow-2xl md:max-w-5xl md:p-10">
			<div class="mb-5 flex items-start justify-between gap-3 border-b border-slate-200 pb-4 md:mb-8 md:pb-6">
				<div>
					<h2 class="font-mono text-xl font-bold text-slate-900 md:text-4xl">{selected.applicationNumber}</h2>
					{#if nameOf(selected)}<p class="mt-1 text-base font-semibold text-slate-800 md:mt-2 md:text-2xl">{nameOf(selected)}</p>{/if}
					<p class="mt-1 text-sm text-slate-600 md:text-lg">Submitted {new Date(selected.submittedAt).toLocaleString()}</p>
				</div>
				<div class="flex items-center gap-1">
					<button
						type="button"
						class="shrink-0 rounded-md p-1.5 md:p-2.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700"
						aria-label="Copy everything in this row"
						title="Copy all"
						onclick={() => copyValue('modal-' + selected.id, appToText(selected))}
					>
						{#if copiedId === 'modal-' + selected.id}
							<svg class="h-5 w-5 md:h-7 md:w-7 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
						{:else}
							<svg class="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" /></svg>
						{/if}
					</button>
					<button class="btn-3d-ghost btn-3d-lg md:!px-6 md:!py-3 md:!text-lg" onclick={() => (selected = null)}>Close</button>
				</div>
			</div>
			<dl class="grid gap-3 md:grid-cols-2 md:gap-5">
				{#each detailItems as f (f.id)}
					{@const v = f.v}
					{@const text = f.text}
					<div class="flex items-start justify-between gap-2 rounded-xl border p-3 md:p-5 {f.second ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}">
						<div class="min-w-0">
							<dt class="text-sm font-semibold uppercase tracking-wide text-slate-600 md:text-base">{f.label}</dt>
							<dd class="mt-1 break-words text-lg font-semibold text-slate-900 md:text-2xl">
								{#if v && typeof v === 'object' && !Array.isArray(v)}
									<span class="flex items-center gap-2">
										<button class="min-w-0 break-all text-left text-teal-700 underline" onclick={() => openFile(v)}>📎 {v.name}</button>
										<button
											type="button"
											class="shrink-0 rounded-md p-1.5 text-teal-700 hover:bg-teal-50 disabled:opacity-50 md:p-2.5"
											aria-label="Download {f.label}"
											title="Download"
											disabled={downloading === f.id}
											onclick={() => downloadFile(v, f.id)}
										>
											<svg class="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" stroke-linecap="round" stroke-linejoin="round" /></svg>
										</button>
									</span>
								{:else if Array.isArray(v)}{#each v as x}{#if x && typeof x === 'object' && 'number' in x}<div>{x.board} | Exam No: {x.number} | Year: {x.year}</div>{:else if x && typeof x === 'object'}<div>{x.board} | PIN: {x.pin}{#if x.board !== 'NECO'} | Serial: {x.serial}{/if} | Year: {x.year}</div>{:else}{x}{/if}{:else}—{/each}
								{:else}{v || '—'}{/if}
							</dd>
						</div>
						{#if text}
							<button
								type="button"
								class="shrink-0 rounded-md p-1.5 md:p-2.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700"
								aria-label="Copy {f.label}"
								title="Copy"
								onclick={() => copyValue(f.id, text)}
							>
								{#if copiedId === f.id}
									<svg class="h-5 w-5 md:h-7 md:w-7 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
								{:else}
									<svg class="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" /></svg>
								{/if}
							</button>
						{/if}
					</div>
				{/each}
			</dl>
			<div class="mt-6 flex justify-between md:mt-10">
				<button class="btn-danger md:!px-6 md:!py-3 md:!text-lg" onclick={() => remove(selected)}>Delete</button>
			</div>
		</div>
	</div>
{/if}
