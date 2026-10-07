<script>
	// Read-only application cards, shared by the admin detail view and the applicant's own page.
	let { items, openFile, downloadFile, downloading = '' } = $props();
	let copiedId = $state('');

	async function copyValue(id, text) {
		try {
			await navigator.clipboard.writeText(text);
		} catch {
			const t = document.createElement('textarea');
			t.value = text;
			t.style.position = 'fixed';
			t.style.opacity = '0';
			document.body.appendChild(t);
			t.select();
			document.execCommand('copy');
			t.remove();
		}
		copiedId = id;
		setTimeout(() => copiedId === id && (copiedId = ''), 1200);
	}
</script>

<dl class="grid gap-3 md:grid-cols-2 md:gap-5">
	{#each items as f (f.id)}
		{@const v = f.v}
		{@const text = f.text}
		{#if f.parts}
			<div class="rounded-xl border p-3 md:p-5 {f.second ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}">
				<dt class="text-sm font-semibold uppercase tracking-wide text-slate-600 md:text-base">{f.label}</dt>
				<dd class="mt-1 break-words text-lg font-semibold text-slate-900 md:text-2xl">{f.v}</dd>
				{#each f.parts as p (p.id)}
					<div class="mt-2 flex items-center justify-between gap-2 rounded-lg bg-white/70 px-3 py-2">
						<div class="min-w-0">
							<div class="text-xs font-semibold uppercase tracking-wide text-slate-500">{p.label}</div>
							<div class="break-all text-lg font-semibold text-slate-900 md:text-2xl">{p.value}</div>
						</div>
						<button
							type="button"
							class="shrink-0 rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700 md:p-2.5"
							aria-label="Copy {p.label}"
							title="Copy {p.label}"
							onclick={() => copyValue(p.id, p.value)}
						>
							{#if copiedId === p.id}
								<svg class="h-5 w-5 text-teal-700 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
							{:else}
								<svg class="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" /></svg>
							{/if}
						</button>
					</div>
				{/each}
			</div>
		{:else}
		<div class="flex items-start justify-between gap-2 rounded-xl border p-3 md:p-5 {f.second ? 'border-amber-300 bg-amber-50' : 'border-slate-200 bg-slate-50'}">
			<div class="min-w-0">
				<dt class="text-sm font-semibold uppercase tracking-wide text-slate-600 md:text-base">{f.label}</dt>
				<dd class="mt-1 break-words text-lg font-semibold text-slate-900 md:text-2xl">
					{#if v && typeof v === 'object' && !Array.isArray(v)}
						<span class="flex items-center gap-2">
							<button class="min-w-0 break-all text-left text-teal-700 underline" onclick={() => openFile(v)}>📎 {v.name}</button>
							<button
								type="button"
								class="shrink-0 rounded-md p-1.5 text-teal-700 hover:bg-teal-50 disabled:opacity-50 md:p-2.5"
								aria-label="Download {f.label}"
								title="Download"
								disabled={downloading === f.id}
								onclick={() => downloadFile(v, f.id)}
							>
								<svg class="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 4v11m0 0l-4-4m4 4l4-4M5 20h14" stroke-linecap="round" stroke-linejoin="round" /></svg>
							</button>
						</span>
					{:else if Array.isArray(v)}{#each v as x}{#if x && typeof x === 'object' && 'number' in x}<div>{x.board} | Exam No: {x.number} | Year: {x.year}</div>{:else if x && typeof x === 'object'}<div>{x.board} | PIN: {x.pin}{#if x.board !== 'NECO'} | Serial: {x.serial}{/if} | Year: {x.year}</div>{:else}{x}{/if}{:else}—{/each}
					{:else}{v || '—'}{/if}
				</dd>
			</div>
			{#if text}
				<button
					type="button"
					class="shrink-0 rounded-md p-1.5 md:p-2.5 text-slate-400 hover:bg-slate-100 hover:text-teal-700"
					aria-label="Copy {f.label}"
					title="Copy"
					onclick={() => copyValue(f.id, text)}
				>
					{#if copiedId === f.id}
						<svg class="h-5 w-5 md:h-7 md:w-7 text-teal-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M5 13l4 4L19 7" stroke-linecap="round" stroke-linejoin="round" /></svg>
					{:else}
						<svg class="h-5 w-5 md:h-7 md:w-7" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" stroke-linecap="round" /></svg>
					{/if}
				</button>
			{/if}
		</div>
		{/if}
	{/each}
</dl>
