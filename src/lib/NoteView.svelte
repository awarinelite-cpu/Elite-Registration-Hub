<script>
	// Renders parsed notes (see parseNotes.js): every heading, subheading, small heading and "Term:" lead-in is bold + underlined; text is justified.
	let { blocks = [] } = $props();
</script>

<article class="note">
	{#each blocks as b}
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
			<div class="tw">
				<table>
					<thead><tr>{#each b.rows[0] as c}<th>{c}</th>{/each}</tr></thead>
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
		margin: 0.8em 0;
	}
	table {
		border-collapse: collapse;
		width: 100%;
		text-align: left;
	}
	th,
	td {
		border: 1px solid color-mix(in srgb, currentColor 30%, transparent);
		padding: 0.4rem 0.6rem;
		vertical-align: top;
	}
	th {
		background: color-mix(in srgb, currentColor 8%, transparent);
	}
	@media print {
		.note {
			font-size: 12pt;
		}
	}
</style>
