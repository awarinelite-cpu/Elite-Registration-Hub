<script>
	import { imageSrc } from '$lib/forms.js';
	// Reading mode: the answer (and explanation) appears as soon as the option is chosen.
	let { field, number, answer, value = '', error = '', big = false, onreveal = null } = $props();
	const multi = field.type === 'checkbox';
	let pick = $state(multi ? (Array.isArray(value) ? [...value] : []) : value || '');
	let revealed = $state(false);
	const right = $derived(answer?.correct || []);
	const chosen = $derived(multi ? pick : pick ? [pick] : []);
	const ok = $derived(chosen.length === right.length && right.every((x) => chosen.includes(x)));
	const check = () => {
		if (chosen.length && !revealed) {
			revealed = true;
			onreveal?.(ok);
		}
	};
	// once revealed the choice is locked (and still submitted)
	const lock = (e) => {
		if (revealed) e.preventDefault();
	};
	const tone = (o) => (!revealed ? 'border-slate-200' : right.includes(o) ? 'border-green-500 bg-green-50' : chosen.includes(o) ? 'border-red-400 bg-red-50' : 'border-slate-200 opacity-70');
</script>

<div class={big ? 'qbig' : ''}>
	<div class="label {big ? 'qtext' : ''}">{number}. {field.label}{#if multi}<span class="ml-1 text-xs font-normal text-slate-500">(select all that apply)</span>{/if}</div>
	{#if imageSrc(field.image)}<img src={imageSrc(field.image)} alt="" loading="lazy" referrerpolicy="no-referrer" class="mb-2 max-h-96 w-full rounded-lg border border-slate-200 bg-white object-contain" />{/if}
	<div class="space-y-1.5" id={`f_${field.id}`}>
		{#each field.options || [] as o, oi}
			<label class="flex cursor-pointer items-center gap-2 rounded-lg border px-3 py-2 text-sm {big ? 'opt' : ''} {tone(o)}">
				{#if multi}
					<input type="checkbox" name={`f_${field.id}`} value={o} bind:group={pick} onclick={lock} class="accent-teal-700" />
				{:else}
					<input type="radio" name={`f_${field.id}`} value={o} bind:group={pick} onclick={lock} onchange={() => { pick = o; check(); }} class="accent-teal-700" />
				{/if}
				<span class="optletter">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[oi]}</span>
				<span class="flex-1">{o}</span>
				{#if revealed && right.includes(o)}<span class="font-bold text-green-700">✓</span>{:else if revealed && chosen.includes(o)}<span class="font-bold text-red-600">✗</span>{/if}
			</label>
		{/each}
	</div>
	{#if multi && !revealed}
		<button type="button" class="btn-ghost mt-2 !px-3 !py-1 text-sm" disabled={!chosen.length} onclick={check}>Check answer</button>
	{/if}
	{#if revealed}
		<div class="mt-2 rounded-lg p-3 text-sm {ok ? 'bg-green-50 text-green-900' : 'bg-red-50 text-red-900'}">
			<div class="font-semibold">{ok ? '✓ Correct' : '✗ Incorrect'}</div>
			{#if !ok}<div>Correct answer: {right.join(', ')}</div>{/if}
			{#if answer?.explanation}<div class="mt-1 text-xs">{answer.explanation}</div>{/if}
		</div>
	{/if}
	{#if error}<p class="mt-1 text-sm text-red-600">{error}</p>{/if}
</div>
