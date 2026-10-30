<script>
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { studentName } from '$lib/forms.js';
	import { loadForms, loadAllApplications, session } from '$lib/adminSession.svelte.js';

	const GROUPS = {
		all: { label: 'All', match: () => true },
		approved: { label: 'Approved', match: (s) => s === 'approved' || s === 'done' },
		pending: { label: 'Pending', match: (s) => s === 'submitted' || s === 'reviewed' },
		rejected: { label: 'Rejected', match: (s) => s === 'rejected' }
	};
	let forms = $state([]);
	let apps = $state([]);
	let loading = $state(true);
	let error = $state('');
	let q = $state('');
	let group = $state(GROUPS[page.url.searchParams.get('status')] ? page.url.searchParams.get('status') : 'all');
	let box;

	const formOf = (id) => forms.find((f) => f.id === id);
	const nameOf = (a) => studentName(formOf(a.formId), a) || '—';
	const day = (ms) => (ms ? new Date(ms).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '');
	const shown = $derived.by(() => {
		const t = q.trim().toLowerCase();
		return apps.filter((a) => GROUPS[group].match(a.status) && (!t || `${nameOf(a)} ${a.applicationNumber} ${formOf(a.formId)?.title || ''}`.toLowerCase().includes(t)));
	});
	const count = (k) => apps.filter((a) => GROUPS[k].match(a.status)).length;

	onMount(async () => {
		try {
			forms = await loadForms();
			apps = await loadAllApplications(forms);
			session.pending = count('pending');
		} catch (e) {
			error = e?.message || 'Could not load applications.';
		}
		loading = false;
		if (page.url.searchParams.get('focus')) box?.focus();
	});
</script>

<svelte:head><title>Applications — Elite Registration Hub</title></svelte:head>

<h1 class="pg-title">Applications</h1>
<label class="pg-search">
	<svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="11" cy="11" r="6.5" /><path d="M20 20l-4.2-4.2" /></svg>
	<input bind:this={box} type="search" placeholder="Search name, application number or form…" bind:value={q} />
</label>
<div class="chips">
	{#each Object.entries(GROUPS) as [k, g] (k)}
		<button type="button" class="chip" class:on={group === k} onclick={() => (group = k)}>{g.label}{#if !loading} <b>{count(k)}</b>{/if}</button>
	{/each}
</div>

{#if error}<div class="mb-3 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}
<div class="list">
	{#if loading}
		<p class="empty">Loading…</p>
	{:else if !shown.length}
		<p class="empty">No applications match.</p>
	{:else}
		{#each shown as a (a.id)}
			<a href="/admin/forms/{a.formId}/applications?q={encodeURIComponent(a.applicationNumber || '')}" class="row">
				<span class="who"><b>{nameOf(a)}</b><small>{formOf(a.formId)?.title || a.formId}</small></span>
				<span class="meta"><code>{a.applicationNumber}</code><em class="st st-{a.status}">{a.status}</em><small>{day(a.submittedAt)}</small></span>
			</a>
		{/each}
	{/if}
</div>

<style>
	.pg-title { margin: 0 0 .8rem; font-size: 1.9rem; font-weight: 800; color: var(--ink); }
	.pg-search { display: flex; align-items: center; gap: .7rem; padding: .8rem 1rem; border-radius: .95rem; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); color: var(--sub); }
	.pg-search:focus-within { border-color: var(--accent); }
	.pg-search input { flex: 1; min-width: 0; border: 0; outline: 0; background: transparent; color: var(--ink); font-size: 1.02rem; }
	.chips { display: flex; gap: .5rem; flex-wrap: wrap; margin: .8rem 0; }
	.chip { padding: .45rem .9rem; border-radius: 9999px; border: 1px solid var(--edge); background: var(--surface); color: var(--ink); font-weight: 600; font-size: .92rem; cursor: pointer; }
	.chip b { margin-left: .2rem; color: var(--sub); font-weight: 700; }
	.chip.on { background: #0f4a2b; border-color: #0f4a2b; color: #fff; }
	.chip.on b { color: #e6cd86; }
	.list { overflow: hidden; border-radius: 1rem; background: var(--surface); border: 1px solid var(--edge); box-shadow: var(--card-shadow); }
	.row { display: flex; align-items: center; justify-content: space-between; gap: .8rem; padding: .85rem 1rem; text-decoration: none; color: var(--ink); border-bottom: 1px solid var(--edge); }
	.row:last-child { border-bottom: 0; }
	.row:hover { background: var(--surface-2); }
	.who { display: flex; flex-direction: column; min-width: 0; }
	.who b { font-size: 1.05rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.who small, .meta small { color: var(--sub); font-size: .85rem; }
	.who small { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	.meta { flex: none; display: flex; flex-direction: column; align-items: flex-end; gap: .15rem; }
	.meta code { font-size: .78rem; color: #0f4a2b; font-weight: 700; }
	:global(html.dark) .meta code { color: #e6cd86; }
	.st { font-style: normal; padding: .05rem .6rem; border-radius: 9999px; font-size: .78rem; font-weight: 700; text-transform: capitalize; background: #fdeccd; color: #a2640a; }
	.st-approved, .st-done { background: #dcf3e2; color: #1a6b36; }
	.st-rejected { background: #fde2e2; color: #c02626; }
	.empty { margin: 0; padding: 1.4rem; text-align: center; color: var(--sub); }
</style>
