<script>
	// Elite crest: gold laurel wreath around a green shield with a graduation cap.
	let { size = 64 } = $props();
</script>

<svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
	<defs>
		<linearGradient id="lg-gold" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#f0d98f" />
			<stop offset=".5" stop-color="#c9a13b" />
			<stop offset="1" stop-color="#a47f22" />
		</linearGradient>
		<linearGradient id="lg-green" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#1c5a37" />
			<stop offset="1" stop-color="#0a2e1b" />
		</linearGradient>
	</defs>
	<!-- laurel -->
	<g fill="url(#lg-gold)">
		{#each [0, 1, 2, 3, 4, 5, 6] as i}
			<ellipse cx={14 + i * 1.2} cy={70 - i * 8} rx="3" ry="6" transform="rotate({-38 + i * 7} {14 + i * 1.2} {70 - i * 8})" />
			<ellipse cx={86 - i * 1.2} cy={70 - i * 8} rx="3" ry="6" transform="rotate({38 - i * 7} {86 - i * 1.2} {70 - i * 8})" />
		{/each}
	</g>
	<!-- shield -->
	<path d="M50 12 L77 22 V50 C77 68 64 80 50 87 C36 80 23 68 23 50 V22 Z" fill="url(#lg-green)" stroke="url(#lg-gold)" stroke-width="3" stroke-linejoin="round" />
	<!-- cap -->
	<g fill="url(#lg-gold)">
		<path d="M50 32 L72 42 L50 52 L28 42 Z" />
		<path d="M38 49 V58 C44 63 56 63 62 58 V49 L50 54.5 Z" opacity=".92" />
		<path d="M69 44 V56" stroke="url(#lg-gold)" stroke-width="2" stroke-linecap="round" />
		<circle cx="69" cy="58" r="2" />
	</g>
</svg>
