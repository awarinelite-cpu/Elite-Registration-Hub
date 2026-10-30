<script>
	import Logo from '$lib/Logo.svelte';
	// bell/profile = admin extras; children = anything extra on the right (e.g. theme toggle)
	let { bell = false, bellDot = false, bellHref = '/admin/applications?status=pending', profileHref = '', onprofile = null, home = '/', children } = $props();
</script>

<header class="eh print:hidden">
	<div class="eh-row">
		<a href={home} class="eh-brand" aria-label="Elite Registration Hub">
			<Logo size={62} />
			<span class="eh-text">
				<span class="eh-name">Elite</span>
				<span class="eh-sub">Registration Hub</span>
				<span class="eh-tag"><i>Register</i><b>•</b><i>Apply</i><b>•</b><i>Track</i><b>•</b><i>Succeed</i></span>
			</span>
		</a>
		<div class="eh-right">
			{#if bell}
				<a href={bellHref} class="eh-btn eh-bell" aria-label="Pending applications">
					<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9a6 6 0 0 1 12 0c0 6 2.5 7.5 2.5 7.5h-17S6 15 6 9z" /><path d="M10 20a2 2 0 0 0 4 0" /></svg>
					{#if bellDot}<span class="eh-dot"></span>{/if}
				</a>
			{/if}
			{#if onprofile}
				<button type="button" class="eh-btn eh-ring" aria-label="Open menu" onclick={onprofile}>
					<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.6-3.8 3.6-6 7-6s6.4 2.2 7 6" /></svg>
				</button>
			{:else if profileHref}
				<a href={profileHref} class="eh-btn eh-ring" aria-label="Profile">
					<svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"><circle cx="12" cy="8.5" r="3.6" /><path d="M5 20c.6-3.8 3.6-6 7-6s6.4 2.2 7 6" /></svg>
				</a>
			{/if}
			{@render children?.()}
		</div>
	</div>
	<svg class="eh-curve" viewBox="0 0 400 26" preserveAspectRatio="none" aria-hidden="true">
		<path d="M0 26 V12 C90 28 250 30 400 0 V26 Z" fill="var(--page)" />
		<path d="M0 12 C90 28 250 30 400 0" fill="none" stroke="#c9a13b" stroke-width="2.6" />
	</svg>
</header>

<style>
	.eh {
		position: relative; color: #fff; padding: .85rem 1.1rem 2.6rem;
		background:
			radial-gradient(circle at 85% 0%, rgba(201, 161, 59, .16), transparent 45%),
			linear-gradient(160deg, #14492c 0%, #0c3320 55%, #082616 100%);
	}
	.eh-row { max-width: 64rem; margin: 0 auto; display: flex; align-items: center; justify-content: space-between; gap: .75rem; padding-top: env(safe-area-inset-top, 0px); }
	.eh-brand { display: flex; align-items: center; gap: .6rem; text-decoration: none; color: inherit; min-width: 0; }
	.eh-text { display: flex; flex-direction: column; line-height: 1.1; min-width: 0; }
	.eh-name { font-size: 2.1rem; font-weight: 800; letter-spacing: -.01em; }
	.eh-sub { font-size: 1.15rem; font-weight: 700; color: #e0b845; margin-top: -.1rem; }
	.eh-tag { display: flex; flex-wrap: wrap; gap: .35rem; margin-top: .35rem; font-size: .62rem; font-weight: 600; letter-spacing: .09em; text-transform: uppercase; }
	.eh-tag i { font-style: normal; } .eh-tag b { color: #c9a13b; }
	.eh-right { display: flex; align-items: center; gap: .6rem; flex: none; }
	.eh-btn { background: transparent; border: 0; cursor: pointer; position: relative; display: grid; place-items: center; width: 2.7rem; height: 2.7rem; border-radius: 50%; color: #fff; text-decoration: none; }
	.eh-ring { border: 1.6px solid rgba(255, 255, 255, .8); }
	.eh-dot { position: absolute; top: .35rem; right: .45rem; width: .7rem; height: .7rem; border-radius: 50%; background: #ef4444; border: 2px solid #0c3320; }
	.eh-curve { position: absolute; left: 0; right: 0; bottom: -1px; width: 100%; height: 1.7rem; display: block; }
	@media (max-width: 360px) { .eh-name { font-size: 1.7rem; } .eh-tag { font-size: .56rem; } }
</style>
