<script>
	// EliteReg badge: gold ring, green disc, "E" monogram built from form-field bars,
	// verified-check seal and a small sparkle.
	let { size = 64 } = $props();
	const uid = $props.id();
</script>

<svg viewBox="0 0 100 100" width={size} height={size} fill="none" aria-hidden="true">
	<defs>
		<linearGradient id="{uid}-gold" x1="0" y1="0" x2="1" y2="1">
			<stop offset="0" stop-color="#f6e3a1" />
			<stop offset=".5" stop-color="#d1a838" />
			<stop offset="1" stop-color="#9c7620" />
		</linearGradient>
		<linearGradient id="{uid}-green" x1="0" y1="0" x2="0" y2="1">
			<stop offset="0" stop-color="#21703f" />
			<stop offset="1" stop-color="#082616" />
		</linearGradient>
	</defs>
	<circle cx="50" cy="50" r="48.5" fill="url(#{uid}-gold)" />
	<circle cx="50" cy="50" r="44.8" fill="url(#{uid}-green)" />
	<circle cx="50" cy="50" r="41" stroke="#e6cd86" stroke-opacity=".55" stroke-width=".9" />
	<g fill="url(#{uid}-gold)">
		<rect x="27" y="25" width="9" height="44" rx="2.2" />
		<rect x="27" y="25" width="34" height="9" rx="2.2" />
		<rect x="27" y="42.5" width="28" height="9" rx="2.2" />
		<rect x="27" y="60" width="34" height="9" rx="2.2" />
		<path d="M70 23 Q71.2 29 77 30 Q71.2 31 70 37 Q68.8 31 63 30 Q68.8 29 70 23 Z" />
	</g>
	<circle cx="69" cy="69" r="12.5" fill="url(#{uid}-gold)" stroke="#0a2e1b" stroke-width="2.6" />
	<path d="M62.8 69.6 L67.2 74 L75.4 64.4" stroke="#0a2e1b" stroke-width="3.3" stroke-linecap="round" stroke-linejoin="round" />
</svg>
