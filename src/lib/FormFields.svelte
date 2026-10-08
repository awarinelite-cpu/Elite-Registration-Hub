<script>
	import { STATES, pairedStateField, imageSrc } from '$lib/forms.js';
	import { lgasFor } from '$lib/lgas.js';
	import ReadingQuestion from '$lib/ReadingQuestion.svelte';
	import ScratchCards from '$lib/ScratchCards.svelte';
	import SsceExams from '$lib/SsceExams.svelte';
	import ExamInfo from '$lib/ExamInfo.svelte';
	// fields: form field defs; values: {id: value}; errors: {id: msg}; existingFiles: {id: {name}}
	let { fields, values = {}, errors = {}, existingFiles = {}, reading = false, answers = null, big = false } = $props();
	const qNo = (f) => fields.filter((x) => x.scored).findIndex((x) => x.id === f.id) + 1;

	function inputType(t) {
		return { number: 'number', phone: 'tel', email: 'email', date: 'date' }[t] || 'text';
	}
	// second SSCE picture stays hidden until "Add SSCE" is tapped (or one was already uploaded)
	let showSecond = $state(!!existingFiles?.doc_ssce_2);
	const hasSecond = $derived(fields.some((x) => x.id === 'doc_ssce_2'));
	// live state / LGA choices so the LGA list follows the selected state
	let stateVals = $state(Object.fromEntries(fields.filter((x) => x.type === 'state').map((x) => [x.id, values?.[x.id] ?? ''])));
	let lgaVals = $state(Object.fromEntries(fields.filter((x) => x.type === 'lga').map((x) => [x.id, values?.[x.id] ?? ''])));
	const stateOf = (f) => pairedStateField(fields, f);
	const lgaOptions = (f) => lgasFor(stateVals[stateOf(f)?.id]);
	function stateChanged(sid) {
		for (const x of fields) {
			if (x.type === 'lga' && stateOf(x)?.id === sid && !lgasFor(stateVals[sid]).includes(lgaVals[x.id])) lgaVals[x.id] = '';
		}
	}
	// exam + scratch card fields are shown together as one EXAM INFORMATION group (at whichever comes first)
	const ssceF = $derived(fields.find((x) => x.type === 'ssceexams'));
	const scratchF = $derived(fields.find((x) => x.type === 'scratchcards'));
	const examGroup = $derived(ssceF && scratchF ? (fields.indexOf(ssceF) < fields.indexOf(scratchF) ? ssceF.id : scratchF.id) : null);
	const val = (f) => values?.[f.id] ?? (f.type === 'checkbox' ? [] : '');
</script>

{#each fields as f (f.id)}
	{#if f.id === 'doc_ssce_2' && !showSecond}
		<!-- hidden until Add SSCE -->
	{:else if f.scored && reading && answers}
		<ReadingQuestion {big} field={f} number={qNo(f)} answer={answers[f.id]} value={values?.[f.id]} error={errors?.[f.id]} />
	{:else if examGroup && f.id === examGroup}
		<ExamInfo ssceField={ssceF} scratchField={scratchF} ssceValue={values?.[ssceF.id]} scratchValue={values?.[scratchF.id]} ssceError={errors?.[ssceF.id]} scratchError={errors?.[scratchF.id]} />
	{:else if examGroup && (f.type === 'scratchcards' || f.type === 'ssceexams')}
		<!-- shown inside the EXAM INFORMATION group -->
	{:else if f.type === 'scratchcards'}
		<ScratchCards field={f} value={values?.[f.id]} error={errors?.[f.id]} />
	{:else if f.type === 'ssceexams'}
		<SsceExams field={f} value={values?.[f.id]} error={errors?.[f.id]} />
	{:else}
	<div class={big ? 'qbig' : ''}>
		<label class="label {big ? 'qtext' : ''}" for={`f_${f.id}`}>
			{#if f.scored}{qNo(f)}. {/if}{f.label}{#if f.required}<span class="text-red-600"> *</span>{/if}
		</label>
		{#if imageSrc(f.image)}<img src={imageSrc(f.image)} alt="" loading="lazy" referrerpolicy="no-referrer" class="mb-2 max-h-96 w-full rounded-lg border border-slate-200 bg-white object-contain" />{/if}

		{#if f.type === 'textarea'}
			<textarea class="input" rows="4" id={`f_${f.id}`} name={`f_${f.id}`} placeholder={f.placeholder} value={val(f)}></textarea>
		{:else if f.type === 'state'}
			<select class="input" id={`f_${f.id}`} name={`f_${f.id}`} bind:value={stateVals[f.id]} onchange={() => stateChanged(f.id)}>
				<option value="">Select…</option>
				{#each STATES as o}
					<option value={o}>{o}</option>
				{/each}
			</select>
		{:else if f.type === 'lga' && stateOf(f)}
			<select class="input" id={`f_${f.id}`} name={`f_${f.id}`} bind:value={lgaVals[f.id]} disabled={!stateVals[stateOf(f).id]}>
				<option value="">{stateVals[stateOf(f).id] ? 'Select LGA…' : `Select ${stateOf(f).label || 'state'} first…`}</option>
				{#each lgaOptions(f) as o}
					<option value={o}>{o}</option>
				{/each}
			</select>
		{:else if f.type === 'select'}
			<select class="input" id={`f_${f.id}`} name={`f_${f.id}`} value={val(f)}>
				<option value="">Select…</option>
				{#each f.options || [] as o}
					<option value={o}>{o}</option>
				{/each}
			</select>
		{:else if f.type === 'rating'}
			<div class="flex flex-wrap gap-2" id={`f_${f.id}`}>
				{#each ['1', '2', '3', '4', '5'] as o}
					<label class="flex h-11 w-11 cursor-pointer items-center justify-center rounded-lg border border-slate-300 text-sm font-semibold has-[:checked]:border-teal-700 has-[:checked]:bg-teal-700 has-[:checked]:text-white">
						<input type="radio" name={`f_${f.id}`} value={o} checked={val(f) === o} class="sr-only" />
						{o}
					</label>
				{/each}
			</div>
			<p class="mt-1 text-xs text-slate-500">1 = lowest, 5 = highest</p>
		{:else if f.type === 'radio'}
			<div class="space-y-1.5" id={`f_${f.id}`}>
				{#each f.options || [] as o}
					<label class="flex items-center gap-2 text-sm">
						<input type="radio" name={`f_${f.id}`} value={o} checked={val(f) === o} class="accent-teal-700" />
						{o}
					</label>
				{/each}
			</div>
		{:else if f.type === 'checkbox'}
			<div class="space-y-1.5" id={`f_${f.id}`}>
				{#each f.options || [] as o}
					<label class="flex items-center gap-2 text-sm">
						<input type="checkbox" name={`f_${f.id}`} value={o} checked={val(f).includes(o)} class="accent-teal-700" />
						{o}
					</label>
				{/each}
			</div>
		{:else if f.type === 'file' || f.type === 'photo'}
			<input
				class="input file:mr-3 file:rounded file:border-0 file:bg-teal-50 file:px-3 file:py-1 file:text-teal-800"
				type="file"
				id={`f_${f.id}`}
				name={`f_${f.id}`}
				accept={f.type === 'photo' ? 'image/*' : 'image/*,application/pdf'}
			/>
			<p class="mt-1 text-xs text-slate-500">
				{f.type === 'photo' ? 'JPG/PNG/WebP' : 'JPG/PNG/WebP/PDF'}, max 1.5 MB.
				{#if existingFiles[f.id]}Current file: <strong>{existingFiles[f.id].name}</strong> (upload a new one to replace).{/if}
			</p>
			{#if f.id === 'doc_ssce' && hasSecond && !showSecond}
				<button type="button" class="btn-ghost mt-2 !px-2 !py-1 text-[11px]" onclick={() => (showSecond = true)}>+ Add SSCE</button>
			{:else if f.id === 'doc_ssce_2' && !existingFiles[f.id]}
				<button type="button" class="mt-1 text-xs font-medium text-red-600 hover:underline" onclick={() => (showSecond = false)}>Remove</button>
			{/if}
		{:else}
			<input
				class="input"
				type={inputType(f.type)}
				id={`f_${f.id}`}
				name={`f_${f.id}`}
				placeholder={f.placeholder}
				value={val(f)}
				inputmode={f.type === 'nin' ? 'numeric' : undefined}
				maxlength={f.type === 'nin' ? 11 : undefined}
			/>
		{/if}

		{#if errors?.[f.id]}<p class="mt-1 text-sm text-red-600">{errors[f.id]}</p>{/if}
	</div>
	{/if}
{/each}
