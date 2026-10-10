<script>
	// Renders parsed notes (see parseNotes.js): every heading, subheading, small heading and "Term:" lead-in is bold + underlined; text is justified.
	// Tables slide sideways instead of squeezing their columns. In the editor (editable) a column edge can be dragged
	// to resize it; onwidths(block, widthsInPx | null) saves the result (null = back to automatic widths).
	let { blocks = [], editable = false, onwidths = null } = $props();

	let live = $state({}); // block index -> widths while a column is being dragged
	let drag = null;
	const MIN = 50;
	const cols = (b) => Math.max(...b.rows.map((r) => r.length));
	const widthsOf = (b, bi) => live[bi] ?? b.widths ?? null;
	const total = (w, n) => Array.from({ length: n }, (_, i) => w[i] ?? 140).reduce((a, x) => a + x, 0);

	function startDrag(e, bi, ci, b) {
		const tr = e.currentTarget.closest('tr');
		const n = cols(b);
		const measured = [...tr.children].map((c) => Math.round(c.getBoundingClientRect().width));
		const cur = Array.from({ length: n }, (_, i) => measured[i] ?? 140);
		drag = { bi, ci, startX: e.clientX, cur, b };
		live[bi] = cur;
		e.currentTarget.setPointerCapture(e.pointerId);
		e.preventDefault();
		e.stopPropagation();
	}
	function moveDrag(e) {
		if (!drag) return;
		const w = [...drag.cur];
		w[drag.ci] = Math.max(MIN, Math.round(drag.cur[drag.ci] + e.clientX - drag.startX));
		live[drag.bi] = w;
	}
	function endDrag() {
		if (!drag) return;
		const d = drag;
		drag = null;
		const w = live[d.bi];
		if (w && w.some((x, i) => x !== d.cur[i])) onwidths?.(d.b, w);
		delete live[d.bi];
	}
</script>

<article class="note">
	{#each blocks as b, bi}
		{#if b.t === 'h'}
			<svelte:element this={`h${b.level + 1}`} class="nh nh{b.level}">{b.text}</svelte:element>
		{:else if b.t === 'p'}
			<p>{#if b.lead}<span class="lead">{b.lead}</span>{b.sep}{/if}{b.rest}</p>
		{:else if b.t === 'ul' || b.t === 'ol'}
			<svelte:element this={b.t} class="nl">
				{#each b.items as it}
					<li>{#if it.lead}<span class="lead">{it.lead}</span>{it.sep}{/if}{it.rest}</li>
				{/each}
			</svelte:element>
		{:else if b.t === 'table'}
			{@const w = widthsOf(b, bi)}
			{@const n = cols(b)}
			<div class="tw">
				{#if editable}
					<div class="mb-1 flex flex-wrap items-center gap-2 text-xs text-slate-500 print:hidden">
						<span>Drag the edge of a heading cell to resize its column.</span>
						{#if b.widths}<button type="button" class="underline" onclick={() => onwidths?.(b, null)}>Reset column widths</button>{/if}
					</div>
				{/if}
				<table class:fixed={!!w} style={w ? `width:${total(w, n)}px` : ''}>
					{#if w}<colgroup>{#each Array(n) as _, ci}<col style="width:{w[ci] ?? 140}px" />{/each}</colgroup>{/if}
					<thead>
						<tr>
							{#each b.rows[0] as c, ci}
								<th>
									{c}
									{#if editable}
										<span class="rz" role="separator" aria-orientation="vertical" aria-label="Resize column" onpointerdown={(e) => startDrag(e, bi, ci, b)} onpointermove={moveDrag} onpointerup={endDrag} onpointercancel={endDrag}></span>
									{/if}
								</th>
							{/each}
						</tr>
					</thead>
					<tbody>
						{#each b.rows.slice(1) as r}<tr>{#each r as c}<td>{c}</td>{/each}</tr>{/each}
					</tbody>
				</table>
			</div>
		{/if}
	{/each}
</article>

<style>
	.note {
		text-align: justify;
		hyphens: auto;
		line-height: 1.7;
		font-size: 1rem;
		overflow-wrap: anywhere;
	}
	.note :global(.nh),
	.note :global(.lead),
	.note th {
		font-weight: 700;
		text-decoration: underline;
		text-underline-offset: 3px;
	}
	.note :global(.nh) {
		text-align: left;
		margin: 1.4em 0 0.5em;
		line-height: 1.35;
	}
	.note :global(.nh1) {
		font-size: 1.35rem;
		margin-top: 1.8em;
	}
	.note :global(.nh2) {
		font-size: 1.15rem;
	}
	.note :global(.nh3) {
		font-size: 1rem;
	}
	.note p {
		margin: 0.6em 0;
	}
	.note :global(.nl) {
		margin: 0.6em 0;
		padding-left: 1.4rem;
	}
	.note :global(ul.nl) {
		list-style: disc;
	}
	.note :global(ol.nl) {
		list-style: decimal;
	}
	.note li {
		margin: 0.35em 0;
	}
	.tw {
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		margin: 0.8em 0;
		padding-bottom: 0.3rem;
	}
	table {
		border-collapse: collapse;
		width: max-content;
		min-width: 100%;
		text-align: left;
		hyphens: none;
	}
	th,
	td {
		border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
		padding: 0.4rem 0.6rem;
		vertical-align: top;
		overflow-wrap: break-word;
		word-break: normal;
		hyphens: none;
		min-width: 7rem;
		max-width: 22rem;
	}
	table.fixed {
		table-layout: fixed;
		min-width: 0;
	}
	table.fixed th,
	table.fixed td {
		min-width: 0;
		max-width: none;
	}
	th {
		background: color-mix(in srgb, currentColor 8%, transparent);
		position: relative;
	}
	.rz {
		position: absolute;
		top: 0;
		bottom: 0;
		right: -9px;
		width: 18px;
		cursor: col-resize;
		touch-action: none;
		z-index: 2;
	}
	.rz::after {
		content: '';
		position: absolute;
		left: 8px;
		top: 15%;
		bottom: 15%;
		width: 3px;
		border-radius: 3px;
		background: #14b8a6;
	}
	@media print {
		.note {
			font-size: 12pt;
		}
		table,
		table.fixed {
			width: 100% !important;
			table-layout: auto;
		}
		.tw {
			overflow: visible;
		}
	}
</style>
