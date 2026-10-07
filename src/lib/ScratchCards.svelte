<script>
	import { onMount } from 'svelte';
	import { SCRATCH_BOARDS, MAX_SITTINGS, emptyScratch } from '$lib/forms.js';

	// field: the scratchcards field def; value: saved array of cards; error: message string.
	// BulkFill fills this by dispatching a "scratchfill" CustomEvent (detail = array of cards) on the wrapper.
	let { field, value = [], error = '' } = $props();

	const start = Array.isArray(value) && value.length ? value.slice(0, MAX_SITTINGS).map((c) => ({ ...emptyScratch(), ...c })) : [emptyScratch()];
	let cards = $state(start);
	let root;

	onMount(() => {
		const h = (e) => {
			const list = Array.isArray(e.detail) ? e.detail.slice(0, MAX_SITTINGS) : [];
			cards = list.length ? list.map((c) => ({ ...emptyScratch(), ...c })) : [emptyScratch()];
		};
		root.addEventListener('scratchfill', h);
		return () => root.removeEventListener('scratchfill', h);
	});

	const id = $derived(`f_${field.id}`);
</script>

<div bind:this={root} {id} class="space-y-4">
	<h3 class="text-base font-bold tracking-wide text-slate-800">
		{field.label}{#if field.required}<span class="text-red-600"> *</span>{/if}
	</h3>

	{#each cards as c, i}
		<div class="space-y-3 rounded-xl border p-3 {i === 0 ? 'border-slate-200 bg-white/70' : 'border-amber-300 bg-amber-50'}">
			{#if cards.length > 1}
				<div class="flex items-center justify-between">
					<p class="text-sm font-semibold {i === 0 ? 'text-teal-800' : 'text-amber-800'}">{i === 0 ? 'First sitting' : 'Second sitting'}</p>
					{#if i > 0}
						<button type="button" class="text-xs font-medium text-red-600 hover:underline" onclick={() => cards.splice(i, 1)}>Remove</button>
					{/if}
				</div>
			{/if}
			<div>
				<label class="label" for={`${id}_b${i}`}>Scratch card result name</label>
				<select class="input" id={`${id}_b${i}`} bind:value={c.board} onchange={() => { if (c.board !== 'WAEC') c.serial = ''; }}>
					<option value="">Select…</option>
					{#each SCRATCH_BOARDS as b}<option value={b}>{b}</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for={`${id}_p${i}`}>Scratch card pin</label>
				<input class="input" id={`${id}_p${i}`} bind:value={c.pin} autocomplete="off" />
			</div>
			{#if c.board === 'WAEC'}
				<div>
					<label class="label" for={`${id}_s${i}`}>Scratch serial number</label>
					<input class="input" id={`${id}_s${i}`} bind:value={c.serial} autocomplete="off" />
				</div>
			{/if}
			<div>
				<label class="label" for={`${id}_y${i}`}>Exam year</label>
				<input class="input" id={`${id}_y${i}`} bind:value={c.year} inputmode="numeric" maxlength="4" placeholder="e.g. 2012" />
			</div>
		</div>
	{/each}

	{#if cards.length < MAX_SITTINGS}
		<button type="button" class="btn-ghost !px-2 !py-1 text-[11px]" onclick={() => cards.push(emptyScratch())}>+ Add second sitting</button>
	{/if}

	<input type="hidden" name={id} value={JSON.stringify(cards)} />
	{#if error}<p class="text-sm text-red-600">{error}</p>{/if}
</div>
