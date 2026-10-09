<script>
	// Score per topic after a quiz, weakest first, so students know what to revise.
	let { fields = [], review = [] } = $props();
	const topicOf = $derived(Object.fromEntries(fields.map((f) => [f.id, (f.topic || '').trim()])));
	const rows = $derived.by(() => {
		const m = {};
		for (const r of review) {
			const t = topicOf[r.id];
			if (!t) continue;
			(m[t] ||= { topic: t, right: 0, total: 0 }).total++;
			if (r.ok) m[t].right++;
		}
		return Object.values(m)
			.map((x) => ({ ...x, pct: Math.round((x.right / x.total) * 100) }))
			.sort((a, b) => a.pct - b.pct || b.total - a.total);
	});
</script>

{#if rows.length > 1}
	<div class="mt-4 rounded-xl border border-slate-200 bg-white p-4 text-left print:hidden">
		<div class="mb-2 text-sm font-semibold text-slate-800">📊 Your score by topic (weakest first)</div>
		<ul class="space-y-2">
			{#each rows as r}
				<li>
					<div class="flex justify-between gap-2 text-sm">
						<span class="min-w-0 break-words font-medium">{r.topic}</span>
						<span class="shrink-0 font-semibold {r.pct < 50 ? 'text-red-700' : r.pct < 75 ? 'text-amber-700' : 'text-green-700'}">{r.right}/{r.total} · {r.pct}%</span>
					</div>
					<div class="mt-1 h-2 overflow-hidden rounded-full bg-slate-200">
						<div class="h-full rounded-full {r.pct < 50 ? 'bg-red-500' : r.pct < 75 ? 'bg-amber-500' : 'bg-green-600'}" style="width:{r.pct}%"></div>
					</div>
				</li>
			{/each}
		</ul>
		{#if rows[0].pct < 75}<p class="mt-3 text-sm text-slate-700">Revise <strong>{rows[0].topic}</strong> first.</p>{/if}
	</div>
{/if}
