<script>
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';
	import { collection, doc, getDoc, getDocs, query, setDoc, updateDoc, where } from 'firebase/firestore';
	import { auth, firestore } from '$lib/firebase.js';
	import { adminFetch } from '$lib/adminSession.svelte.js';
	import { FIELD_TYPES, FORM_KINDS, OPTION_TYPES, newFieldId, slugify, MATRIC_FIELD_ID, STUDENT_NAME_ID, IDENT_MODES, matricField, nameField, SCRATCH_FIELD_ID, SSCE_FIELD_ID, ensureUploadFields } from '$lib/forms.js';

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
	let kind = $state('registration'); // registration | quiz | survey
	let quiz = $state({ showResult: 'answers', modes: 'both', passMark: '', timeLimit: '' });
	let nameMode = $state('off'); // quiz settings: off | optional | required, for the Full name and Matric number boxes before the exam
	let matricMode = $state('off');
	const MANAGED = [STUDENT_NAME_ID, MATRIC_FIELD_ID];
	const toEditor = (f) => ({ ...f, optionsText: (f.options || []).join('\n'), correctList: Array.isArray(f.correct) ? [...f.correct] : f.correct ? [f.correct] : [], points: f.points ?? 1 });
	const optionLines = (f) => [...new Set((f.optionsText || '').split('\n').map((s) => s.trim()).filter(Boolean))];
	function toggleCorrect(f, o) {
		const l = f.correctList || [];
		f.correctList = f.type === 'checkbox' ? (l.includes(o) ? l.filter((x) => x !== o) : [...l, o]) : [o];
	}
	let fields = $state([]);
	let error = $state('');
	let busy = $state(false);
	let loading = $state(!isNew);
	let saved = $state(false);
	let converted = $state(false);

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
		kind = d.kind || 'registration';
		quiz = { showResult: d.quiz?.showResult || 'answers', modes: d.quiz?.modes || 'both', passMark: d.quiz?.passMark || '', timeLimit: d.quiz?.timeLimit || '' };
		const mode = (id, saved, legacyOn) => {
			if (saved) return saved;
			const f = (d.fields || []).find((x) => x.id === id);
			return f ? (f.required ? 'required' : 'optional') : legacyOn ? 'optional' : 'off';
		};
		nameMode = mode(STUDENT_NAME_ID, d.quiz?.nameMode, false);
		matricMode = mode(MATRIC_FIELD_ID, d.quiz?.matricMode, d.quiz?.askMatric);
		fields = (d.fields || []).filter((f) => !MANAGED.includes(f.id)).map(toEditor); // managed by the settings
		loading = false;
		// old forms: swap separate scratch card / SSCE year boxes for the grouped SCRATCH CARD INFO field automatically
		if (legacyScratch.length) {
			convertScratch();
			converted = true;
		}
		if (legacySsce.length) {
			convertSsce();
			converted = true;
		}
		// forms with no passport photograph / softcopy documents upload get them added
		const ensured = ensureUploadFields(fields.map(({ optionsText, correctList, ...f }) => f), { uploads: kind === 'registration' });
		if (ensured.map((f) => f.id).join() !== fields.map((f) => f.id).join()) {
			fields = ensured.map(toEditor);
			converted = true;
		}
	});

	function onTitle() {
		if (isNew && !slugTouched) slug = slugify(title);
		if (isNew && !prefixTouched) prefix = slugify(title).toUpperCase().slice(0, 24);
	}

	function addField() {
		fields.push({ id: newFieldId(), type: kind === 'quiz' ? 'radio' : 'text', label: '', required: true, placeholder: '', optionsText: '', correctList: [], points: 1 });
	}
	const legacyScratch = $derived(fields.filter((f) => f.type !== 'scratchcards' && /scratch|ssce\s*year/i.test(f.label || '')));
	function convertScratch() {
		const firstIdx = fields.findIndex((f) => legacyScratch.includes(f));
		const before = fields.slice(0, firstIdx).filter((f) => !legacyScratch.includes(f)).length;
		const keep = fields.filter((f) => !legacyScratch.includes(f));
		keep.splice(before, 0, { id: SCRATCH_FIELD_ID, type: 'scratchcards', label: 'SCRATCH CARD INFO', required: true, placeholder: '', optionsText: '' });
		fields = keep;
	}
	const legacySsce = $derived(fields.filter((f) => f.type !== 'ssceexams' && /ssce\s*exam\s*(number|no)/i.test(f.label || '')));
	function convertSsce() {
		const idx = fields.findIndex((f) => legacySsce.includes(f));
		if (idx < 0) return;
		const old = fields[idx];
		fields[idx] = { id: SSCE_FIELD_ID, type: 'ssceexams', label: old.label || 'SSCE EXAM NUMBER', required: old.required !== false, placeholder: '', optionsText: '' };
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
			if (kind !== 'registration' && (f.image || '').trim()) {
				if (!/^https?:\/\//i.test(f.image.trim())) return (error = `Image link for "${o.label}" must start with http:// or https://`);
				o.image = f.image.trim();
			}
			if (OPTION_TYPES.includes(f.type)) {
				o.options = [...new Set((f.optionsText || '').split('\n').map((s) => s.trim()).filter(Boolean))];
				if (o.options.length < 1) return (error = `"${o.label}" needs at least one option.`);
				if (kind === 'quiz') {
					const corr = (f.correctList || []).filter((x) => o.options.includes(x));
					if (!corr.length) return (error = `"${o.label}" needs a correct answer — tap one of its options below.`);
					o.correct = f.type === 'checkbox' ? corr : corr[0];
					o.required = false; // takers can submit an unfinished quiz
					o.points = Math.max(1, Number(f.points) || 1);
					if ((f.explanation || '').trim()) o.explanation = f.explanation.trim();
					if ((f.topic || '').trim()) o.topic = f.topic.trim();
				}
			}
			out.push(o);
		}

		if (kind === 'quiz') {
			const at = out.findIndex((f) => f.correct && (!Array.isArray(f.correct) || f.correct.length));
			const pre = [nameMode !== 'off' && nameField(nameMode === 'required'), matricMode !== 'off' && matricField(matricMode === 'required')].filter(Boolean);
			out.splice(at < 0 ? out.length : at, 0, ...pre);
		}

		busy = true;
		try {
			// prefix must be unique across forms (application numbers are global)
			const chk = await adminFetch(`/api/admin/check?prefix=${encodeURIComponent(cleanPrefix)}&exceptId=${encodeURIComponent(id || '')}${isNew ? `&slug=${encodeURIComponent(slug)}` : ''}`);
			if (chk.prefixTaken) throw new Error('Another form already uses that prefix.');
			if (isNew && chk.slugTaken) throw new Error('That link slug is already taken.');

			const payload = { title: title.trim(), description: description.trim(), prefix: cleanPrefix, status, startDate, closingDate, allowEdits: kind === 'registration' ? allowEdits : false, kind, quiz: kind === 'quiz' ? { nameMode, matricMode, askMatric: matricMode !== 'off', showResult: quiz.showResult, modes: quiz.modes, passMark: Math.min(100, Math.max(0, Number(quiz.passMark) || 0)), timeLimit: Math.max(0, Number(quiz.timeLimit) || 0) } : null, fields: out, updatedAt: Date.now() };
			if (isNew) {
				const ref = doc(firestore, 'forms', slug);
				await setDoc(ref, { ...payload, ownerId: auth.currentUser.uid, counter: 0, createdAt: Date.now() });
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
	{#if converted}
		<div class="mb-4 rounded-lg border border-teal-300 bg-teal-50 p-3 text-sm font-semibold text-teal-900">
			This form was updated with SCRATCH CARD INFO (WAEC/NECO) and/or passport photograph and softcopy document (SSCE, birth certificate/age declaration, secondary testimonial) upload fields. Scroll down and tap "Save changes" to apply it to the live form.
		</div>
	{/if}
	<div class="mb-4 flex flex-wrap items-center justify-between gap-2">
		<h1 class="text-2xl font-bold">{isNew ? 'Create new form' : 'Manage form'}</h1>
		{#if !isNew}
			<a class="btn" href="/register/{id}?new=1" target="_blank" rel="noreferrer">👁 View {kind === 'quiz' ? 'quiz' : kind === 'survey' ? 'survey' : 'form'}</a>
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
		<div class="sm:col-span-2">
			<label class="label" for="k">Form type</label>
			<select class="input" id="k" bind:value={kind}>
				{#each FORM_KINDS as k}<option value={k.value}>{k.label}</option>{/each}
			</select>
			{#if kind !== 'registration'}
				<p class="mt-1 text-xs text-slate-500">No passport photo or document uploads are added, and people can't change answers after submitting.</p>
			{/if}
		</div>
		{#if kind === 'registration'}
			<label class="flex items-center gap-2 self-end pb-2 text-sm">
				<input type="checkbox" bind:checked={allowEdits} class="accent-teal-700" /> Let applicants edit after submitting
			</label>
		{/if}
		{#if kind === 'quiz'}
			<div class="sm:col-span-2">
				<label class="label" for="qm">Takers can use</label>
				<select class="input" id="qm" bind:value={quiz.modes}>
					<option value="both">Both: they choose Exam or Reading mode</option>
					<option value="exam">Exam mode only (answers after submit)</option>
					<option value="reading">Reading mode only (answer shown as they choose)</option>
				</select>
			</div>
			<div>
				<label class="label" for="sr">After submitting, show</label>
				<select class="input" id="sr" bind:value={quiz.showResult}>
					<option value="score">Score only</option>
					<option value="answers">Score + correct answers</option>
					<option value="none">Nothing (admin sees results)</option>
				</select>
			</div>
			<div class="grid grid-cols-2 gap-3">
				<div>
					<label class="label" for="pm">Pass mark (%)</label>
					<input class="input" id="pm" type="number" min="0" max="100" bind:value={quiz.passMark} placeholder="optional" />
				</div>
				<div>
					<label class="label" for="tl">Time limit (min)</label>
					<input class="input" id="tl" type="number" min="0" bind:value={quiz.timeLimit} placeholder="none" />
				</div>
			</div>
			<div>
				<label class="label" for="nm">Full name box</label>
				<select class="input" id="nm" bind:value={nameMode}>{#each IDENT_MODES as m}<option value={m.value}>{m.label}</option>{/each}</select>
			</div>
			<div>
				<label class="label" for="mm">Matric number box</label>
				<select class="input" id="mm" bind:value={matricMode}>{#each IDENT_MODES as m}<option value={m.value}>{m.label}</option>{/each}</select>
			</div>
			<p class="text-xs text-slate-500 sm:col-span-2">Add a "Short text" Name field so you can tell who took it. In each multiple-choice question, tap the correct option(s). Answers are never sent to the quiz page.</p>
		{/if}
	</div>
	<div class="mb-6 -mt-3 flex flex-wrap items-center gap-3">
		<button class="btn" onclick={save} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create form' : '💾 Save settings'}</button>
		{#if saved}<span class="text-sm font-medium text-green-700">✓ Saved</span>{/if}
		{#if error}<span class="text-sm text-red-600">{error}</span>{/if}
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
				{#if kind !== 'registration'}
					<div class="sm:col-span-3">
						<label class="label" for="im{f.id}">Image link (optional — Imgur / ImgChest direct link)</label>
						<input class="input" id="im{f.id}" type="url" placeholder="https://i.imgur.com/abc123.jpg" bind:value={f.image} />
					</div>
				{/if}
				{#if OPTION_TYPES.includes(f.type)}
					<div class="sm:col-span-3">
						<label class="label" for="o{f.id}">Options (one per line)</label>
						<textarea class="input" id="o{f.id}" rows="3" bind:value={f.optionsText}></textarea>
					</div>
					{#if kind === 'quiz'}
						<div class="sm:col-span-3">
							<div class="label">{f.type === 'checkbox' ? 'Correct answers (tap all that apply)' : 'Correct answer (tap one)'}</div>
							<div class="flex flex-wrap gap-2">
								{#each optionLines(f) as o}
									<button type="button" class="rounded-lg border px-3 py-1.5 text-sm {(f.correctList || []).includes(o) ? 'border-green-600 bg-green-600 font-semibold text-white' : 'border-slate-300 bg-white'}" onclick={() => toggleCorrect(f, o)}>
										{(f.correctList || []).includes(o) ? '✓ ' : ''}{o}
									</button>
								{:else}
									<span class="text-xs text-slate-500">Type the options above first.</span>
								{/each}
							</div>
							<label class="mt-2 flex items-center gap-2 text-sm">Marks <input class="input !w-20 !py-1" type="number" min="1" bind:value={f.points} /></label>
							<textarea class="input mt-2" rows="2" placeholder="Explanation (shown after submitting if you show correct answers)" bind:value={f.explanation}></textarea>
						</div>
					{/if}
				{/if}
				<label class="flex items-center gap-2 text-sm sm:col-span-3">
					<input type="checkbox" bind:checked={f.required} class="accent-teal-700" /> Required
				</label>
			</div>
		{/each}
	</div>
	<div class="mt-3 flex flex-wrap gap-2">
		<button class="btn-ghost" onclick={addField}>+ Add field</button>
		{#if legacyScratch.length}
			<button class="btn-ghost" onclick={convertScratch}>Replace {legacyScratch.length} scratch card / SSCE year field{legacyScratch.length === 1 ? '' : 's'} with SCRATCH CARD INFO</button>
		{/if}
		{#if legacySsce.length}
			<button class="btn-ghost" onclick={convertSsce}>Replace SSCE exam number box with exam type / number / year</button>
		{/if}
	</div>

	<div class="mt-6 flex gap-2">
		<button class="btn" onclick={save} disabled={busy}>{busy ? 'Saving…' : isNew ? 'Create form' : 'Save changes'}</button>
		<a class="btn-ghost" href="/admin">Back</a>
	</div>
{/if}
