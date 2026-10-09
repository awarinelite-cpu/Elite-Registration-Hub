// Starred (bookmarked) questions, kept on THIS device only, per quiz.
const KEY = 'elitereg_stars';
export const stars = $state({ v: {} });

function read() {
	try {
		const o = JSON.parse(localStorage.getItem(KEY) || '{}');
		return o && typeof o === 'object' ? o : {};
	} catch {
		return {};
	}
}
export function loadStars() {
	stars.v = read();
}
export const starredIds = (formId) => (Array.isArray(stars.v[formId]) ? stars.v[formId] : []);
export const isStarred = (formId, id) => starredIds(formId).includes(id);
export function toggleStar(formId, id) {
	const cur = read(); // always start from what is saved, so two tabs don't overwrite each other
	const list = Array.isArray(cur[formId]) ? cur[formId] : [];
	cur[formId] = list.includes(id) ? list.filter((x) => x !== id) : [...list, id];
	if (!cur[formId].length) delete cur[formId];
	try {
		localStorage.setItem(KEY, JSON.stringify(cur));
	} catch {}
	stars.v = cur;
}
