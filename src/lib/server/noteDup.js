// Finds notes the admin has already saved that look like the one being saved.
//   identical: same words (ignores case, spacing, punctuation and column-width lines)
//   near:      mostly the same words (e.g. a re-upload with small edits)
//   title:     same title, different content

const NEAR = 0.85;

const normText = (t) =>
	String(t || '')
		.replace(/^\s*\{\{\s*cols\s*:[\d\s,]*\}\}\s*$/gim, ' ')
		.toLowerCase()
		.replace(/[^\p{L}\p{N}]+/gu, ' ')
		.trim();
const normTitle = (t) => normText(t);

function shingles(norm, k = 5) {
	const w = norm.split(' ');
	const s = new Set();
	if (w.length <= k) {
		s.add(norm);
		return s;
	}
	for (let i = 0; i + k <= w.length; i++) s.add(w.slice(i, i + k).join(' '));
	return s;
}

function jaccard(a, b) {
	if (!a.size || !b.size) return 0;
	let inter = 0;
	const [small, big] = a.size < b.size ? [a, b] : [b, a];
	for (const x of small) if (big.has(x)) inter++;
	return inter / (a.size + b.size - inter);
}

/** notes: [{ id, title, text, createdAt }]; returns [{ id, title, createdAt, reason, percent }] (most similar first). */
export function findDuplicates({ title, text }, notes) {
	const n = normText(text);
	const t = normTitle(title);
	if (!n) return [];
	let mine = null;
	const out = [];
	for (const note of notes) {
		const m = normText(note.text);
		const base = { id: note.id, title: note.title || 'Untitled', createdAt: note.createdAt || 0 };
		if (m === n) {
			out.push({ ...base, reason: 'identical', percent: 100 });
			continue;
		}
		const ratio = m.length / n.length;
		if (ratio > 0.6 && ratio < 1.6) {
			mine ||= shingles(n);
			const j = jaccard(mine, shingles(m));
			if (j >= NEAR) {
				out.push({ ...base, reason: 'near', percent: Math.round(j * 100) });
				continue;
			}
		}
		if (t && normTitle(note.title) === t) out.push({ ...base, reason: 'title', percent: 0 });
	}
	const rank = { identical: 0, near: 1, title: 2 };
	return out.sort((a, b) => rank[a.reason] - rank[b.reason] || b.percent - a.percent).slice(0, 5);
}
