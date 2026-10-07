<script>
	import { onMount } from 'svelte';
	import { enhance } from '$app/forms';
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import FormFields from '$lib/FormFields.svelte';
	import { addSaved, getSaved } from '$lib/savedLogins.js';
	let { data, form } = $props();
	let busy = $state(false);
	let copied = $state(false);
	let ready = $state(false);
	let formEl = $state();
	let timeUp = $state(false);
	let remaining = $state(0); // seconds left on a timed quiz
	const isReg = $derived(!data.form.kind || data.form.kind === 'registration');
	const words = $derived(isReg ? { done: 'Application submitted', btn: 'SUBMIT APPLICATION' } : data.form.kind === 'quiz' ? { done: 'Quiz submitted', btn: 'SUBMIT QUIZ' } : { done: 'Response submitted', btn: 'SUBMIT' });
	const clock = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;

	// Someone who already submitted this form on this device goes to the home (login) page instead.
	// "?new=1" (from the Submit another application card) skips that so they can fill a new form.
	onMount(() => {
		const again = page.url.searchParams.get('new') === '1';
		if (!again && !form?.success && getSaved().some((x) => x.formId === data.form.id)) {
			goto('/login', { replaceState: true });
			return;
		}
		ready = true;
		// timed quiz: the deadline is remembered so refreshing the page doesn't restart the clock
		if (data.form.timeLimit > 0 && !data.closed && !form?.success) {
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
					setTimeout(() => formEl?.requestSubmit(), 50);
				}
			};
			tick();
			const iv = setInterval(tick, 1000);
			return () => clearInterval(iv);
		}
	});

	// remember the login on this device so the home page can fill it in next time
	$effect(() => {
		if (form?.success) {
			try {
				sessionStorage.removeItem(`quizEnd:${data.form.id}`);
			} catch {}
		}
	});

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
					</div>
				</div>
			{/if}
			{#if form.review}
				<ul class="mt-3 space-y-2 text-left text-sm">
					{#each form.review as r}
						<li class="rounded-lg border p-3 {r.ok ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}">
							<div class="font-semibold">{r.ok ? '✓' : '✗'} {r.label}</div>
							<div class="text-slate-700">Your answer: {r.given || '—'}</div>
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
			{#if data.form.timeLimit > 0}
				<div class="sticky top-2 z-10 mb-3 rounded-xl border px-4 py-2 text-center text-sm font-bold shadow {remaining <= 60 ? 'border-red-300 bg-red-50 text-red-700' : 'border-teal-300 bg-white text-teal-800'}">
					⏱ Time left: {clock(remaining)}
				</div>
			{/if}
			<form
				bind:this={formEl}
				method="POST"
				enctype="multipart/form-data"
				class="card space-y-4"
				use:enhance={() => {
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
				<FormFields fields={data.form.fields} values={form?.values} errors={form?.errors} />
				<button class="btn w-full" disabled={busy}>{busy ? 'Submitting…' : words.btn}</button>
			</form>
		{/if}

	{/if}
</main>
