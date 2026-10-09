// Turns pasted lecture notes into notebook blocks:
//   { t: 'h', level: 1|2|3, text }            heading / subheading / small heading (bold + underlined)
//   { t: 'p', lead, sep, rest }               paragraph; "lead" is a small heading at the front ("Term:" or "Term - ...")
//   { t: 'ul' | 'ol', items: [{ lead, sep, rest }] }
//   { t: 'table', rows: [[cell, ...], ...] }  from tab-separated or | separated lines
const DASH = '\\u2014\\u2013';
const words = (s) => s.split(/\s+/).filter((w) => /[A-Za-z0-9]/.test(w)).length;
const UNIT = /^(unit|chapter|module|week|lecture)\s+[ivxlcdm\d]+\s*[:.\-\u2013\u2014]\s*\S/i;
const NUMBERED = /^(\d+(?:\.\d+)+)\.?\s+\S/;
const PAREN = /^\(?[a-zA-Z]\)\s+\S/;
const MARK_BULLET = /^[\u2022\u25CF\u25AA\u25E6\u00B7*\-\u2013\u2014]\s+(.+)$/;
const MARK_NUM = /^\d+[.)]\s+(.+)$/;

/** "Term: text" or "Term - text" at the start of a line gives a small heading at the front. */
export function splitLead(text) {
	let best = null;
	const c = text.indexOf(':');
	if (c > 0 && c <= 90) best = { idx: c, lead: text.slice(0, c + 1), sep: ' ', rest: text.slice(c + 1).trim(), term: text.slice(0, c) };
	const m = new RegExp(`\\s[${DASH}]\\s|\\s-\\s`).exec(text);
	if (m && m.index > 0 && m.index <= 70 && (!best || m.index < best.idx)) {
		best = { idx: m.index, lead: text.slice(0, m.index), sep: m[0], rest: text.slice(m.index + m[0].length).trim(), term: text.slice(0, m.index) };
	}
	if (!best || !best.rest) return null;
	if (words(best.term) > 6 || /[.;!?]/.test(best.term.replace(/\b(e\.g|i\.e|etc|vs)\./gi, '')) || /https?/i.test(best.term)) return null;
	return { lead: best.lead, sep: best.sep, rest: best.rest };
}

function classify(line) {
	const text = line.trim();
	const cells = line.includes('\t') ? line.split('\t').map((c) => c.trim()) : /^\|.*\|$/.test(text) ? text.slice(1, -1).split('|').map((c) => c.trim()) : null;
	if (cells && cells.filter(Boolean).length >= 2) return { k: 'row', cells };
	const n = words(text);
	if (UNIT.test(text) && text.length <= 130) return { k: 'h', level: 1, text };
	const nm = text.match(NUMBERED);
	if (nm && text.length <= 120 && n <= 16 && !/[.;]$/.test(text)) return { k: 'h', level: nm[1].split('.').length > 2 ? 3 : 2, text };
	if (PAREN.test(text) && text.length <= 90 && !/[.;,]$/.test(text)) return { k: 'h', level: 3, text };
	if (/[A-Z]/.test(text) && !/[a-z]/.test(text) && text.length <= 90 && n <= 12 && (n >= 2 || text.length >= 7) && !/[.;]$/.test(text) && !MARK_BULLET.test(text) && !MARK_NUM.test(text)) {
		return { k: 'h', level: 1, text: text.replace(/:\s*$/, '') };
	}
	let mm = text.match(MARK_BULLET);
	if (mm) return { k: 'item', ordered: false, text: mm[1].trim() };
	mm = text.match(MARK_NUM);
	if (mm) return { k: 'item', ordered: true, text: mm[1].trim() };
	// a short line with no sentence punctuation is a small heading ("Key characteristics of a computer", "Send soft copy of:")
	const colonEnd = /:$/.test(text);
	if (text.length <= 100 && /^[A-Z0-9(]/.test(text) && ((colonEnd && n <= 8) || (!colonEnd && n <= 12 && !/[.!?;,]$/.test(text) && !splitLead(text)))) {
		return { k: 'cand', text };
	}
	return { k: 't', text };
}

export function parseNotes(input) {
	const lines = String(input || '').replace(/\r/g, '').split('\n');
	const atoms = [];
	for (const raw of lines) {
		if (!raw.trim()) {
			atoms.push({ k: 'blank' });
			continue;
		}
		atoms.push(classify(raw));
	}
	// a run of very short lines (table cells pasted as plain lines) is not a run of headings
	const nextReal = (i) => {
		for (let j = i + 1; j < atoms.length; j++) if (atoms[j].k !== 'blank') return atoms[j];
		return null;
	};
	// a run of 3+ very short lines (table cells pasted as plain lines) is not a run of headings: keep the first, the rest are text
	const short = (a) => a.k === 'cand' && words(a.text) <= 4;
	for (let i = 0; i < atoms.length; i++) {
		if (atoms[i].k === 'blank' || atoms[i].k !== 'cand') continue;
		let j = i;
		while (j + 1 < atoms.length && atoms[j + 1].k !== 'blank' && short(atoms[j + 1])) j++;
		if (short(atoms[i]) && j - i >= 2) for (let k = i + 1; k <= j; k++) atoms[k].k = 't';
		if (!nextReal(j)) atoms[j].k = 't';
		i = j;
	}

	const blocks = [];
	let seenUnit = false;
	let group = []; // consecutive plain lines, flushed as paragraphs or a list
	let rows = [];
	let items = [];
	let lastHeading = '';

	const asItem = (text) => {
		const l = splitLead(text);
		return l ? l : { lead: '', sep: '', rest: text };
	};
	const flushGroup = () => {
		if (!group.length) return;
		const parsed = group.map((t) => asItem(t));
		const hasLead = parsed.map((p) => !!p.lead);
		const leadCount = hasLead.filter(Boolean).length;
		const asList = new Array(parsed.length).fill(false);
		if (group.length >= 3) {
			if (leadCount / group.length >= 0.5) {
				const first = hasLead.indexOf(true);
				for (let i = first; i < parsed.length; i++) asList[i] = hasLead[i] || group[i].length <= 200;
			} else if (group.every((t) => t.length <= 160)) {
				asList.fill(true);
			}
		}
		group.forEach((t, i) => { if (/:$/.test(t)) asList[i] = false; }); // an intro line ending in a colon is a paragraph, not an item
		const ordered = /question/i.test(lastHeading);
		let cur = null;
		parsed.forEach((p, i) => {
			if (asList[i]) {
				if (!cur) {
					cur = { t: ordered ? 'ol' : 'ul', items: [] };
					blocks.push(cur);
				}
				cur.items.push(p);
			} else {
				cur = null;
				blocks.push({ t: 'p', ...p });
			}
		});
		group = [];
	};
	const flushRows = () => {
		if (rows.length) blocks.push({ t: 'table', rows });
		rows = [];
	};
	const flushItems = () => {
		if (!items.length) return;
		blocks.push({ t: items[0].ordered ? 'ol' : 'ul', items: items.map((x) => asItem(x.text)) });
		items = [];
	};
	const flushAll = () => {
		flushGroup();
		flushRows();
		flushItems();
	};

	for (const a of atoms) {
		if (a.k === 'blank') {
			flushAll();
			continue;
		}
		if (a.k === 'row') {
			flushGroup();
			flushItems();
			rows.push(a.cells);
			continue;
		}
		if (a.k === 'item') {
			flushGroup();
			flushRows();
			if (items.length && items[0].ordered !== a.ordered) flushItems();
			items.push(a);
			continue;
		}
		if (a.k === 't') {
			flushRows();
			flushItems();
			group.push(a.text);
			continue;
		}
		flushAll();
		if (a.k === 'h' || a.k === 'cand') {
			let level = a.level;
			if (a.k === 'cand') level = seenUnit ? 3 : 2;
			if (a.k === 'h' && (UNIT.test(a.text) || NUMBERED.test(a.text))) seenUnit = true;
			lastHeading = a.text;
			blocks.push({ t: 'h', level, text: a.text });
		}
	}
	flushAll();
	return blocks;
}

/** A sensible default title: the first one or two heading lines. */
export function noteTitle(input) {
	const first = String(input || '').split(/\r?\n/).map((l) => l.trim()).filter(Boolean).slice(0, 2);
	if (!first.length) return '';
	const caps = first.filter((l) => !/[a-z]/.test(l) && l.length <= 60);
	return (caps.length ? caps : first.slice(0, 1)).join(' - ').slice(0, 120);
}
