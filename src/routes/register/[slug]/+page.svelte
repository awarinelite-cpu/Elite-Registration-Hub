<script>
	import { onMount, onDestroy } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { MANAGED_QUIZ_FIELDS } from '$lib/forms.js';
	import FormFields from '$lib/FormFields.svelte';
	import { auth } from '$lib/firebase.js';
	import { addSaved, getSaved } from '$lib/savedLogins.js';
	let { data, form } = $props();
	let busy = $state(false);
	let copied = $state(false);
	let ready = $state(false);
	let formEl = $state();
	let timeUp = $state(false);
	let remaining = $state(0); // seconds left on a timed exam
	const isQuiz = data.form.kind === 'quiz';
	const isReg = !data.form.kind || data.form.kind === 'registration';
	const words = isReg ? { btn: 'SUBMIT APPLICATION' } : isQuiz ? { btn: 'SUBMIT' } : { btn: 'SUBMIT' };
	const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

	// quiz: name etc. first, then choose a mode and press Continue; the questions (and the clock) start after that
	const pre = isQuiz ? data.form.fields.filter((f) => !f.scored).map((f) => ({ ...f, required: !!f.required && MANAGED_QUIZ_FIELDS.includes(f.id) })) : [];
	const qs = isQuiz ? data.form.fields.filter((f) => f.scored) : [];
	const modes = data.form.modes || 'both';
	let mode = $state(modes === 'reading' ? 'reading' : 'exam');
	let started = $state(!isQuiz);
	let startError = $state('');
	let loadingAnswers = $state(false);
	let answers = $state(null);
	const preError = $derived(pre.some((f) => form?.errors?.[f.id]));
	let iv;

	async function start() {
		startError = '';
		const fd = new FormData(formEl);
		for (const f of pre) {
			if (f.required && !fd.getAll(`f_${f.id}`).some((v) => String(v).trim())) {
				startError = `Please fill in: ${f.label}`;
				document.getElementById(`f_${f.id}`)?.focus();
				return;
			}
		}
		if (mode === 'reading') {
			loadingAnswers = true;
			try {
				const r = await fetch(`/register/${data.form.id}/answers`);
				if (!r.ok) throw new Error();
				answers = await r.json();
			} catch {
				startError = 'Could not load Reading mode. Check your connection and try again.';
				loadingAnswers = false;
				return;
			}
			loadingAnswers = false;
		}
		started = true;
		window.scrollTo({ top: 0 });
		if (mode === 'exam' && data.form.timeLimit > 0) startTimer();
	}

	// the clock starts only now; the deadline is remembered so refreshing the page can't restart it
	function startTimer() {
		const key = `quizEnd:${data.form.id}`;
		let end = 0;
		try {
			end = Number(sessionStorage.getItem(key)) || 0;
		} catch {}
		if (end < Date.now() - 5 * 60000 || !end) end = Date.now() + data.form.timeLimit * 60000;
		try {
			sessionStorage.setItem(key, String(end));
		} catch {}
		const tick = () => {
			remaining = Math.max(0, Math.round((end - Date.now()) / 1000));
			if (remaining === 0 && !timeUp) {
				timeUp = true;
				clearInterval(iv);
				setTimeout(() => formEl?.requestSubmit(), 50);
			}
		};
		tick();
		iv = setInterval(tick, 1000);
	}
	onDestroy(() => clearInterval(iv));

	// Someone who already submitted this form on this device goes to the home (login) page instead.
	// "?new=1" (from the Submit another application card) skips that so they can fill a new form.
	onMount(async () => {
		// a signed-in admin / sub-admin previewing the form is never bounced to the student login page
		try {
			await auth.authStateReady();
		} catch {}
		const again = page.url.searchParams.get('new') === '1' || !!auth.currentUser;
		if (!again && !form?.success && getSaved().some((x) => x.formId === data.form.id)) {
			goto('/login', { replaceState: true });
			return;
		}
		ready = true;
	});

	$effect(() => {
		if (form?.success) {
			clearInterval(iv);
			try {
				sessionStorage.removeItem(`quizEnd:${data.form.id}`);
			} catch {}
		}
	});

	// remember the login on this device so the home page can fill it in next time
	$effect(() => {
		if (form?.success) addSaved({ number: form.applicationNumber, pin: form.pin, formId: data.form.id, title: form.title, name: form.name || '' });
	});

	async function copy(text) {
		await navigator.clipboard?.writeText(text);
		copied = true;
		setTimeout(() => (copied = false), 1500);
	}
</script>

<svelte:head><title>{data.form.title} — EliteReg</title></svelte:head>

<noscript><style>.pre-ready { visibility: visible !important; }</style></noscript>

<main class="pre-ready mx-auto max-w-2xl px-4 py-8 {ready ? '' : 'invisible'}">
	{#if form?.success}
		<div class="card text-center">
			<div class="mb-2 text-4xl">✅</div>
			<h1 class="text-xl font-bold">{form.kind === 'quiz' ? 'Quiz submitted' : form.kind === 'survey' ? 'Response submitted' : 'Application submitted'}</h1>
			<p class="mt-1 text-sm text-slate-600">{form.title}</p>

			{#if form.result}
				<div class="mt-4 rounded-xl border p-4 {form.result.passed === false ? 'border-red-200 bg-red-50' : 'border-green-200 bg-green-50'}">
					<div class="text-xs font-semibold uppercase tracking-wide text-slate-600">Your score</div>
					<div class="text-3xl font-bold">{form.result.score} / {form.result.total}</div>
					<div class="text-sm text-slate-700">
						{form.result.pct}%{#if form.result.passed === true} — Passed ✅{:else if form.result.passed === false} — Not passed{/if}
					{#if form.result.questions && form.result.answered < form.result.questions}<div class="mt-1 text-sm font-medium text-slate-700">{form.result.questions - form.result.answered} of {form.result.questions} questions not answered</div>{/if}
</div>
				</div>
			{/if}
			{#if form.review}
				<ul class="qreview mt-3 space-y-2 text-left text-sm">
					{#each form.review as r, i}
						<li class="rounded-lg border p-3 {r.unanswered ? 'border-slate-200' : r.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
							<div class="font-semibold">{r.unanswered ? '–' : r.ok ? '✓' : '✗'} {i + 1}. {r.label}</div>
							{#if r.unanswered}<div class="text-slate-600">Not answered</div>{:else}<div class="text-slate-700">Your answer: {r.given}</div>{/if}
							{#if !r.ok}<div class="text-slate-700">Correct answer: {r.answer}</div>{/if}
							{#if r.explanation}<div class="mt-1 text-xs text-slate-600">{r.explanation}</div>{/if}
						</li>
					{/each}
				</ul>
			{/if}

			<div class="mt-5 grid gap-3 text-left sm:grid-cols-2">
				<div class="rounded-lg bg-slate-100 p-3">
					<div class="text-xs text-slate-500">Application Number</div>
					<div class="font-mono text-lg font-bold">{form.applicationNumber}</div>
				</div>
				<div class="rounded-lg bg-slate-100 p-3">
					<div class="text-xs text-slate-500">Access PIN</div>
					<div class="font-mono text-lg font-bold">{form.pin}</div>
				</div>
			</div>
			<p class="mt-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
				Save both now: the PIN is shown only once and cannot be recovered. {form.kind && form.kind !== 'registration' ? 'You can log in later to see your submission.' : ''} They are also remembered on this device, so they fill in automatically when you come back.
			</p>
			<div class="mt-4 flex flex-wrap justify-center gap-2">
				<button class="btn-ghost" onclick={() => copy(`Application Number: ${form.applicationNumber}\nAccess PIN: ${form.pin}`)}>
					{copied ? 'Copied ✓' : 'Copy details'}
				</button>
				<button class="btn-ghost" onclick={() => window.print()}>Print</button>
				<a class="btn" href="/login">Go to login</a>
				<a class="btn-ghost" href="/register/{data.form.id}?new=1" data-sveltekit-reload>Submit another</a>
			</div>
		</div>
	{:else}
		<a href="/login" class="mb-4 flex items-center justify-between gap-3 rounded-xl border border-teal-200 bg-teal-50 p-3 text-sm text-teal-900">
			<span>Already submitted? Log in with your Application Number and PIN.</span>
			<span class="btn-ghost shrink-0 !px-3 !py-1">Log in</span>
		</a>

		<header class="mb-5">
			<h1 class="text-2xl font-bold">{data.form.title}</h1>
			{#if data.form.description}<p class="mt-1 text-slate-600">{data.form.description}</p>{/if}
		</header>

		{#if data.closed}
			<div class="card border-amber-300 bg-amber-50 text-amber-900">{data.closed}</div>
		{:else}
			{#if isQuiz && started && mode === 'exam' && data.form.timeLimit > 0}
				<div class="sticky top-2 z-10 mb-3 rounded-xl border px-4 py-2 text-center text-sm font-bold shadow {remaining <= 60 ? 'border-red-300 bg-red-50 text-red-700' : 'border-teal-300 bg-white text-teal-800'}">
					⏱ Time left: {clock(remaining)}
				</div>
			{:else if isQuiz && started && mode === 'reading'}
				<div class="mb-3 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-center text-sm font-semibold text-teal-800">📖 Reading mode — each answer is shown as soon as you choose</div>
			{/if}
			<form
				bind:this={formEl}
				method="POST"
				enctype="multipart/form-data"
				class="card space-y-4"
				use:enhance={({ formData, cancel }) => {
					if (isQuiz && !timeUp) {
						const left = qs.filter((f) => !formData.getAll(`f_${f.id}`).some((v) => String(v).trim())).length;
						if (left && !confirm(`You have ${left} unanswered question${left === 1 ? '' : 's'}. Submit anyway?`)) {
							cancel();
							return;
						}
					}
					busy = true;
					return async ({ update }) => {
						await update({ reset: false });
						busy = false;
						window.scrollTo({ top: 0, behavior: 'smooth' });
					};
				}}
			>
				{#if form?.message}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{form.message}</div>{/if}
				<input type="hidden" name="_timeup" value={timeUp ? '1' : ''} />
				<input type="hidden" name="_mode" value={mode} />
				{#if isQuiz}
					<div class={started && !preError ? 'hidden' : 'space-y-4'}>
						<FormFields big={!isReg} fields={pre} values={form?.values} errors={form?.errors} />
					</div>
					{#if !started}
						<div class="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
							<p class="text-sm text-slate-700">
								<strong>{qs.length}</strong> question{qs.length === 1 ? '' : 's'}.
								You can submit at any time, even if you haven't answered everything.
							</p>
							{#if modes === 'both'}
								<div class="text-sm font-semibold">Choose a mode</div>
								<label class="flex cursor-pointer gap-3 rounded-xl border p-3 {mode === 'exam' ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-white'}">
									<input type="radio" bind:group={mode} value="exam" class="mt-1 accent-teal-700" />
									<span class="text-sm"><strong>📝 Exam mode</strong><br />Answers are shown only after you submit.{#if data.form.timeLimit > 0} Timed: {data.form.timeLimit} minute{data.form.timeLimit === 1 ? '' : 's'}, starting when you press Continue.{/if}</span>
								</label>
								<label class="flex cursor-pointer gap-3 rounded-xl border p-3 {mode === 'reading' ? 'border-teal-600 bg-teal-50' : 'border-slate-300 bg-white'}">
									<input type="radio" bind:group={mode} value="reading" class="mt-1 accent-teal-700" />
									<span class="text-sm"><strong>📖 Reading mode</strong><br />The correct answer and explanation appear as soon as you choose an option. No timer.</span>
								</label>
							{:else if modes === 'reading'}
								<p class="text-sm"><strong>📖 Reading mode:</strong> the correct answer appears as soon as you choose an option.</p>
							{:else if data.form.timeLimit > 0}
								<p class="text-sm"><strong>📝 Exam mode:</strong> timed, {data.form.timeLimit} minute{data.form.timeLimit === 1 ? '' : 's'}. The clock starts when you press Continue.</p>
							{:else}
								<p class="text-sm"><strong>📝 Exam mode:</strong> answers are shown only after you submit.</p>
							{/if}
							{#if startError}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700">{startError}</div>{/if}
							<button type="button" class="btn w-full" onclick={start} disabled={loadingAnswers}>{loadingAnswers ? 'Loading…' : 'CONTINUE'}</button>
						</div>
					{:else}
						<FormFields big fields={qs} values={form?.values} errors={form?.errors} reading={mode === 'reading'} {answers} />
						<button class="btn w-full" disabled={busy}>{busy ? 'Submitting…' : words.btn}</button>
					{/if}
				{:else}
					<FormFields big={!isReg} fields={data.form.fields} values={form?.values} errors={form?.errors} />
					<button class="btn w-full" disabled={busy}>{busy ? 'Submitting…' : words.btn}</button>
				{/if}
			</form>
		{/if}

	{/if}
</main>
