<script>
	import { enhance } from '$app/forms';
	import { tick } from 'svelte';
	import Screen from './Screen.svelte';
	import Icon from './Icon.svelte';
	import Crest from './Crest.svelte';
	import FormFields from '../FormFields.svelte';
	import { wizardSteps, isExam } from '../sections.js';
	// The "New Application" flow: Personal → Academic → Contact → Review & Submit.
	// All steps stay in one <form> (hidden steps are still posted), so the server-side submit is unchanged.
	let { data, form } = $props();
	const f0 = data.form;
	const fields = f0.fields;
	const byId = Object.fromEntries(fields.map((f) => [f.id, f]));
	const steps = wizardSteps(fields);
	const last = steps.length - 1;

	let step = $state(0);
	let busy = $state(false);
	let formEl = $state();
	let stepError = $state('');
	let summary = $state([]);
	const hasExam = fields.some(isExam);
	const softcopy = f0.softcopy?.length ? f0.softcopy : true;

	function scrollTop() {
		window.scrollTo({ top: 0, behavior: 'smooth' });
	}
	// first required, empty field of a step (exam sittings and uploads are checked by the server on submit)
	function missing(i) {
		const fd = new FormData(formEl);
		for (const id of steps[i].ids) {
			const f = byId[id];
			if (!f?.required || isExam(f)) continue;
			const vals = fd.getAll(`f_${f.id}`);
			if (!vals.some((v) => String(v).trim())) return f;
		}
		return null;
	}
	function snapshot() {
		const fd = new FormData(formEl);
		summary = fields
			.filter((f) => f.type !== 'file' && f.type !== 'photo' && !isExam(f))
			.map((f) => ({ label: f.label, value: fd.getAll(`f_${f.id}`).map(String).filter((v) => v.trim()).join(', ') }))
			.filter((r) => r.value);
	}
	async function go(i) {
		step = i;
		stepError = '';
		if (i === last) snapshot();
		await tick();
		scrollTop();
	}
	function next() {
		const m = missing(step);
		if (m) {
			stepError = `Please fill in: ${m.label}`;
			document.getElementById(`f_${m.id}`)?.focus();
			return;
		}
		go(step + 1);
	}
	const prev = () => go(step - 1);
	function submit() {
		const m = missing(last);
		if (m) {
			stepError = `Please fill in: ${m.label}`;
			document.getElementById(`f_${m.id}`)?.focus();
			return;
		}
		stepError = '';
		formEl.requestSubmit();
	}
	// Enter inside a text box moves to the next step instead of submitting half a form
	function onkey(e) {
		if (e.key === 'Enter' && step < last && e.target instanceof HTMLInputElement && formEl?.contains(e.target)) {
			e.preventDefault();
			next();
		}
	}
	// the server found a problem: show the step that holds the first offending field
	$effect(() => {
		const errs = form?.errors;
		if (!errs) return;
		const id = Object.keys(errs).find((k) => byId[k]);
		const i = id ? steps.findIndex((s) => s.ids.includes(id)) : -1;
		if (i >= 0 && i !== step) go(i);
	});
</script>

<svelte:window onkeydown={onkey} />

<Screen title="New Application" back={step === 0 ? '/home' : null} onback={step > 0 ? prev : null}>
	{#snippet hero()}
		<section class="sv-uni">
			<Crest size={52} />
			<div style="min-width:0">
				<h2>{f0.title}</h2>
				<p>Online Registration Form</p>
			</div>
		</section>
	{/snippet}

	<form
		bind:this={formEl}
		method="POST"
		enctype="multipart/form-data"
		class="sv-fields"
		use:enhance={() => {
			busy = true;
			return async ({ update }) => {
				await update({ reset: false });
				busy = false;
				scrollTop();
			};
		}}
	>
		<ol class="sv-steps" aria-label="Progress">
			{#each steps as s, i}
				<li class="sv-step" class:on={i === step} class:done={i < step} aria-current={i === step ? 'step' : undefined}>
					<span class="n">{#if i < step}<Icon name="check" size={15} stroke={3} />{:else}{i + 1}{/if}</span>
					{s.title.replace(' & ', ' & ')}
				</li>
			{/each}
		</ol>

		{#if form?.message}<div class="sv-note err"><Icon name="info" size={18} class="ico" /><span>{form.message}</span></div>{/if}
		{#if stepError}<div class="sv-note err" role="alert"><Icon name="info" size={18} class="ico" /><span>{stepError}</span></div>{/if}

		{#each steps as s, i}
			<div class="sv-fields" hidden={step !== i}>
				<div>
					<h2 class="sv-h2">{s.title}</h2>
					{#if s.hint}<p class="sv-sub">{s.hint}</p>{/if}
				</div>

				{#if s.key === 'review' && summary.length}
					<div class="sv-card" style="padding:4px 14px">
						<p class="sv-sub" style="padding:10px 0 2px;font-weight:600">Your details</p>
						{#each summary as r}
							<div class="sv-kv" style="align-items:flex-start;justify-content:space-between;padding:9px 0">
								<span class="k" style="max-width:45%">{r.label}</span>
								<span class="v" style="font-size:13px;text-align:right;word-break:break-word">{r.value}</span>
							</div>
						{/each}
					</div>
				{/if}

				{#if s.key === 'review' && hasExam}
					<div class="sv-examhead">
						<span class="sv-tile"><Icon name="file-text" size={18} /></span>
						<div><b>WAEC/NECO Details</b><span class="sv-sub">Enter your scratch card information carefully.</span></div>
					</div>
				{/if}

				<FormFields {fields} only={s.ids} icons={s.key !== 'review'} values={form?.values} errors={form?.errors} formId={f0.id} softcopyNote={s.key === 'review' ? softcopy : false} />

				{#if s.key === 'review'}
					<div class="sv-note info">
						<Icon name="info" size={18} class="ico" />
						<span>Your application number will be generated after successful submission. Use it to login and view or edit your form later.</span>
					</div>
				{/if}
			</div>
		{/each}
	</form>

	{#snippet footer()}
		{#if step > 0}<button type="button" class="sv-btn ghost" onclick={prev}>Back</button>{/if}
		{#if step < last}
			<button type="button" class="sv-btn" onclick={next}>Next <Icon name="arrow-right" size={16} /></button>
		{:else}
			<button type="button" class="sv-btn" disabled={busy} onclick={submit}>{busy ? 'Submitting…' : 'Submit Application'}</button>
		{/if}
	{/snippet}
</Screen>
