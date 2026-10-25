// Copy text to the clipboard (with a fallback for older mobile browsers).
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
