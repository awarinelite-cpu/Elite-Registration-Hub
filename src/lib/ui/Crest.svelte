<script>
	// Round university-style emblem (neutral placeholder crest; swap for the real logo file if you have one).
	let { size = 44, ring = '#f6b93b' } = $props();
</script>

<svg width={size} height={size} viewBox="0 0 64 64" aria-hidden="true">
	<circle cx="32" cy="32" r="30" fill="#fff" stroke={ring} stroke-width="3" />
	<circle cx="32" cy="32" r="24" fill="#0b6b3a" />
	<circle cx="32" cy="32" r="24" fill="none" stroke="#f6b93b" stroke-width="1.5" stroke-dasharray="2 3" />
	<path d="M32 17 15 25.5 32 34l17-8.5z" fill="#f6b93b" />
	<path d="M23 30v7c0 3 4.5 5 9 5s9-2 9-5v-7l-9 4.5z" fill="#fff" />
	<path d="M20 44h24" stroke="#f6b93b" stroke-width="2" stroke-linecap="round" />
</svg>
