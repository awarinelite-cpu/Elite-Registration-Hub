import { STATES } from '$lib/forms.js';

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
	const entries = parsePasted(text);
	const used = new Set();
	const filled = [];
	const unmatched = [];

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

	const missing = fields.filter((f) => !used.has(f.id) && f.type !== 'file' && f.type !== 'photo').map((f) => f.label);
	return { filled, unmatched, missing };
}
