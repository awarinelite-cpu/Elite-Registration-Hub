// Shared (client + server) form helpers.

export const FIELD_TYPES = [
	{ value: 'text', label: 'Short text' },
	{ value: 'textarea', label: 'Long text' },
	{ value: 'number', label: 'Number' },
	{ value: 'phone', label: 'Phone number' },
	{ value: 'email', label: 'Email' },
	{ value: 'date', label: 'Date' },
	{ value: 'select', label: 'Dropdown' },
	{ value: 'radio', label: 'Radio buttons' },
	{ value: 'checkbox', label: 'Checkboxes' },
	{ value: 'nin', label: 'NIN (11 digits)' },
	{ value: 'state', label: 'State (Nigeria)' },
	{ value: 'lga', label: 'LGA' },
	{ value: 'file', label: 'File upload' },
	{ value: 'photo', label: 'Passport photograph' },
	{ value: 'scratchcards', label: 'Scratch card info (WAEC/NECO, up to 2 sittings)' }
];

export const OPTION_TYPES = ['select', 'radio', 'checkbox'];
export const FILE_TYPES = ['file', 'photo'];

export const SCRATCH_BOARDS = ['WAEC', 'NECO'];
export const MAX_SITTINGS = 2;
export const emptyScratch = () => ({ board: '', pin: '', serial: '', year: '' });

// Stable id so data saved against the on-the-fly converted field matches what the form editor saves later.
export const SCRATCH_FIELD_ID = 'scratch_card_info';
export const isLegacyScratch = (f) => f.type !== 'scratchcards' && /scratch|ssce\s*year/i.test(f.label || '');

/**
 * Old forms stored separate scratch card / SSCE year boxes. Swap them for the grouped SCRATCH CARD INFO field
 * (WAEC/NECO dropdown, pin, serial, year, add second sitting) without needing the admin to re-save the form.
 * keepLegacy: leave the old fields in place too (admin tables), so older applications still show their data.
 */
export function migrateScratchFields(fields, { keepLegacy = false } = {}) {
	const list = Array.isArray(fields) ? fields : [];
	if (list.some((f) => f.type === 'scratchcards')) return list;
	const firstIdx = list.findIndex(isLegacyScratch);
	if (firstIdx < 0) return list;
	const scratch = { id: SCRATCH_FIELD_ID, type: 'scratchcards', label: 'SCRATCH CARD INFO', required: true, placeholder: '' };
	if (keepLegacy) return [...list.slice(0, firstIdx), scratch, ...list.slice(firstIdx)];
	const before = list.slice(0, firstIdx).filter((f) => !isLegacyScratch(f)).length;
	const keep = list.filter((f) => !isLegacyScratch(f));
	keep.splice(before, 0, scratch);
	return keep;
}

/** Parse the submitted scratch-card JSON into a clean array (empty cards dropped, max 2). */
export function parseScratch(raw) {
	let arr = raw;
	if (typeof raw === 'string') {
		try {
			arr = JSON.parse(raw || '[]');
		} catch {
			arr = [];
		}
	}
	if (!Array.isArray(arr)) return [];
	return arr
		.slice(0, MAX_SITTINGS)
		.map((c) => {
			const t = (k) => String(c?.[k] ?? '').trim().slice(0, 60);
			const board = t('board');
			// NECO has no serial number
			return { board, pin: t('pin'), serial: board === 'NECO' ? '' : t('serial'), year: t('year') };
		})
		.filter((c) => c.board || c.pin || c.serial || c.year);
}

function validateScratch(cards) {
	const maxYear = new Date().getFullYear() + 1;
	for (let i = 0; i < cards.length; i++) {
		const c = cards[i];
		const n = `Scratch card ${i + 1}`;
		if (!SCRATCH_BOARDS.includes(c.board)) return `${n}: select WAEC or NECO.`;
		if (!c.pin) return `${n}: enter the scratch card pin.`;
		if (c.board === 'WAEC' && !c.serial) return `${n}: enter the scratch serial number.`;
		if (!/^\d{4}$/.test(c.year) || Number(c.year) < 1980 || Number(c.year) > maxYear) return `${n}: enter a valid 4-digit exam year.`;
	}
	return '';
}

/** One readable line per scratch card, e.g. "WAEC | PIN: 123 | Serial: 456 | Year: 2012". */
export function scratchLine(c) {
	return `${c.board || '?'} | PIN: ${c.pin || '-'}${c.board === 'NECO' ? '' : ` | Serial: ${c.serial || '-'}`} | Year: ${c.year || '-'}`;
}

/** Join an array value for display/CSV; handles scratch card objects. */
export function joinArray(v, sep = ', ') {
	return v.map((x) => (x && typeof x === 'object' ? scratchLine(x) : String(x))).join(sep);
}

export const STATES = [
	'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
	'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
	'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
	'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
	'Taraba', 'Yobe', 'Zamfara'
];

export const STATUSES = ['submitted', 'reviewed', 'approved', 'rejected'];

export const MAX_FILE_BYTES = 1.5 * 1024 * 1024;
export const MAX_TOTAL_BYTES = 4 * 1024 * 1024;

export function todayStr() {
	return new Date().toISOString().slice(0, 10);
}

/** Returns null if open, otherwise a human reason. */
export function closedReason(form) {
	if (!form || form.status !== 'active') return 'This form is not currently accepting applications.';
	const t = todayStr();
	if (form.startDate && t < form.startDate) return `Applications open on ${form.startDate}.`;
	if (form.closingDate && t > form.closingDate) return 'The closing date for this form has passed.';
	return null;
}

export function slugify(s) {
	return s
		.toLowerCase()
		.trim()
		.replace(/[^a-z0-9]+/g, '-')
		.replace(/^-+|-+$/g, '')
		.slice(0, 60);
}

export function newFieldId() {
	return 'f' + Math.random().toString(36).slice(2, 8);
}

/** Validate a single text-ish value. Returns error string or ''. */
export function validateValue(field, value) {
	const v = typeof value === 'string' ? value.trim() : value;
	const empty = v === '' || v == null || (Array.isArray(v) && v.length === 0);
	if (empty) return field.required ? 'This field is required.' : '';
	switch (field.type) {
		case 'email':
			return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? '' : 'Enter a valid email address.';
		case 'phone':
			return /^\+?[0-9\s-]{7,16}$/.test(v) ? '' : 'Enter a valid phone number.';
		case 'nin':
			return /^\d{11}$/.test(v) ? '' : 'NIN must be exactly 11 digits.';
		case 'number':
			return Number.isFinite(Number(v)) ? '' : 'Enter a valid number.';
		case 'date':
			return /^\d{4}-\d{2}-\d{2}$/.test(v) ? '' : 'Enter a valid date.';
		case 'state':
			return STATES.includes(v) ? '' : 'Select a valid state.';
		case 'select':
		case 'radio':
			return (field.options || []).includes(v) ? '' : 'Select a valid option.';
		case 'checkbox':
			return v.every((x) => (field.options || []).includes(x)) ? '' : 'Invalid selection.';
		case 'scratchcards':
			return validateScratch(v);
		default:
			return String(v).length > 5000 ? 'Too long.' : '';
	}
}

const NOT_STUDENT = /kin|guardian|referee|sponsor|parent|spouse/i;

/** Best-effort student name from an application: surname + other names, else any name-like field. */
export function studentName(form, app) {
	const fields = (form?.fields || []).filter((f) => !NOT_STUDENT.test(f.label || ''));
	const val = (f) => {
		const v = f && app?.data?.[f.id];
		return typeof v === 'string' ? v.trim() : '';
	};
	const sur = fields.find((f) => /sur\s*name|last\s*name|family\s*name/i.test(f.label || ''));
	const other = fields.find((f) => /other\s*name|first\s*name|given|middle/i.test(f.label || ''));
	const joined = [val(sur), val(other)].filter(Boolean).join(' ');
	if (joined) return joined;
	const anyName = fields.find((f) => f.type === 'text' && /name/i.test(f.label || '') && val(f));
	if (anyName) return val(anyName);
	const firstText = fields.find((f) => f.type === 'text' && val(f));
	return firstText ? val(firstText) : '';
}

/** Flat searchable text of every simple field value of an application. */
export function appSearchText(form, app) {
	const parts = [app.applicationNumber || '', studentName(form, app)];
	for (const f of form?.fields || []) {
		const v = app.data?.[f.id];
		if (v == null) continue;
		if (Array.isArray(v)) parts.push(joinArray(v, ' '));
		else if (typeof v === 'object') parts.push(v.name || '');
		else parts.push(String(v));
	}
	return parts.join(' ').toLowerCase();
}
