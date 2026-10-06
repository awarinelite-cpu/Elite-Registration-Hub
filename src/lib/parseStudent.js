import { STATES, MAX_SITTINGS, emptyScratch } from '$lib/forms.js';

/**
 * Parse a pasted block of "Label: value" lines into [{ label, value }].
 * Lines such as "WAEC SCRATCH CARD" / "NECO SCRATCH CARD" start a section, so the
 * "PIN" and "Serial Number" lines under them become "WAEC PIN", "NECO PIN", etc.
 */
export function parsePasted(text) {
	const out = [];
	let section = '';
	for (const raw of String(text || '').split(/\r?\n/)) {
		const line = raw.replace(/\u00a0/g, ' ').trim();
		if (!line) continue;
		const i = line.indexOf(':');
		const key = (i === -1 ? line : line.slice(0, i)).trim();
		const value = i === -1 ? '' : line.slice(i + 1).trim();
		if (!value) {
			// header line, e.g. "WAEC SCRATCH CARD"
			if (/waec/i.test(key)) section = 'WAEC';
			else if (/neco/i.test(key)) section = 'NECO';
			continue;
		}
		let label = key;
		if (section && /^(pin|serial)/i.test(key)) label = `${section} ${key}`;
		else if (!/^(pin|serial)/i.test(key)) section = ''; // a normal field ends the card section
		out.push({ label, value });
	}
	return out;
}

/** Reduce any label (pasted or from the form) to a canonical key, or '' if unknown. */
export function canon(label) {
	const l = String(label || '').toLowerCase().replace(/\s+/g, ' ').trim();
	if (/\bkin\b|next of kin/.test(l)) {
		if (/relation/.test(l)) return 'nok_relationship';
		if (/address/.test(l)) return 'nok_address';
		if (/phone|mobile|tel/.test(l)) return 'nok_phone';
		return 'nok_name';
	}
	for (const ex of ['waec', 'neco']) {
		if (l.includes(ex)) {
			if (/serial/.test(l)) return `${ex}_serial`;
			if (/pin/.test(l)) return `${ex}_pin`;
		}
	}
	if (/sur\s*name|last\s*name|family\s*name/.test(l)) return 'surname';
	if (/other\s*names?|first\s*name|given\s*name|middle\s*name/.test(l)) return 'othernames';
	if (/e-?mail/.test(l)) return 'email';
	if (/phone|mobile|whatsapp/.test(l)) return 'phone';
	if (/\bnin\b|national identi/.test(l)) return 'nin';
	if (/date of birth|\bdob\b|birth date/.test(l)) return 'dob';
	if (/local government|\blga\b/.test(l)) return 'lga';
	if (/^state\b|state of origin/.test(l)) return 'state';
	if (/nationality/.test(l)) return 'nationality';
	if (/religion/.test(l)) return 'religion';
	if (/address/.test(l)) return 'address';
	return '';
}

const norm = (s) => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim();

function toIsoDate(v) {
	const s = v.trim();
	let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
	if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`;
	// Nigerian format: DD/MM/YYYY (also accepts . and -)
	m = s.match(/^(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{4})$/);
	if (m) {
		const [d, mo] = [Number(m[1]), Number(m[2])];
		if (mo >= 1 && mo <= 12 && d >= 1 && d <= 31) return `${m[3]}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
	}
	const t = Date.parse(s);
	return Number.isNaN(t) ? '' : new Date(t).toISOString().slice(0, 10);
}

function matchOption(options, v) {
	const n = norm(v);
	return (
		options.find((o) => norm(o) === n) ||
		options.find((o) => norm(o).startsWith(n) || n.startsWith(norm(o))) ||
		''
	);
}

/** Convert a pasted value into what the given form field expects. Returns '' if it can't. */
export function convertValue(field, value) {
	const v = value.trim();
	switch (field.type) {
		case 'state': {
			const n = norm(v).replace(/ state$/, '');
			if (/^fct|abuja/.test(n)) return 'FCT - Abuja';
			return STATES.find((s) => norm(s) === n) || '';
		}
		case 'select':
		case 'radio':
			return matchOption(field.options || [], v);
		case 'checkbox':
			return '';
		case 'date':
			return toIsoDate(v);
		case 'nin':
			return v.replace(/\D/g, '');
		case 'phone':
			return v.replace(/[^\d+]/g, '');
		case 'file':
		case 'photo':
		case 'scratchcards':
			return '';
		default:
			return v;
	}
}

/**
 * Match pasted entries to form fields.
 * Returns { filled: [{ field, value }], unmatched: [pasted labels], missing: [form field labels] }
 */
export function matchToFields(fields, text) {
	const used = new Set();
	const filled = [];
	const unmatched = [];
	const partial = [];

	// scratch card info: one grouped field holding up to two sittings
	const scratchField = fields.find((f) => f.type === 'scratchcards');
	if (scratchField) {
		const ex = extractScratch(text);
		text = ex.rest;
		if (ex.cards.length > MAX_SITTINGS) unmatched.push(`${ex.cards.length - MAX_SITTINGS} extra scratch card(s) (only ${MAX_SITTINGS} sittings allowed)`);
		const cards = ex.cards.slice(0, MAX_SITTINGS).map((c) => (c.board === 'NECO' ? { ...c, serial: '' } : c));
		if (cards.length) {
			used.add(scratchField.id);
			filled.push({ field: scratchField, value: cards });
			cards.forEach((c, i) => {
				const gaps = [!c.board && 'result name', !c.pin && 'pin', (c.board !== 'NECO' && !c.serial) && 'serial number', !c.year && 'exam year'].filter(Boolean);
				if (gaps.length) partial.push(`Scratch card ${i + 1} ${gaps.join(', ')}`);
			});
		}
	}
	const entries = parsePasted(text);

	for (const e of entries) {
		const key = canon(e.label);
		let field =
			(key && fields.find((f) => !used.has(f.id) && canon(f.label) === key)) ||
			fields.find((f) => !used.has(f.id) && norm(f.label) === norm(e.label)) ||
			null;
		if (!field) {
			unmatched.push(e.label);
			continue;
		}
		const value = convertValue(field, e.value);
		if (!value) {
			unmatched.push(`${e.label} (couldn't read "${e.value}")`);
			continue;
		}
		used.add(field.id);
		filled.push({ field, value });
	}

	const missing = [
		...fields.filter((f) => !used.has(f.id) && f.type !== 'file' && f.type !== 'photo').map((f) => f.label),
		...partial
	];
	return { filled, unmatched, missing };
}


const boardOf = (v) => (/waec/i.test(v) ? 'WAEC' : /neco/i.test(v) ? 'NECO' : '');
const yearOf = (v) => (String(v).match(/\b(19|20)\d{2}\b/) || [String(v).trim()])[0];

/**
 * Pull scratch card lines out of pasted text. Understands both
 *   "WAEC SCRATCH CARD / PIN: x / SERIAL NUMBER: y / EXAM YEAR: z"  and
 *   "Scratch card result name: WAEC / Scratch card pin: x / Scratch serial number: y / Exam year: z".
 * A second sitting is any further card (new result name, new header, or a repeated pin/serial/year).
 * Returns { cards, rest } where `rest` is the text without the scratch lines.
 */
export function extractScratch(text) {
	const cards = [];
	const rest = [];
	let cur = null;
	let inScratch = false;
	const fresh = (board = '') => {
		cur = { ...emptyScratch(), board };
		cards.push(cur);
	};
	const put = (attr, val, board = '') => {
		if (!cur || cur[attr] || (board && cur.board && cur.board !== board)) fresh(board);
		if (board && !cur.board) cur.board = board;
		cur[attr] = val;
	};

	for (const raw of String(text || '').split(/\r?\n/)) {
		const line = raw.replace(/\u00a0/g, ' ').trim();
		if (!line) continue;
		const i = line.indexOf(':');
		const key = (i === -1 ? line : line.slice(0, i)).trim();
		const value = i === -1 ? '' : line.slice(i + 1).trim();
		const kb = boardOf(key);

		if (!value) {
			if (/scratch|waec|neco|sitting/i.test(key)) {
				inScratch = true;
				if (kb) fresh(kb);
				else cur = null; // "Scratch card info" / "Second sitting": next value starts a new card
				continue;
			}
			rest.push(raw);
			continue;
		}
		if (/result name|exam body|board|exam type/i.test(key) || (/scratch/i.test(key) && !/pin|serial|year/i.test(key) && boardOf(value))) {
			const b = boardOf(value);
			if (b) {
				inScratch = true;
				if (cur && !cur.board) cur.board = b;
				else fresh(b);
				continue;
			}
		}
		const scratchy = inScratch || kb || /scratch/i.test(key);
		if (/\bpin\b/i.test(key) && (scratchy || /^pin$/i.test(key))) {
			inScratch = true;
			put('pin', value, kb);
		} else if (/serial/i.test(key) && (scratchy || /^serial/i.test(key))) {
			inScratch = true;
			put('serial', value, kb);
		} else if (/(exam )?year( of exam)?/i.test(key) && (scratchy || /year of exam|exam year/i.test(key))) {
			inScratch = true;
			put('year', yearOf(value), kb);
		} else {
			inScratch = false;
			rest.push(raw);
		}
	}
	return { cards, rest: rest.join('\n') };
}
