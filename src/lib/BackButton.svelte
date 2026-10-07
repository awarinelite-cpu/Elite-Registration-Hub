<script>
	import { goto } from '$app/navigation';

	let { fallback = '/admin', label = 'Back', class: cls = '' } = $props();

	// Always go to the page the user came from; if there is no history
	// (e.g. page opened directly), fall back to the dashboard.
	function back() {
		if (typeof history !== 'undefined' && history.length > 1) history.back();
		else goto(fallback);
	}
</script>

<button type="button" onclick={back} aria-label={label} title={label} class="btn-3d-ghost btn-3d-lg !px-3 !text-teal-800 {cls}">
	<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M19 12H5" /><path d="m12 19-7-7 7-7" /></svg>
</button>
