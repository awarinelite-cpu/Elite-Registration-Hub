<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { adminFetch } from '$lib/adminSession.svelte.js';
	import { parseNotes, noteTitle } from '$lib/parseNotes.js';
	import NoteView from '$lib/NoteView.svelte';
	import { docxToNoteText } from '$lib/docxImport.js';

	let { id = null } = $props();
	let title = $state('');
	let titleTouched = $state(false);
	let text = $state('');
	let tab = $state('paste'); // paste | preview
	let busy = $state(false);
	let loading = $state(!!id);
	let error = $state('');
	let reading = $state(false);
	let fileName = $state('');

	const blocks = $derived(parseNotes(text));
	const suggested = $derived(noteTitle(text));

	onMount(async () => {
		if (!id) return;
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

	// Word document: read it in the browser and fill the note box (added below any text already there)
	async function onFile(e) {
		const input = e.currentTarget;
		const file = input.files?.[0];
		input.value = '';
		if (!file) return;
		error = '';
		reading = true;
		try {
			const t = await docxToNoteText(file);
			text = text.trim() ? `${text.replace(/\s+$/, '')}\n\n${t}` : t;
			fileName = file.name;
			if (!titleTouched && !noteTitle(text)) title = file.name.replace(/\.docx$/i, '');
			tab = 'preview';
		} catch (err) {
			error = err.message || 'Could not read that Word document.';
		}
		reading = false;
	}

	async function save() {
		error = '';
		const t = (title.trim() || suggested).trim();
		if (!text.trim()) return (error = 'Upload a Word document or paste your notes first.');
		if (!t) return (error = 'Give the note a title.');
		busy = true;
		try {
			const res = await adminFetch(id ? `/api/admin/notes/${id}` : '/api/admin/notes', { method: id ? 'PUT' : 'POST', body: JSON.stringify({ title: t, text }) });
			await goto(`/admin/notes/${id || res.id}`);
		} catch (e) {
			error = e.message || 'Could not save.';
		}
		busy = false;
	}
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
		<div class="flex flex-wrap items-center gap-2 rounded-[1.5rem] border border-teal-300 bg-teal-50 p-3">
			<label class="btn-3d btn-3d-lg cursor-pointer !rounded-full" class:opacity-60={reading}>
				{reading ? 'Reading document…' : '📄 Upload Word document (.docx)'}
				<input type="file" class="sr-only" accept=".docx,application/vnd.openxmlformats-officedocument.wordprocessingml.document" onchange={onFile} disabled={reading} />
			</label>
			<span class="min-w-0 text-xs text-slate-600">{fileName ? `Loaded: ${fileName}. ` : ''}Headings, lists and tables are kept; pictures are skipped. You can edit the text before saving.</span>
		</div>
		<div class="flex gap-2">
			<button type="button" class={tab === 'paste' ? 'btn !px-4 !py-2' : 'btn-ghost !px-4 !py-2'} onclick={() => (tab = 'paste')}>Paste</button>
			<button type="button" class={tab === 'preview' ? 'btn !px-4 !py-2' : 'btn-ghost !px-4 !py-2'} onclick={() => (tab = 'preview')}>Notebook preview</button>
		</div>
		{#if tab === 'paste'}
			<p class="text-xs text-slate-600">
				Upload a Word document above, or paste the whole note. Headings, sub-headings, small headings and the “Term:” at the front of a line become bold and underlined; text is justified. Tables copied from Word keep their rows and columns.
			</p>
			<textarea class="input font-mono" rows="18" bind:value={text} placeholder={'UNIT I: INTRODUCTION TO COMPUTERS\n1.1 Definition of a Computer\nA computer is an electronic device...\nKey characteristics of a computer\nSpeed - performs millions of instructions per second.'}></textarea>
		{:else}
			<div class="rounded-xl border border-slate-200 p-4">
				{#if blocks.length}<NoteView {blocks} />{:else}<p class="text-sm text-slate-500">Nothing to preview yet.</p>{/if}
			</div>
		{/if}
		<div class="flex flex-wrap gap-2">
			<button class="btn" onclick={save} disabled={busy || !text.trim()}>{busy ? 'Saving…' : id ? 'Save changes' : 'Save to notebook'}</button>
			<span class="self-center text-xs text-slate-500">{text.length.toLocaleString()} characters · {blocks.length} blocks</span>
		</div>
	</div>
{/if}
