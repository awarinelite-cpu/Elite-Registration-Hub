/** Copy text to the clipboard (falls back to a hidden textarea on browsers/webviews without the Clipboard API). */
export async function copyText(text) {
	try {
		await navigator.clipboard.writeText(text);
	} catch {
		const t = document.createElement('textarea');
		t.value = text;
		t.style.position = 'fixed';
		t.style.opacity = '0';
		document.body.appendChild(t);
		t.select();
		document.execCommand('copy');
		t.remove();
	}
}
