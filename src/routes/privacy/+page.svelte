<script>
	import Screen from '$lib/ui/Screen.svelte';
	import { BRAND } from '$lib/brand.js';
</script>

<svelte:head><title>Privacy Policy — {BRAND.name}</title></svelte:head>

<Screen title="Privacy Policy" back="/more" nav="more">
	<div class="sv-prose">
		<p>We collect only the information needed to process your application: your personal, academic and contact details, exam details and the documents you upload.</p>
		<h3>How we use it</h3>
		<p>Your information is used by the admissions team to process your application and is not sold or shared for advertising.</p>
		<h3>How it is protected</h3>
		<p>Your PIN is stored only in hashed form. Applicant data is kept on secured servers and is accessible only to authorised administrators.</p>
		<h3>Your choices</h3>
		<p>You can view and edit your application with your Application Number and PIN until it is marked complete.</p>
	</div>
</Screen>
