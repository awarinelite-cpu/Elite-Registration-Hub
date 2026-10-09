<script>
	// Past scores for one quiz on this device: trend line, best score, last attempts and weakest topics overall.
	import { getAttempts, clearAttempts } from '$lib/history.js';
	let { formId, refresh = 0, title = 'Your progress on this quiz' } = $props();
	let attempts = $state([]);
	$effect(() => {
		refresh;
		attempts = getAttempts(formId);
	});
	const recent = $derived(attempts.slice(-10));
	const best = $derived(attempts.reduce((m, a) => Math.max(m, a.pct), 0));
	const avg = $derived(attempts.length ? Math.round((attempts.reduce((s, a) => s + a.pct, 0) / attempts.length) * 10) / 10 : 0);
	const W = 300;
	const H = 90;
	const pts = $derived(recent.map((a, i) => ({ x: recent.length === 1 ? W / 2 : 10 + (i * (W - 20)) / (recent.length - 1), y: 8 + (H - 16) * (1 - Math.min(100, Math.max(0, a.pct)) / 100), a })));
	const line = $derived(pts.map((p) => `${p.x},${p.y}`).join(' '));
	const weak = $derived.by(() => {
		const m = {};
		for (const a of attempts) for (const [t, [r, n]] of Object.entries(a.topics || {})) {
			(m[t] ||= [0, 0])[0] += r;
			m[t][1] += n;
		}
		return Object.entries(m)
			.map(([t, [r, n]]) => ({ t, r, n, pct: Math.round((r / n) * 100) }))
			.sort((a, b) => a.pct - b.pct)
			.slice(0, 3);
	});
	const when = (ms) => new Date(ms).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
	function reset() {
		if (confirm('Clear your saved scores for this quiz on this device?')) {
			clearAttempts(formId);
			attempts = [];
		}
	}
</script>

{#if attempts.length}
	<div class="rounded-xl border border-slate-200 bg-white p-4 text-left print:hidden">
		<div class="mb-1 flex items-center justify-between gap-2">
			<div class="text-sm font-semibold text-slate-800">📈 {title}</div>
			<button type="button" class="text-xs text-slate-500 underline" onclick={reset}>Clear</button>
		</div>
		<div class="mb-2 flex gap-4 text-xs text-slate-600">
			<span>Attempts: <strong>{attempts.length}</strong></span>
			<span>Best: <strong>{best}%</strong></span>
			<span>Average: <strong>{avg}%</strong></span>
		</div>
		{#if recent.length > 1}
			<svg viewBox="0 0 {W} {H}" class="h-24 w-full" role="img" aria-label="Score trend">
				<line x1="0" x2={W} y1={8 + (H - 16) * 0.25} y2={8 + (H - 16) * 0.25} stroke="#e2e8f0" stroke-dasharray="3 3" />
				<line x1="0" x2={W} y1={8 + (H - 16) * 0.5} y2={8 + (H - 16) * 0.5} stroke="#e2e8f0" stroke-dasharray="3 3" />
				<polyline points={line} fill="none" stroke="#0f766e" stroke-width="2.5" stroke-linejoin="round" />
				{#each pts as p}<circle cx={p.x} cy={p.y} r="3.5" fill="#0f766e" />{/each}
			</svg>
		{/if}
		<ul class="mt-1 space-y-1 text-sm">
			{#each [...attempts].reverse().slice(0, 5) as a}
				<li class="flex justify-between gap-2"><span class="text-slate-600">{when(a.at)} · {a.mode === 'reading' ? 'Reading' : 'Exam'}</span><span class="font-semibold">{a.score}/{a.total} · {a.pct}%</span></li>
			{/each}
		</ul>
		{#if weak.length && weak[0].pct < 75}
			<p class="mt-2 text-xs text-slate-600">Weakest topics so far: {weak.filter((w) => w.pct < 75).map((w) => `${w.t} (${w.pct}%)`).join(', ')}</p>
		{/if}
	</div>
{/if}
