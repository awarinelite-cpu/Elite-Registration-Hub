<script>
	import { parseQuizText, parseQuizCsv, looksLikeQuizCsv } from '$lib/parseQuiz.js';
	import { createForm } from '$lib/createForm.js';
	import { newFieldId, slugify, matricField, nameField, IDENT_MODES } from '$lib/forms.js';
	import { downloadCsv } from '$lib/csv.js';

	let text = $state('');
	let fileTitle = $state('');
	let parsed = $state(null);
	let nameMode = $state('optional');
	let matricMode = $state('optional');
	let showResult = $state('answers');
	let modes = $state('both');
	let passMark = $state('');
	let timeLimit = $state('');
	let busy = $state(false);
	let error = $state('');
	let created = $state(null);
	let copied = $state(false);

	const sample = '1. Which electrolyte is raised in renal failure?\nA. Sodium\nB. Potassium\nC. Calcium\nD. Chloride\nAnswer: B\n\n2. Select all signs of hypoglycaemia\nA. Sweating\nB. Tremors\nC. Polyuria\nAnswer: A, B';

	function parse() {
		error = '';
		const csv = looksLikeQuizCsv(text);
		const p = csv ? parseQuizCsv(text, fileTitle) : parseQuizText(text);
		if (p.error) return (error = p.error);
		if (!p.fields.length) return (error = 'No questions found. Each question needs a line of text followed by options like "A. …" and an "Answer: B" line.');
		parsed = p;
	}

	async function onFile(e) {
		const file = e.currentTarget.files?.[0];
		if (!file) return;
		error = '';
		fileTitle = file.name.replace(/\.[a-z0-9]+$/i, '').replace(/[-_]+/g, ' ').replace(/\s+/g, ' ').trim().replace(/\b\w/g, (c) => c.toUpperCase());
		text = await file.text();
		e.currentTarget.value = '';
		parse();
	}

	const missing = $derived(parsed ? parsed.fields.filter((f) => ![].concat(f.correct || []).length).length : 0);
	const isCorrect = (f, o) => [].concat(f.correct || []).includes(o);
	function toggle(f, o) {
		if (f.type === 'checkbox') {
			const l = [].concat(f.correct || []).filter(Boolean);
			f.correct = l.includes(o) ? l.filter((x) => x !== o) : [...l, o];
		} else f.correct = o;
	}
	function setType(f) {
		// switching to single answer keeps only the first correct option
		if (f.type !== 'checkbox' && Array.isArray(f.correct)) f.correct = f.correct[0] || '';
		if (f.type === 'checkbox' && !Array.isArray(f.correct)) f.correct = f.correct ? [f.correct] : [];
	}

	async function create() {
		error = '';
		if (!parsed.title.trim()) return (error = 'Quiz name is required.');
		if (missing) return (error = `${missing} question${missing === 1 ? ' has' : 's have'} no correct answer yet — tap the right option(s) on the amber cards.`);
		const fields = parsed.fields.map((f) => ({ ...f, required: false, points: Math.max(1, Number(f.points) || 1) }));
		if (matricMode !== 'off') fields.unshift(matricField(matricMode === 'required'));
		if (nameMode !== 'off') fields.unshift(nameField(nameMode === 'required'));
		const slug = slugify(parsed.slug) || 'quiz';
		const prefix = parsed.prefix.trim().toUpperCase().replace(/[^A-Z0-9-]/g, '') || 'QUIZ';
		const quiz = { nameMode, matricMode, askMatric: matricMode !== 'off', showResult, modes, passMark: Math.min(100, Math.max(0, Number(passMark) || 0)), timeLimit: Math.max(0, Number(timeLimit) || 0) };
		busy = true;
		try {
			const res = await createForm({ title: parsed.title.trim(), slug, prefix, fields, kind: 'quiz', quiz });
			created = { ...res, link: `${location.origin}/register/${res.slug}`, count: parsed.fields.length };
		} catch (e) {
			error = e.message || 'Could not create the quiz.';
		}
		busy = false;
	}

	function downloadTemplate() {
		downloadCsv('quiz-template.csv', [
			['question', 'option_a', 'option_b', 'option_c', 'option_d', 'answer', 'explanation', 'topic', 'marks', 'image'],
			['Which organ produces insulin?', 'Liver', 'Pancreas', 'Kidney', 'Spleen', 'B', 'Beta cells of the pancreas make insulin.', 'Physiology', '1', ''],
			['Which of these are vitamins? (select all that apply)', 'Vitamin C', 'Iron', 'Vitamin D', 'Calcium', 'A,C', 'Iron and calcium are minerals.', 'Nutrition', '2', ''],
			['Identify the structure shown in the picture.', 'Femur', 'Humerus', 'Tibia', 'Radius', 'A', '', 'Anatomy', '1', 'https://i.imgur.com/abc123.jpg']
		]);
	}
	async function copy() {
		await navigator.clipboard.writeText(created.link);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
	function reset() {
		text = '';
		parsed = null;
		created = null;
	}
</script>

<div class="mb-4 flex items-center justify-between">
	<h1 class="text-2xl font-bold">Create quiz from pasted questions</h1>
	<a href="/admin" class="btn-ghost">Back</a>
</div>

{#if error}<div class="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</div>{/if}

{#if created}
	<div class="card space-y-3 text-center">
		<div class="text-4xl">✅</div>
		<h2 class="text-lg font-bold">Quiz created</h2>
		<p class="text-sm text-slate-600">{parsed.title} · {created.count} questions · prefix {created.prefix}</p>
		<code class="block break-all rounded-lg bg-slate-100 p-3 text-sm">{created.link}</code>
		<div class="flex flex-wrap justify-center gap-2">
			<button class="btn" onclick={copy}>{copied ? 'Copied ✓' : 'Copy link'}</button>
			<a class="btn-ghost" href={created.link} target="_blank" rel="noreferrer">Open quiz</a>
			<a class="btn-ghost" href="/admin/forms/{created.slug}">Edit in builder</a>
			<a class="btn-ghost" href="/admin/forms/{created.slug}/applications">Results</a>
			<button class="btn-ghost" onclick={reset}>Create another</button>
		</div>
	</div>
{:else if !parsed}
	<div class="card space-y-3">
		<p class="text-sm text-slate-600">
			Paste your questions. Optional first line = quiz name. Each question: text, options (A. B. C. …), then <code>Answer: B</code> (or <code>Answer: A, C</code> for several). You can also mark the right option with a * or put an <code>Answers: 1.B 2.C</code> key at the end.
		</p>
		<textarea class="input font-mono" rows="16" bind:value={text} placeholder={'Pharmacology Quiz\n\n' + sample}></textarea>
		<div class="rounded-lg border border-dashed border-teal-300 bg-teal-50/60 p-3">
			<label class="label" for="qcsv">Or upload a CSV file</label>
			<input class="input file:mr-3 file:rounded file:border-0 file:bg-teal-100 file:px-3 file:py-1 file:text-teal-800" id="qcsv" type="file" accept=".csv,.txt,text/csv" onchange={onFile} />
			<p class="mt-1 text-xs text-slate-600">Columns: <code>question, option_a, option_b, option_c, option_d, answer</code> (letter such as B, or A,C for several), plus optional <code>explanation, topic, marks, image</code> (image = Imgur/ImgChest link). Extra columns like year are ignored.</p>
			<button type="button" class="btn-ghost mt-2 !px-3 !py-1 text-sm" onclick={downloadTemplate}>⬇ Download CSV template</button>
		</div>
		<div class="flex flex-wrap gap-2">
			<button class="btn" onclick={parse} disabled={!text.trim()}>Preview quiz</button>
			<button class="btn-ghost" onclick={() => (text = 'Sample Quiz\n\n' + sample)}>Use example</button>
		</div>
	</div>
{:else}
	<div class="mb-4 flex gap-2">
		<button class="btn" onclick={create} disabled={busy || !parsed.fields.length}>{busy ? 'Creating…' : 'Create quiz & get link'}</button>
		<button class="btn-ghost" onclick={() => (parsed = null)}>Back to text</button>
	</div>
	<div class="card mb-4 grid gap-4 sm:grid-cols-3">
		<div class="sm:col-span-3">
			<label class="label" for="qt">Quiz name</label>
			<input class="input" id="qt" bind:value={parsed.title} oninput={() => { parsed.slug = slugify(parsed.title) || 'quiz'; parsed.prefix = parsed.slug.toUpperCase().slice(0, 24); }} />
		</div>
		<div>
			<label class="label" for="qs">Link slug</label>
			<input class="input" id="qs" bind:value={parsed.slug} />
		</div>
		<div>
			<label class="label" for="qp">Number prefix</label>
			<input class="input uppercase" id="qp" bind:value={parsed.prefix} />
		</div>
		<div class="self-end pb-2 text-xs text-slate-500">If taken, a number is added automatically.</div>
		<div class="sm:col-span-3">
			<label class="label" for="qmd">Takers can use</label>
			<select class="input" id="qmd" bind:value={modes}>
				<option value="both">Both: they choose Exam or Reading mode</option>
				<option value="exam">Exam mode only</option>
				<option value="reading">Reading mode only</option>
			</select>
		</div>
		<div>
			<label class="label" for="qsr">After submitting, show</label>
			<select class="input" id="qsr" bind:value={showResult}>
				<option value="score">Score only</option>
				<option value="answers">Score + correct answers</option>
				<option value="none">Nothing</option>
			</select>
		</div>
		<div>
			<label class="label" for="qpm">Pass mark (%)</label>
			<input class="input" id="qpm" type="number" min="0" max="100" bind:value={passMark} placeholder="optional" />
		</div>
		<div>
			<label class="label" for="qtl">Time limit (min)</label>
			<input class="input" id="qtl" type="number" min="0" bind:value={timeLimit} placeholder="none" />
		</div>
		<div class="sm:col-span-3 grid gap-4 sm:grid-cols-2">
			<div>
				<label class="label" for="qnm">Full name box</label>
				<select class="input" id="qnm" bind:value={nameMode}>{#each IDENT_MODES as m}<option value={m.value}>{m.label}</option>{/each}</select>
			</div>
			<div>
				<label class="label" for="qmm">Matric number box</label>
				<select class="input" id="qmm" bind:value={matricMode}>{#each IDENT_MODES as m}<option value={m.value}>{m.label}</option>{/each}</select>
			</div>
		</div>
	</div>

	<h2 class="mb-2 font-semibold">
		{parsed.fields.length} questions detected{parsed.dropped ? ` (${parsed.dropped} skipped: fewer than 2 options)` : ''}
		{#if missing}<span class="text-amber-700"> · {missing} need a correct answer</span>{/if}
	</h2>
	<div class="space-y-2">
		{#each parsed.fields as f, i (f.id)}
			{@const none = ![].concat(f.correct || []).filter(Boolean).length}
			<div class="card space-y-2 !p-3 {none ? '!border-amber-400 !bg-amber-50' : ''}">
				<div class="flex items-start gap-2">
					<span class="mt-2 w-6 shrink-0 text-xs text-slate-400">{i + 1}</span>
					<textarea class="input min-w-0 flex-1" rows="2" bind:value={f.label} aria-label="Question"></textarea>
					<button class="btn-danger !px-2 !py-1" onclick={() => parsed.fields.splice(i, 1)} aria-label="Remove">✕</button>
				</div>
				{#if f.topic}<div class="text-xs font-medium text-teal-700">{f.topic}</div>{/if}
				<input class="input" type="url" placeholder="Image link (optional)" aria-label="Image link" bind:value={f.image} />
				<div class="flex flex-wrap gap-2">
					{#each f.options as o}
						<button type="button" class="rounded-lg border px-3 py-1.5 text-left text-sm {isCorrect(f, o) ? 'border-green-600 bg-green-600 font-semibold text-white' : 'border-slate-300 bg-white'}" onclick={() => toggle(f, o)}>
							{isCorrect(f, o) ? '✓ ' : ''}{o}
						</button>
					{/each}
				</div>
				<div class="flex flex-wrap items-center gap-3 text-xs">
					<label class="flex items-center gap-1">
						<select class="input !w-auto !py-1" bind:value={f.type} onchange={() => setType(f)}>
							<option value="radio">One correct answer</option>
							<option value="checkbox">Several correct answers</option>
						</select>
					</label>
					<label class="flex items-center gap-1">Marks <input class="input !w-16 !py-1" type="number" min="1" bind:value={f.points} /></label>
				</div>
			</div>
		{/each}
	</div>
	<p class="mt-2 text-xs text-slate-500">Tap an option to mark it correct (green). Amber cards still need an answer.</p>
	<div class="mt-4 flex gap-2">
		<button class="btn" onclick={create} disabled={busy || !parsed.fields.length}>{busy ? 'Creating…' : 'Create quiz & get link'}</button>
		<button class="btn-ghost" onclick={() => (parsed = null)}>Back to text</button>
	</div>
{/if}
