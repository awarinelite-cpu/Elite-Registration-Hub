<script>
	import Screen from '$lib/ui/Screen.svelte';
	import { BRAND } from '$lib/brand.js';
</script>

<svelte:head><title>Help & Support — {BRAND.name}</title></svelte:head>

<Screen title="Help & Support" back="/more" nav="more">
	<div class="sv-prose">
		<p>Need help with your application? We are here for you.</p>
		<h3>Before you start</h3>
		<p>Have your WAEC/NECO scratch card, passport photograph and other required documents ready. See <a href="/documents" style="color:var(--blue);text-decoration:underline">Required Documents</a>.</p>
		<h3>Lost your PIN?</h3>
		<p>Your PIN is shown once when you submit. If you have forgotten it, contact the admissions help desk and quote your Application Number so a new one can be issued.</p>
		<h3>Locked out?</h3>
		<p>After 5 wrong PIN attempts an application is locked for 15 minutes. Wait and try again.</p>
		<h3>Contact us</h3>
		<p><a href="mailto:{BRAND.supportEmail}" style="color:var(--blue);text-decoration:underline">{BRAND.supportEmail}</a></p>
	</div>
</Screen>
