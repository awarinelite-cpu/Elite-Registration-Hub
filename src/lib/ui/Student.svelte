<script>
	// Friendly student illustration for the home welcome card.
	let { size = 120 } = $props();
</script>

<svg width={size} height={size * 1.05} viewBox="0 0 120 126" fill="none" aria-hidden="true">
	<ellipse cx="60" cy="120" rx="38" ry="5" fill="#000" opacity=".12" />
	<!-- backpack -->
	<rect x="20" y="62" width="30" height="46" rx="12" fill="#1f4fb8" />
	<rect x="26" y="78" width="18" height="14" rx="5" fill="#2f6be0" />
	<!-- body -->
	<path d="M34 112V78c0-10 8-16 18-16h16c10 0 18 6 18 16v34z" fill="#f6b93b" />
	<path d="M44 62c4 8 20 8 24 0" stroke="#e0a21c" stroke-width="3" fill="none" />
	<!-- legs -->
	<rect x="42" y="100" width="14" height="18" rx="4" fill="#1b2a52" />
	<rect x="62" y="100" width="14" height="18" rx="4" fill="#1b2a52" />
	<!-- head -->
	<rect x="52" y="48" width="14" height="14" rx="5" fill="#8a5a3c" />
	<circle cx="59" cy="38" r="17" fill="#9c6845" />
	<path d="M41 36c0-12 8-18 18-18s18 6 18 17c-4-6-10-8-18-8s-14 2-18 9z" fill="#1a1410" />
	<circle cx="53" cy="40" r="1.8" fill="#1a1410" />
	<circle cx="66" cy="40" r="1.8" fill="#1a1410" />
	<path d="M54 47c3 3 9 3 12 0" stroke="#fff" stroke-width="2" stroke-linecap="round" fill="none" />
	<!-- arm + book -->
	<path d="M82 76c8 2 12 8 8 14" stroke="#f6b93b" stroke-width="10" stroke-linecap="round" />
	<rect x="74" y="84" width="30" height="22" rx="3" fill="#fff" stroke="#c9d6ee" />
	<path d="M89 84v22" stroke="#c9d6ee" />
	<path d="M78 90h8M78 95h8M92 90h8M92 95h8" stroke="#9db4e0" stroke-width="1.5" stroke-linecap="round" />
</svg>
