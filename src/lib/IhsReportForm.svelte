<script>
	import { REPORT_FIELDS, blankReport, cleanReport, validateReport } from '$lib/ihs.js';

	// onsave(report) must throw to show an error; the parent navigates away on success.
	let { initial = null, onsave, submitLabel = 'Save report' } = $props();
	let values = $state({ ...blankReport(), ...(initial || {}) });
	let error = $state('');
	let busy = $state(false);

	async function submit(e) {
		e.preventDefault();
		const data = cleanReport(values);
		error = validateReport(data);
		if (error) return;
		busy = true;
		try {
			await onsave(data);
		} catch (err) {
			error = err?.message || 'Could not save. Check your connection and try again.';
			busy = false;
		}
	}
</script>

<form class="card space-y-4" onsubmit={submit}>
	{#if error}<div class="rounded-lg bg-red-50 p-3 text-sm text-red-700" role="alert">{error}</div>{/if}
	<div class="grid gap-4 sm:grid-cols-2">
		{#each REPORT_FIELDS as f, i (f.key)}
			<div>
				<label class="label" for="f-{f.key}"><span class="mr-1 text-slate-500">{i + 1}.</span>{f.label}{#if f.required}<span class="text-red-600"> *</span>{/if}</label>
				{#if f.type === 'date'}
					<input class="input" id="f-{f.key}" type="date" bind:value={values[f.key]} required={f.required} />
				{:else if f.type === 'tel'}
					<input class="input" id="f-{f.key}" type="tel" inputmode="tel" autocomplete="off" bind:value={values[f.key]} placeholder={f.placeholder || ''} />
				{:else if f.type === 'decimal'}
					<input class="input" id="f-{f.key}" type="text" inputmode="decimal" autocomplete="off" bind:value={values[f.key]} placeholder={f.placeholder || ''} />
				{:else}
					<input class="input" id="f-{f.key}" type="text" autocomplete="off" bind:value={values[f.key]} placeholder={f.placeholder || ''} required={f.required} />
				{/if}
			</div>
		{/each}
	</div>
	<div class="flex flex-wrap gap-2 pt-1">
		<button class="btn flex-1" disabled={busy}>{busy ? 'Saving…' : submitLabel}</button>
		<a class="btn-ghost" href="/ihs">Cancel</a>
	</div>
</form>
