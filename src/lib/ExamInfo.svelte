<script>
	import { onMount } from 'svelte';
	import { SSCE_BOARDS, SCRATCH_BOARDS, MAX_SITTINGS, emptySsce, emptyScratch } from '$lib/forms.js';

	// Exam info + scratch card info, grouped per sitting. Data stays in two fields (ssceexams + scratchcards)
	// so saved applications, exports and bulk paste are unchanged; a sitting is just index i in both arrays.
	// ssceField / scratchField: the field defs; *Value: saved arrays; *Error: message strings.
	let { ssceField, scratchField, ssceValue = [], scratchValue = [], ssceError = '', scratchError = '' } = $props();

	const norm = (v, mk) => (Array.isArray(v) ? v.slice(0, MAX_SITTINGS).map((c) => ({ ...mk(), ...c })) : []);
	const startE = norm(ssceValue, emptySsce);
	const startC = norm(scratchValue, emptyScratch);
	const n0 = Math.max(startE.length, startC.length, 1);
	let exams = $state(Array.from({ length: n0 }, (_, i) => startE[i] ?? emptySsce()));
	let cards = $state(Array.from({ length: n0 }, (_, i) => startC[i] ?? emptyScratch()));
	let rootE;
	let rootC;

	// keep both arrays the same length when BulkFill fills one of them
	function sync() {
		const n = Math.max(exams.length, cards.length, 1);
		while (exams.length < n) exams.push(emptySsce());
		while (cards.length < n) cards.push(emptyScratch());
	}
	onMount(() => {
		const he = (e) => {
			const list = Array.isArray(e.detail) ? e.detail.slice(0, MAX_SITTINGS) : [];
			exams = list.length ? list.map((c) => ({ ...emptySsce(), ...c })) : [emptySsce()];
			sync();
		};
		const hc = (e) => {
			const list = Array.isArray(e.detail) ? e.detail.slice(0, MAX_SITTINGS) : [];
			cards = list.length ? list.map((c) => ({ ...emptyScratch(), ...c })) : [emptyScratch()];
			sync();
		};
		rootE.addEventListener('ssceexamfill', he);
		rootC.addEventListener('scratchfill', hc);
		return () => {
			rootE.removeEventListener('ssceexamfill', he);
			rootC.removeEventListener('scratchfill', hc);
		};
	});

	const eid = $derived(`f_${ssceField.id}`);
	const cid = $derived(`f_${scratchField.id}`);
	const required = $derived(ssceField.required || scratchField.required);
	const addSitting = () => {
		exams.push(emptySsce());
		cards.push(emptyScratch());
	};
	const removeSitting = (i) => {
		exams.splice(i, 1);
		cards.splice(i, 1);
	};
</script>

<div bind:this={rootE} id={eid} class="space-y-4">
	<h3 class="text-base font-bold tracking-wide text-slate-800">
		EXAM INFORMATION{#if required}<span class="text-red-600"> *</span>{/if}
	</h3>
	<!-- anchor so BulkFill can find the scratch card part -->
	<span bind:this={rootC} id={cid} class="hidden"></span>

	{#each exams as e, i}
		{@const c = cards[i]}
		<div class="space-y-3 rounded-xl border p-3 {i === 0 ? 'border-slate-200 bg-white/70' : 'border-amber-300 bg-amber-50'}">
			{#if exams.length > 1}
				<div class="flex items-center justify-between">
					<p class="text-sm font-semibold {i === 0 ? 'text-teal-800' : 'text-amber-800'}">{i === 0 ? 'First sitting' : 'Second sitting'}</p>
					{#if i > 0}
						<button type="button" class="text-xs font-medium text-red-600 hover:underline" onclick={() => removeSitting(i)}>Remove</button>
					{/if}
				</div>
			{/if}

			<div>
				<label class="label" for={`${eid}_b${i}`}>Exam type</label>
				<select class="input" id={`${eid}_b${i}`} bind:value={e.board}>
					<option value="">Select…</option>
					{#each SSCE_BOARDS as b}<option value={b}>{b}</option>{/each}
				</select>
			</div>
			<div>
				<label class="label" for={`${eid}_n${i}`}>
					{ssceField.label}{#if ssceField.required && i === 0}<span class="text-red-600"> *</span>{/if}
				</label>
				<input class="input" id={`${eid}_n${i}`} bind:value={e.number} autocomplete="off" />
			</div>
			<div>
				<label class="label" for={`${eid}_y${i}`}>Exam year</label>
				<input class="input" id={`${eid}_y${i}`} bind:value={e.year} inputmode="numeric" maxlength="4" placeholder="e.g. 2012" />
			</div>

			<div class="space-y-3 border-t border-slate-200 pt-3">
				<p class="text-sm font-semibold text-slate-700">Scratch card</p>
				<div>
					<label class="label" for={`${cid}_b${i}`}>Scratch card result name</label>
					<select class="input" id={`${cid}_b${i}`} bind:value={c.board} onchange={() => { if (c.board !== 'WAEC') c.serial = ''; }}>
						<option value="">Select…</option>
						{#each SCRATCH_BOARDS as b}<option value={b}>{b}</option>{/each}
					</select>
				</div>
				<div>
					<label class="label" for={`${cid}_p${i}`}>Scratch card pin</label>
					<input class="input" id={`${cid}_p${i}`} bind:value={c.pin} autocomplete="off" />
				</div>
				{#if c.board === 'WAEC'}
					<div>
						<label class="label" for={`${cid}_s${i}`}>Scratch serial number</label>
						<input class="input" id={`${cid}_s${i}`} bind:value={c.serial} autocomplete="off" />
					</div>
				{/if}
				<div>
					<label class="label" for={`${cid}_y${i}`}>Exam year</label>
					<input class="input" id={`${cid}_y${i}`} bind:value={c.year} inputmode="numeric" maxlength="4" placeholder="e.g. 2012" />
				</div>
			</div>
		</div>
	{/each}

	{#if exams.length < MAX_SITTINGS}
		<button type="button" class="btn-ghost !px-2 !py-1 text-[11px]" onclick={addSitting}>+ Add second sitting</button>
	{/if}

	<input type="hidden" name={eid} value={JSON.stringify(exams)} />
	<input type="hidden" name={cid} value={JSON.stringify(cards)} />
	{#if ssceError}<p class="text-sm text-red-600">{ssceError}</p>{/if}
	{#if scratchError}<p class="text-sm text-red-600">{scratchError}</p>{/if}
</div>
