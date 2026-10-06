<script>
	import { STATES } from '$lib/forms.js';
	import ScratchCards from '$lib/ScratchCards.svelte';
	// fields: form field defs; values: {id: value}; errors: {id: msg}; existingFiles: {id: {name}}
	let { fields, values = {}, errors = {}, existingFiles = {} } = $props();

	function inputType(t) {
		return { number: 'number', phone: 'tel', email: 'email', date: 'date' }[t] || 'text';
	}
	const val = (f) => values?.[f.id] ?? (f.type === 'checkbox' ? [] : '');
</script>

{#each fields as f (f.id)}
	{#if f.type === 'scratchcards'}
		<ScratchCards field={f} value={values?.[f.id]} error={errors?.[f.id]} />
	{:else}
	<div>
		<label class="label" for={`f_${f.id}`}>
			{f.label}{#if f.required}<span class="text-red-600"> *</span>{/if}
		</label>

		{#if f.type === 'textarea'}
			<textarea class="input" rows="4" id={`f_${f.id}`} name={`f_${f.id}`} placeholder={f.placeholder} value={val(f)}></textarea>
		{:else if f.type === 'select' || f.type === 'state'}
			<select class="input" id={`f_${f.id}`} name={`f_${f.id}`} value={val(f)}>
				<option value="">Select…</option>
				{#each f.type === 'state' ? STATES : f.options || [] as o}
					<option value={o}>{o}</option>
				{/each}
			</select>
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
