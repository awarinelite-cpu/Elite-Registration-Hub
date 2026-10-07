// Logins (application number + PIN) remembered on THIS device only, so a returning applicant
// can tap the Application Number box on the home page and have both fields fill in.
const KEY = 'elitereg_saved_logins';

export function getSaved() {
	try {
		const a = JSON.parse(localStorage.getItem(KEY) || '[]');
		return Array.isArray(a) ? a.filter((x) => x && x.number && x.pin) : [];
	} catch {
		return [];
	}
}

export function addSaved(entry) {
	try {
		const prev = getSaved().find((x) => x.number === entry.number);
		const list = getSaved().filter((x) => x.number !== entry.number);
		list.unshift({ ...prev, ...entry, at: Date.now() });
		localStorage.setItem(KEY, JSON.stringify(list.slice(0, 20)));
	} catch {
		/* storage unavailable: nothing to remember */
	}
}

// fills in details (form id, title, name) on an entry that is already saved; does nothing otherwise
export function updateSaved(number, patch) {
	try {
		const list = getSaved();
		const i = list.findIndex((x) => x.number === number);
		if (i < 0) return;
		list[i] = { ...list[i], ...patch };
		localStorage.setItem(KEY, JSON.stringify(list));
	} catch {
		/* ignore */
	}
}

export function removeSaved(number) {
	try {
		localStorage.setItem(KEY, JSON.stringify(getSaved().filter((x) => x.number !== number)));
	} catch {
		/* ignore */
	}
}

export function clearSaved() {
	try {
		localStorage.removeItem(KEY);
	} catch {
		/* ignore */
	}
}
