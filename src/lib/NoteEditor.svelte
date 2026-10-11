<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { adminFetch } from '$lib/adminSession.svelte.js';
	import { parseNotes, noteTitle } from '$lib/parseNotes.js';
	import NoteView from '$lib/NoteView.svelte';
	import { noteHandoff } from '$lib/quizImport.js';
	import { stamp } from '$lib/dateFmt.js';

	let { id = null } = $props();
	let title = $state('');
	let titleTouched = $state(false);
	let text = $state('');
	let tab = $state('paste'); // paste | preview
	let busy = $state(false);
	let loading = $state(!!id);
	let error = $state('');
	let dup = $state(null); // notes that look the same as this one, waiting for Accept / Reject

	const blocks = $derived(parseNotes(text));
	const suggested = $derived(noteTitle(text));

	onMount(async () => {
		if (!id) {
			// a Word document chosen on the dashboard arrives ready to preview
			if (noteHandoff.text) {
				text = noteHandoff.text;
				if (!noteTitle(text)) title = noteHandoff.fileTitle;
				noteHandoff.text = '';
				noteHandoff.fileTitle = '';
				tab = 'preview';
			}
			return;
		}
		try {
			const n = await adminFetch(`/api/admin/notes/${id}`);
			title = n.title;
			text = n.text;
			titleTouched = true;
		} catch (e) {
			error = e.message;
		}
		loading = false;
	});

	// column widths dragged in the preview are stored as a {{cols: ...}} line right before the table's first row
	function setWidths(b, widths) {
		const lines = text.replace(/\r/g, '').split('\n');
		if (!widths) {
			if (b.marker >= 0) lines.splice(b.marker, 1);
		} else {
			const m = `{{cols: ${widths.join(', ')}}}`;
			if (b.marker >= 0) lines[b.marker] = m;
			else lines.splice(b.line, 0, m);
		}
		text = lines.join('\n');
	}

	// editing the title or text clears an earlier duplicate warning
	$effect(() => {
		text;
		title;
		dup = null;
	});

	async function save(force = false) {
		error = '';
		const t = (title.trim() || suggested).trim();
		if (!text.trim()) return (error = 'Paste your notes first.');
		if (!t) return (error = 'Give the note a title.');
		busy = true;
		try {
			// a new note is checked against the ones already saved; the admin accepts or rejects a match
			if (!id && !force) {
				const r = await adminFetch('/api/admin/notes/check', { method: 'POST', body: JSON.stringify({ title: t, text }) });
				if (r.matches.length) {
					dup = r.matches;
					busy = false;
					return;
				}
			}
			const res = await adminFetch(id ? `/api/admin/notes/${id}` : '/api/admin/notes', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ title: t, text }) });
			await goto(`/admin/notes/${id || res.id}`);
		} catch (e) {
			error = e.message || 'Could not save.';
		}
		busy = false;
	}

	const why = (m) => (m.reason === 'identical' ? 'Identical content' : m.reason === 'near' ? `${m.percent}% the same content` : 'Same title');
</script>

<div class="mb-4 flex items-center justify-between gap-2">
	<h1 class="text-2xl font-bold">{id ? 'Edit note' : 'Add notes'}</h1>
	<a href={id ? `/admin/notes/${id}` : '/admin/notes'} class="btn-ghost">Back</a>
</div>

{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="card space-y-3">
		<div>
			<label class="label" for="nt">Title</label>
			<input class="input" id="nt" value={titleTouched ? title : title || suggested} oninput={(e) => { title = e.currentTarget.value; titleTouched = true; }} placeholder="Nursing Informatics (GNS 420)" />
		</div>
		<div class="flex flex-wrap items-center gap-2">
			<button type="button" class={tab === 'paste' ? 'btn !px-4 !py-2' : 'btn-ghost !px-4 !py-2'} onclick={() => (tab = 'paste')}>Paste</button>
			<button type="button" class={tab === 'preview' ? 'btn !px-4 !py-2' : 'btn-ghost !px-4 !py-2'} onclick={() => (tab = 'preview')}>Notebook preview</button>
			<button type="button" class="btn-3d !px-4 !py-2" onclick={() => save()} disabled={busy || !text.trim()}>{busy ? 'Saving…' : id ? 'Save changes' : 'Save'}</button>
		</div>
		{#if tab === 'paste'}
			<p class="text-xs text-slate-600">
				Paste the whole note. Headings, sub-headings, small headings and the “Term:” at the front of a line become bold and underlined; text is justified. Tables copied from Word keep their rows and columns.
			</p>
			<textarea class="input font-mono" rows="18" bind:value={text} placeholder={'UNIT I: INTRODUCTION TO COMPUTERS\n1.1 Definition of a Computer\nA computer is an electronic device...\nKey characteristics of a computer\nSpeed - performs millions of instructions per second.'}></textarea>
		{:else}
			<div class="rounded-xl border border-slate-200 p-4">
				{#if blocks.length}<NoteView {blocks} editable onwidths={setWidths} />{:else}<p class="text-sm text-slate-500">Nothing to preview yet.</p>{/if}
			</div>
		{/if}
		{#if dup}
			<div class="space-y-3 rounded-[1.5rem] border border-amber-300 bg-amber-50 p-4 text-amber-900">
				<div class="font-semibold">⚠ This looks like a note you already uploaded</div>
				<ul class="space-y-2 text-sm">
					{#each dup as m (m.id)}
						<li class="flex flex-wrap items-center justify-between gap-2 rounded-full bg-white/70 px-4 py-2">
							<span class="min-w-0"><span class="font-semibold">{m.title}</span> · {why(m)} · uploaded {stamp(m.createdAt)}</span>
							<a class="underline" href="/admin/notes/{m.id}" target="_blank" rel="noopener">View</a>
						</li>
					{/each}
				</ul>
				<div class="flex flex-wrap gap-2">
					<button type="button" class="btn-3d btn-3d-lg !rounded-full" onclick={() => save(true)} disabled={busy}>{busy ? 'Saving…' : 'Accept – save anyway'}</button>
					<button type="button" class="btn-3d-ghost btn-3d-lg !rounded-full" onclick={() => goto('/admin/notes')} disabled={busy}>Reject – don't save</button>
				</div>
			</div>
		{/if}
		<div class="flex flex-wrap gap-2">
			<button class="btn" onclick={() => save()} disabled={busy || !text.trim()}>{busy ? 'Saving…' : id ? 'Save changes' : 'Save to notebook'}</button>
			<span class="self-center text-xs text-slate-500">{text.length.toLocaleString()} characters · {blocks.length} blocks</span>
		</div>
	</div>
{/if}
