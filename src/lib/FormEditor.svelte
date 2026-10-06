<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
	import { firestore } from '$lib/firebase.js';
	import { FIELD_TYPES, OPTION_TYPES, newFieldId, slugify } from '$lib/forms.js';

	let { id = null } = $props();
	const isNew = !id; // eslint-disable-line

	let title = $state('');
	let description = $state('');
	let slug = $state('');
	let slugTouched = $state(false);
	let prefix = $state('');
	let prefixTouched = $state(false);
	let status = $state('active');
	let startDate = $state('');
	let closingDate = $state('');
	let allowEdits = $state(true);
	let fields = $state([]);
	let error = $state('');
	let busy = $state(false);
	let loading = $state(!isNew);
	let saved = $state(false);

	onMount(async () => {
		if (isNew) return;
		const snap = await getDoc(doc(firestore, 'forms', id));
		if (!snap.exists()) {
			error = 'Form not found.';
			loading = false;
			return;
		}
		const d = snap.data();
		({ title, description = '', status, startDate = '', closingDate = '', prefix } = d);
		slug = id;
		allowEdits = d.allowEdits ?? true;
		fields = (d.fields || []).map((f) => ({ ...f, optionsText: (f.options || []).join('\n') }));
		loading = false;
	});

	function onTitle() {
		if (isNew && !slugTouched) slug = slugify(title);
		if (isNew && !prefixTouched) prefix = slugify(title).toUpperCase().slice(0, 24);
	}

	function addField() {
		fields.push({ id: newFieldId(), type: 'text', label: '', required: true, placeholder: '', optionsText: '' });
	}
	function move(i, dir) {
		const j = i + dir;
		if (j < 0 || j >= fields.length) return;
		[fields[i], fields[j]] = [fields[j], fields[i]];
	}

	async function save() {
		error = '';
		saved = false;
		const cleanPrefix = prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '');
		if (!title.trim()) return (error = 'Form name is required.');
		if (!/^[a-z0-9-]{3,60}$/.test(slug)) return (error = 'Link slug must be 3–60 chars: lowercase letters, numbers, hyphens.');
		if (!cleanPrefix) return (error = 'Application number prefix is required.');
		if (!fields.length) return (error = 'Add at least one field.');
		if (startDate && closingDate && closingDate < startDate) return (error = 'Closing date is before start date.');

		const out = [];
		for (const f of fields) {
			if (!f.label.trim()) return (error = 'Every field needs a label.');
			const o = { id: f.id, type: f.type, label: f.label.trim(), required: !!f.required, placeholder: (f.placeholder || '').trim() };
			if (OPTION_TYPES.includes(f.type)) {
				o.options = [...new Set((f.optionsText || '').split('\n').map((s) => s.trim()).filter(Boolean))];
				if (o.options.length < 1) return (error = `"${o.label}" needs at least one option.`);
			}
			out.push(o);
		}

		busy = true;
		try {
			// prefix must be unique across forms (application numbers are global)
			const clash = await getDocs(query(collection(firestore, 'forms'), where('prefix', '==', cleanPrefix)));
			if (clash.docs.some((d) => d.id !== id)) throw new Error('Another form already uses that prefix.');

			const payload = { title: title.trim(), description: description.trim(), prefix: cleanPrefix, status, startDate, closingDate, allowEdits, fields: out, updatedAt: Date.now() };
			if (isNew) {
				const ref = doc(firestore, 'forms', slug);
				if ((await getDoc(ref)).exists()) throw new Error('That link slug is already taken.');
				await setDoc(ref, { ...payload, counter: 0, createdAt: Date.now() });
				await goto(`/admin/forms/${slug}`);
			} else {
				await updateDoc(doc(firestore, 'forms', id), payload); // never touches counter
				saved = true;
			}
		} catch (e) {
			error = e.message || 'Could not save.';
		}
		busy = false;
	}
</script>

{#if loading}
	<p class="text-slate-500">Loading…</p>
{:else}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">{isNew ? 'Create new form' : 'Manage form'}</h1>
		{#if !isNew}
			<a class="btn-ghost" href="/admin/forms/{id}/applications">View applications</a>
		{/if}
	</div>

	{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}
	{#if saved}<div class="mb-4 rounded-lg bg-green-50 p-3 text-sm text-green-800">Saved. Share link: <code>{location.origin}/register/{id}</code></div>{/if}

	<div class="card mb-6 grid gap-4 sm:grid-cols-2">
		<div class="sm:col-span-2">
			<label class="label" for="t">Form name</label>
			<input class="input" id="t" bind:value={title} oninput={onTitle} placeholder="FUOYE 2026 Registration" />
		</div>
		<div class="sm:col-span-2">
			<label class="label" for="d">Description</label>
			<textarea class="input" id="d" rows="2" bind:value={description}></textarea>
		</div>
		<div>
			<label class="label" for="s">Link slug</label>
			<input class="input" id="s" bind:value={slug} oninput={() => (slugTouched = true)} disabled={!isNew} placeholder="fuoye-2026" />
			<p class="mt-1 text-xs text-slate-500">/register/{slug || '…'}{isNew ? '' : ' (cannot be changed)'}</p>
		</div>
		<div>
			<label class="label" for="p">Application number prefix</label>
			<input class="input uppercase" id="p" bind:value={prefix} oninput={() => (prefixTouched = true)} placeholder="FUOYE-2026" />
			<p class="mt-1 text-xs text-slate-500">e.g. {(prefix || 'PREFIX').toUpperCase()}-0001</p>
		</div>
		<div>
			<label class="label" for="sd">Start date</label>
			<input class="input" id="sd" type="date" bind:value={startDate} />
		</div>
		<div>
			<label class="label" for="cd">Closing date</label>
			<input class="input" id="cd" type="date" bind:value={closingDate} />
		</div>
		<div>
			<label class="label" for="st">Status</label>
			<select class="input" id="st" bind:value={status}>
				<option value="active">Active</option>
				<option value="draft">Draft (hidden)</option>
				<option value="closed">Closed</option>
			</select>
		</div>
		<label class="flex items-center gap-2 self-end pb-2 text-sm">
			<input type="checkbox" bind:checked={allowEdits} class="accent-teal-700" /> Let applicants edit after submitting
		</label>
	</div>

	<h2 class="mb-3 text-lg font-semibold">Fields</h2>
	<div class="space-y-3">
		{#each fields as f, i (f.id)}
			<div class="card grid gap-3 sm:grid-cols-[1fr_1fr_auto]">
				<div>
					<label class="label" for="l{f.id}">Label</label>
					<input class="input" id="l{f.id}" bind:value={f.label} placeholder="Surname" />
				</div>
				<div>
					<label class="label" for="ty{f.id}">Field type</label>
					<select class="input" id="ty{f.id}" bind:value={f.type}>
						{#each FIELD_TYPES as t}<option value={t.value}>{t.label}</option>{/each}
					</select>
				</div>
				<div class="flex items-end gap-1">
					<button class="btn-ghost" onclick={() => move(i, -1)} disabled={i === 0} aria-label="Move up">↑</button>
					<button class="btn-ghost" onclick={() => move(i, 1)} disabled={i === fields.length - 1} aria-label="Move down">↓</button>
					<button class="btn-danger" onclick={() => fields.splice(i, 1)} aria-label="Remove field">✕</button>
				</div>
				{#if OPTION_TYPES.includes(f.type)}
					<div class="sm:col-span-3">
						<label class="label" for="o{f.id}">Options (one per line)</label>
						<textarea class="input" id="o{f.id}" rows="3" bind:value={f.optionsText}></textarea>
					</div>
				{/if}
				<label class="flex items-center gap-2 text-sm sm:col-span-3">
					<input type="checkbox" bind:checked={f.required} class="accent-teal-700" /> Required
				</label>
			</div>
		{/each}
	</div>
	<div class="mt-3"><button class="btn-ghost" onclick={addField}>+ Add field</button></div>

	<div class="mt-6 flex gap-2">
		<button class="btn" onclick={save} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create form' : 'Save changes'}</button>
		<a class="btn-ghost" href="/admin">Back</a>
	</div>
{/if}
