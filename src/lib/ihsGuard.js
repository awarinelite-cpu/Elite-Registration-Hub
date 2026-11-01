// IHS DMO accounts may only ever see /ihs. Firebase sign-in state lives in the browser, so the
// app remembers "this device is signed in as an IHS account" in a tiny flag. src/app.html reads
// the same key (before the page paints) to send such a device straight to /ihs.
export const IHS_HINT = 'elitereg_ihs';

export function getIhsHint() {
	try {
		return localStorage.getItem(IHS_HINT) === '1';
	} catch {
		return false;
	}
}

export function setIhsHint(on) {
	try {
		if (on) localStorage.setItem(IHS_HINT, '1');
		else localStorage.removeItem(IHS_HINT);
	} catch {}
}
