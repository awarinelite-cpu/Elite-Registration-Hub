<script>
	import { onMount } from 'svelte';
	import { SCRATCH_BOARDS, MAX_SITTINGS, emptySsce } from '$lib/forms.js';

	// field: the ssceexams field def; value: saved array of exams; error: message string.
	// BulkFill fills this by dispatching an "ssceexamfill" CustomEvent (detail = array of exams) on the wrapper.
	let { field, value = [], error = '' } = $props();

	const start = Array.isArray(value) && value.length ? value.slice(0, MAX_SITTINGS).map((c) => ({ ...emptySsce(), ...c })) : [emptySsce()];
	let exams = $state(start);
	let root;

	onMount(() => {
		const h = (e) => {
			const list = Array.isArray(e.detail) ? e.detail.slice(0, MAX_SITTINGS) : [];
			exams = list.length ? list.map((c) => ({ ...emptySsce(), ...c })) : [emptySsce()];
		};
		root.addEventListener('ssceexamfill', h);
		return () => root.removeEventListener('ssceexamfill', h);
	});

	const id = $derived(`f_${field.id}`);
</script>

<div bind:this={root} {id} class="space-y-4">
	{#each exams as c, i}
		<div class="space-y-3 {exams.length > 1 ? 'rounded-xl border border-slate-200 bg-white/70 p-3' : ''}">
			{#if exams.length > 1}
				<div class="flex items-center justify-between">
					<p class="text-sm font-semibold text-teal-800">{i === 0 ? 'First sitting' : 'Second sitting'}</p>
					{#if i > 0}
						<button type="button" class="text-xs font-medium text-red-600 hover:underline" onclick={() => exams.splice(i, 1)}>Remove</button>
					{/if}
				</div>
			{/if}
			<div>
				<label class="label" for={`${id}_b${i}`}>Exam type</label>
				<select class="input" id={`${id}_b${i}`} bind:value={c.board}>
					<option value="">Select…</option>
					{#each SCRATCH_BOARDS as b}<option value={b}>{b}</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for={`${id}_n${i}`}>
					{field.label}{#if field.required && i === 0}<span class="text-red-600"> *</span>{/if}
				</label>
				<input class="input" id={`${id}_n${i}`} bind:value={c.number} autocomplete="off" />
			</div>
			<div>
				<label class="label" for={`${id}_y${i}`}>Exam year</label>
				<input class="input" id={`${id}_y${i}`} bind:value={c.year} inputmode="numeric" maxlength="4" placeholder="e.g. 2012" />
			</div>
		</div>
	{/each}

	{#if exams.length < MAX_SITTINGS}
		<button type="button" class="btn-ghost !px-2 !py-1 text-[11px]" onclick={() => exams.push(emptySsce())}>+ Add exam</button>
	{/if}

	<input type="hidden" name={id} value={JSON.stringify(exams)} />
	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
</div>
