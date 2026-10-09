<script>
	// "Retry my mistakes": after a quiz, practise only the questions that were wrong or skipped,
	// with the answer and explanation shown instantly. Repeats until every one is right.
	import ReadingQuestion from '$lib/ReadingQuestion.svelte';
	import { shuffle } from '$lib/shuffle.js';
	let { fields = [], review = [], formId = '' } = $props();

	const byId = $derived(Object.fromEntries(fields.map((f) => [f.id, f])));
	const missed = $derived(review.filter((r) => r.id && !r.ok && byId[r.id] && Array.isArray(r.correct) && r.correct.length));

	let active = $state(false);
	let round = $state(0);
	let queue = $state([]);
	let results = $state({});
	const answered = $derived(Object.keys(results).length);
	const finished = $derived(active && queue.length > 0 && answered === queue.length);
	const stillMissed = $derived(queue.filter((q) => results[q.id] === false));

	function begin(items) {
		queue = shuffle(items).map((r) => ({
			id: r.id,
			field: { ...byId[r.id], options: shuffle(byId[r.id].options || []) },
			answer: { correct: r.correct, explanation: r.explanation || '' }
		}));
		results = {};
		round += 1;
		active = true;
		setTimeout(() => document.getElementById('retry-top')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
	}
	const retryMissed = () => begin(stillMissed.map((q) => missed.find((m) => m.id === q.id)).filter(Boolean));
</script>

{#if missed.length}
	<div id="retry-top" class="mt-4 text-left print:hidden">
		{#if !active}
			<div class="rounded-xl border border-amber-300 bg-amber-50 p-4">
				<div class="font-semibold text-amber-900">You missed {missed.length} question{missed.length === 1 ? '' : 's'}</div>
				<p class="mt-1 text-sm text-amber-900">Practise just these. Each answer and explanation shows as soon as you choose.</p>
				<button type="button" class="btn mt-3 w-full" onclick={() => begin(missed)}>🔁 Retry my mistakes ({missed.length})</button>
			</div>
		{:else}
			<div class="mb-3 rounded-xl border border-teal-300 bg-teal-50 px-4 py-2 text-center text-sm font-semibold text-teal-800">
				🔁 Retry round {round}: {answered} of {queue.length} answered
			</div>
			{#key round}
				<div class="space-y-4">
					{#each queue as q, i (q.id)}
						<div class="rounded-xl border border-slate-200 bg-white p-3">
							<ReadingQuestion {formId} field={q.field} number={i + 1} answer={q.answer} onreveal={(ok) => (results[q.id] = ok)} />
						</div>
					{/each}
				</div>
			{/key}
			{#if finished}
				<div class="mt-4 rounded-xl border p-4 text-center {stillMissed.length ? 'border-amber-300 bg-amber-50' : 'border-green-300 bg-green-50'}">
					{#if stillMissed.length}
						<div class="text-lg font-bold">{queue.length - stillMissed.length} of {queue.length} correct this round</div>
						<button type="button" class="btn mt-3 w-full" onclick={retryMissed}>🔁 Retry the {stillMissed.length} I still missed</button>
					{:else}
						<div class="text-lg font-bold">🎉 All {queue.length} correct. Well done!</div>
					{/if}
					<button type="button" class="btn-ghost mt-2 w-full" onclick={() => (active = false)}>Close practice</button>
				</div>
			{/if}
		{/if}
	</div>
{/if}
