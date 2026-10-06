<script>
	import { matchToFields } from '$lib/parseStudent.js';

	// fields: the form's field defs. Auto-fills the form fields (by id `f_<id>`) as text is pasted/typed.
	let { fields } = $props();
	let text = $state('');
	let result = $state(null);
	let timer;

	function setValue(field, value) {
		const base = `f_${field.id}`;
		if (field.type === 'radio') {
			for (const r of document.getElementsByName(base)) r.checked = r.value === value;
			return;
		}
		const el = document.getElementById(base);
		if (!el) return;
		el.value = value;
		el.dispatchEvent(new Event('input', { bubbles: true }));
		el.dispatchEvent(new Event('change', { bubbles: true }));
	}

	function fill() {
		if (!text.trim()) return (result = null);
		const r = matchToFields(fields, text);
		for (const { field, value } of r.filled) setValue(field, value);
		result = { count: r.filled.length, unmatched: r.unmatched, missing: r.missing };
	}

	function schedule() {
		clearTimeout(timer);
		timer = setTimeout(fill, 350);
	}
</script>

<div class="card mb-5 space-y-3 border-teal-300 bg-teal-50/50">
	<h2 class="font-bold text-teal-800">Paste student details</h2>
	<p class="text-xs text-slate-600">
		Paste one <code>Label: value</code> per line. The form below fills automatically. Check it, attach any files, then submit.
	</p>
	<textarea
		class="input font-mono"
		rows="9"
		placeholder={'Surname Name: NUNGSE\nOther Name(s): KITGAK ILIYA\nState: Plateau State\n…'}
		bind:value={text}
		oninput={schedule}
	></textarea>
	<div class="flex flex-wrap gap-2">
		<button type="button" class="btn-ghost" disabled={!text.trim()} onclick={fill}>Fill again</button>
		<button type="button" class="btn-ghost" onclick={() => { text = ''; result = null; }}>Clear text</button>
	</div>
	{#if result}
		<div class="rounded-lg bg-white p-3 text-sm">
			<p class="font-medium text-green-700">Filled {result.count} field{result.count === 1 ? '' : 's'}.</p>
			{#if result.unmatched.length}<p class="mt-1 text-amber-700">Not used: {result.unmatched.join(', ')}</p>{/if}
			{#if result.missing.length}<p class="mt-1 text-slate-600">Still empty: {result.missing.join(', ')}</p>{/if}
		</div>
	{/if}
</div>
