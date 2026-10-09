// Practice history kept on THIS device only (students never sign in).
const KEY = 'elitereg_history';
const MAX_TOTAL = 200;
const MAX_PER_FORM = 40;

function all() {
	try {
		const a = JSON.parse(localStorage.getItem(KEY) || '[]');
		return Array.isArray(a) ? a.filter((x) => x && x.formId && typeof x.pct === 'number') : [];
	} catch {
		return [];
	}
}

export const getAttempts = (formId) => all().filter((x) => x.formId === formId).sort((a, b) => a.at - b.at);

export function addAttempt(entry) {
	try {
		let list = all();
		// ignore an exact repeat (same quiz, same moment) in case the result page re-renders
		if (list.some((x) => x.formId === entry.formId && x.at === entry.at)) return;
		list.push(entry);
		const mine = list.filter((x) => x.formId === entry.formId).sort((a, b) => a.at - b.at);
		if (mine.length > MAX_PER_FORM) {
			const drop = new Set(mine.slice(0, mine.length - MAX_PER_FORM).map((x) => x.at));
			list = list.filter((x) => x.formId !== entry.formId || !drop.has(x.at));
		}
		localStorage.setItem(KEY, JSON.stringify(list.slice(-MAX_TOTAL)));
	} catch {}
}

export function clearAttempts(formId) {
	try {
		localStorage.setItem(KEY, JSON.stringify(all().filter((x) => x.formId !== formId)));
	} catch {}
}

/** { topic: [right, total] } for one finished quiz */
export function topicStats(fields, review) {
	const topicOf = Object.fromEntries((fields || []).map((f) => [f.id, (f.topic || '').trim()]));
	const out = {};
	for (const r of review || []) {
		const t = topicOf[r.id];
		if (!t) continue;
		const row = (out[t] ||= [0, 0]);
		row[1]++;
		if (r.ok) row[0]++;
	}
	return out;
}
