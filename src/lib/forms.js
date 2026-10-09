// Shared (client + server) form helpers.

// Passport photo / document uploads need Firebase Storage (Blaze plan). While this is false, upload fields are
// never added to forms, are hidden from every form that already has them, and can't be picked in the form editor.
// Set to true once a storage bucket is available.
export const UPLOADS_ENABLED = false;

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
	{ value: 'rating', label: 'Rating (1–5)' },
	{ value: 'file', label: 'File upload' },
	{ value: 'photo', label: 'Passport photograph' },
	{ value: 'scratchcards', label: 'Scratch card info (WAEC/NECO, up to 2 sittings)' },
	{ value: 'ssceexams', label: 'SSCE exam number (WAEC/NECO, up to 2 sittings)' }
].filter((t) => UPLOADS_ENABLED || (t.value !== 'file' && t.value !== 'photo'));

export const FORM_KINDS = [
	{ value: 'registration', label: 'Registration form' },
	{ value: 'quiz', label: 'Quiz / exam (scored MCQ)' },
	{ value: 'survey', label: 'Questionnaire / survey' }
];
/** Turn a pasted image link into something an <img> can show (imgur page links -> direct links). Returns '' if not http(s). */
export function imageSrc(url) {
	const u = String(url || '').trim();
	if (!/^https?:\/\//i.test(u)) return '';
	const m = u.match(/^https?:\/\/(?:www\.|m\.)?imgur\.com\/(?!a\/|gallery\/)([A-Za-z0-9]{5,8})\/?(?:[?#].*)?$/i);
	return m ? `https://i.imgur.com/${m[1]}.jpg` : u;
}
export const MATRIC_FIELD_ID = 'matric_number'; // managed by the quiz "Ask for matric number" setting
export const STUDENT_NAME_ID = 'student_name'; // managed by the quiz "Full name" setting
export const MANAGED_QUIZ_FIELDS = [STUDENT_NAME_ID, MATRIC_FIELD_ID];
export const IDENT_MODES = [
	{ value: 'off', label: 'Off (don\'t ask)' },
	{ value: 'optional', label: 'Optional' },
	{ value: 'required', label: 'Required' }
];
export const matricField = (required = false) => ({ id: MATRIC_FIELD_ID, type: 'text', label: required ? 'Matric number' : 'Matric number (optional)', required: !!required, placeholder: '' });
export const nameField = (required = false) => ({ id: STUDENT_NAME_ID, type: 'text', label: required ? 'Full name' : 'Full name (optional)', required: !!required, placeholder: '' });
export const isRegistration = (form) => !form?.kind || form.kind === 'registration';
/** Fields safe to send to the public: answer keys removed. */
export const publicFields = (fields) => (fields || []).map(({ correct, explanation, ...f }) => (Array.isArray(correct) ? correct.length : correct) ? { ...f, scored: true } : f);

const listOf = (v) => (Array.isArray(v) ? v : v ? [v] : []);
/** Score a quiz submission. Only fields with a correct answer count; checkbox questions need the exact set. */
export function scoreForm(fields, values, quiz = {}) {
	const items = [];
	let score = 0;
	let total = 0;
	let answered = 0;
	for (const f of fields || []) {
		const want = listOf(f.correct);
		if (!want.length) continue;
		const pts = Number(f.points) > 0 ? Number(f.points) : 1;
		const got = listOf(values?.[f.id]);
		const ok = got.length === want.length && want.every((x) => got.includes(x));
		total += pts;
		if (ok) score += pts;
		if (got.length) answered++;
		items.push({ id: f.id, label: f.label, given: got.join(', '), answer: want.join(', '), ok, unanswered: !got.length, points: pts, explanation: f.explanation || '' });
	}
	const pct = total ? Math.round((score / total) * 1000) / 10 : 0;
	const passMark = Number(quiz?.passMark) || 0;
	return { score, total, pct, passed: passMark ? pct >= passMark : null, answered, questions: items.length, items };
}

export const OPTION_TYPES = ['select', 'radio', 'checkbox'];
export const FILE_TYPES = ['file', 'photo'];
/** Drop every upload field (passport photo, documents) while uploads are switched off. */
export const withoutUploads = (fields) => (Array.isArray(fields) ? fields : []).filter((f) => UPLOADS_ENABLED || !FILE_TYPES.includes(f.type));

export const SCRATCH_BOARDS = ['WAEC', 'NECO'];
export const SSCE_BOARDS = ['WAEC', 'NECO', 'WAEC GCE', 'NECO GCE', 'NABTEB'];
export const MAX_SITTINGS = 2;
export const emptyScratch = () => ({ board: '', pin: '', serial: '', year: '' });

// Stable id so data saved against the on-the-fly converted field matches what the form editor saves later.
export const SCRATCH_FIELD_ID = 'scratch_card_info';
// Forms saved with plain boxes labelled EXAN NUMBER / EXAM YEAR / PIN / Serial Number (no "scratch" or "SSCE" in the label):
// those loose labels only count when the form also has an exam-number box, so an unrelated "PIN" box is never touched.
const looseExamNo = (f) => f.type !== 'ssceexams' && /^\s*(exam|exan)\s*(number|no)\b/i.test(f.label || '');
export const hasLooseExamNo = (list) => (list || []).some(looseExamNo);
const looseScratch = (f) => /^\s*(exam|exan)\s*year\b|^\s*(scratch\s*card\s*)?pin\b|^\s*(scratch\s*card\s*)?serial/i.test(f.label || '');
export const isLegacyScratch = (f, ctx = false) =>
	f.type !== 'scratchcards' && (/scratch|ssce\s*year/i.test(f.label || '') || (ctx && !['ssceexams', 'photo', 'file'].includes(f.type) && looseScratch(f)));

// SSCE exam number: exam type (WAEC/NECO) + exam number + exam year, up to two sittings.
export const emptySsce = () => ({ board: '', number: '', year: '' });
export const SSCE_FIELD_ID = 'ssce_exam_info';
export const isLegacySsce = (f) => f.type !== 'ssceexams' && (/ssce\s*exam\s*(number|no)/i.test(f.label || '') || looseExamNo(f));

export const PHOTO_FIELD_ID = 'passport_photo';
export const SSCE2_FIELD_ID = 'doc_ssce_2'; // second SSCE picture, revealed by the "Add SSCE" button
export const DOCS_FIELD_ID = 'other_documents'; // old single documents box, replaced by the three below
export const DOC_FIELDS = [
	{ id: 'doc_ssce', label: 'SSCE' },
	{ id: 'doc_birth_cert', label: 'BIRTH CERTIFICATE/AGE DECLARATION' },
	{ id: 'doc_testimonial', label: 'SECONDARY TESTIMONIAL' }
];

/** Make sure a form has a passport photograph and the three softcopy document uploads (added at the end if missing). */
export function ensureUploadFields(fields, { required = true, uploads = true } = {}) {
	if (!UPLOADS_ENABLED) return withoutUploads(fields);
	if (!uploads) return Array.isArray(fields) ? fields : []; // quizzes / questionnaires have no passport photo or documents
	const list = (Array.isArray(fields) ? fields : []).filter((f) => f.id !== DOCS_FIELD_ID);
	if (!list.some((f) => f.type === 'photo')) {
		list.push({ id: PHOTO_FIELD_ID, type: 'photo', label: 'PASSPORT PHOTOGRAPH', required, placeholder: '' });
	}
	const ours = DOC_FIELDS.map((d) => d.id);
	// forms that already have their own document upload fields are left alone
	if (!list.some((f) => f.type === 'file' && !ours.includes(f.id))) {
		for (const d of DOC_FIELDS) {
			if (!list.some((f) => f.id === d.id)) list.push({ id: d.id, type: 'file', label: d.label, required: false, placeholder: '' });
		}
	}
	// a second SSCE upload (second sitting), shown only after "Add SSCE" is tapped
	const si = list.findIndex((f) => f.id === 'doc_ssce');
	if (si >= 0 && !list.some((f) => f.id === SSCE2_FIELD_ID)) {
		list.splice(si + 1, 0, { id: SSCE2_FIELD_ID, type: 'file', label: 'SSCE (SECOND SITTING)', required: false, placeholder: '' });
	}
	return list;
}

/** Everything applied on the fly to forms saved before these fields existed. */
export const migrateFormFields = (fields, opts = {}) => opts.uploads === false ? withoutUploads(fields) : ensureUploadFields(migrateSsceFields(migrateScratchFields(fields, opts), opts), opts);

/**
 * Old forms stored separate scratch card / SSCE year boxes. Swap them for the grouped SCRATCH CARD INFO field
 * (WAEC/NECO dropdown, pin, serial, year, add second sitting) without needing the admin to re-save the form.
 * keepLegacy: leave the old fields in place too (admin tables), so older applications still show their data.
 */
export function migrateScratchFields(fields, { keepLegacy = false } = {}) {
	const list = Array.isArray(fields) ? fields : [];
	if (list.some((f) => f.type === 'scratchcards')) return list;
	const ctx = hasLooseExamNo(list);
	const isOld = (f) => isLegacyScratch(f, ctx);
	const firstIdx = list.findIndex(isOld);
	if (firstIdx < 0) return list;
	const scratch = { id: SCRATCH_FIELD_ID, type: 'scratchcards', label: 'SCRATCH CARD INFO', required: true, placeholder: '' };
	if (keepLegacy) return [...list.slice(0, firstIdx), scratch, ...list.slice(firstIdx)];
	const before = list.slice(0, firstIdx).filter((f) => !isOld(f)).length;
	const keep = list.filter((f) => !isOld(f));
	keep.splice(before, 0, scratch);
	return keep;
}

/** Old forms had a single SSCE EXAM NUMBER text box. Swap it for the grouped field (type dropdown, number, year, add exam). */
export function migrateSsceFields(fields, { keepLegacy = false } = {}) {
	const list = Array.isArray(fields) ? fields : [];
	if (list.some((f) => f.type === 'ssceexams')) return list;
	const idx = list.findIndex(isLegacySsce);
	if (idx < 0) return list;
	const ssce = { id: SSCE_FIELD_ID, type: 'ssceexams', label: list[idx].label || 'SSCE EXAM NUMBER', required: list[idx].required !== false, placeholder: '' };
	if (keepLegacy) return [...list.slice(0, idx), ssce, ...list.slice(idx)];
	const keep = [];
	list.forEach((f, i) => {
		if (i === idx) keep.push(ssce);
		else if (!isLegacySsce(f)) keep.push(f);
	});
	return keep;
}

/** Parse the submitted SSCE exam JSON into a clean array (empty sittings dropped, max 2). */
export function parseSsce(raw) {
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
			return { board: t('board'), number: t('number'), year: t('year') };
		})
		.filter((c) => c.board || c.number || c.year);
}

function validateSsce(exams) {
	const maxYear = new Date().getFullYear() + 1;
	for (let i = 0; i < exams.length; i++) {
		const c = exams[i];
		const n = `Exam ${i + 1}`;
		if (!SSCE_BOARDS.includes(c.board)) return `${n}: select an exam type.`;
		if (!c.number) return `${n}: enter the exam number.`;
		if (!/^\d{4}$/.test(c.year) || Number(c.year) < 1980 || Number(c.year) > maxYear) return `${n}: enter a valid 4-digit exam year.`;
	}
	return '';
}

/** One readable line per SSCE exam, e.g. "WAEC | Exam No: 4250101001 | Year: 2012". */
export function ssceLine(c) {
	return `${c.board || '?'} | Exam No: ${c.number || '-'} | Year: ${c.year || '-'}`;
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
		if (!SCRATCH_BOARDS.includes(c.board)) return `${n}: scratch cards are for WAEC or NECO exams only. Set the exam type to WAEC or NECO.`;
		if (!c.pin) return `${n}: enter the scratch card pin.`;
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
	return v.map((x) => (x && typeof x === 'object' ? ('number' in x ? ssceLine(x) : scratchLine(x)) : String(x))).join(sep);
}

export const STATES = [
	'Abia', 'Adamawa', 'Akwa Ibom', 'Anambra', 'Bauchi', 'Bayelsa', 'Benue', 'Borno',
	'Cross River', 'Delta', 'Ebonyi', 'Edo', 'Ekiti', 'Enugu', 'FCT - Abuja', 'Gombe',
	'Imo', 'Jigawa', 'Kaduna', 'Kano', 'Katsina', 'Kebbi', 'Kogi', 'Kwara', 'Lagos',
	'Nasarawa', 'Niger', 'Ogun', 'Ondo', 'Osun', 'Oyo', 'Plateau', 'Rivers', 'Sokoto',
	'Taraba', 'Yobe', 'Zamfara'
];

/** The state field an LGA field depends on: nearest one above it, else the first in the form (null if none). */
export function pairedStateField(fields, lgaField) {
	const i = fields.findIndex((x) => x.id === lgaField.id);
	for (let j = i - 1; j >= 0; j--) if (fields[j].type === 'state') return fields[j];
	return fields.find((x) => x.type === 'state') || null;
}

export const STATUSES = ['submitted', 'reviewed', 'approved', 'rejected', 'done'];

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
		case 'rating':
			return /^[1-5]$/.test(v) ? '' : 'Choose a rating from 1 to 5.';
		case 'select':
		case 'radio':
			return (field.options || []).includes(v) ? '' : 'Select a valid option.';
		case 'checkbox':
			return v.every((x) => (field.options || []).includes(x)) ? '' : 'Invalid selection.';
		case 'scratchcards':
			return validateScratch(v);
		case 'ssceexams':
			return validateSsce(v);
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


/**
 * Cards shown when viewing an application (admin modal and applicant page).
 * One card per value; SSCE exam / scratch card sittings each get their own card
 * (scratch card PIN and serial are separate rows). Empty old single-box fields are hidden.
 */
export function buildDetailItems(fields, data) {
	const list = fields || [];
	const grouped = list.some((f) => f.type === 'ssceexams' || f.type === 'scratchcards');
	const out = [];
	for (const f of list) {
		const v = data?.[f.id];
		const empty = v == null || v === '' || (Array.isArray(v) && !v.length);
		if (grouped && empty && f.type !== 'ssceexams' && f.type !== 'scratchcards' && (isLegacySsce(f) || isLegacyScratch(f, hasLooseExamNo(list)))) continue;
		if (empty && f.id === 'doc_ssce_2') continue;
		if (Array.isArray(v) && v.length && v.every((x) => x && typeof x === 'object')) {
			v.forEach((x, i) => {
				const line = 'number' in x ? ssceLine(x) : scratchLine(x);
				const tag = v.length > 1 ? (i === 0 ? ' (First sitting)' : ' (Second sitting)') : '';
				const item = { id: `${f.id}-${i}`, label: f.label + tag, v: line, text: 'number' in x ? x.number : line, second: i > 0 };
				if (!('number' in x)) {
					item.v = `${x.board} | Year: ${x.year}`;
					item.parts = [{ id: `${item.id}-pin`, label: 'PIN', value: x.pin }];
					if (x.board !== 'NECO' && x.serial) item.parts.push({ id: `${item.id}-serial`, label: 'Serial', value: x.serial });
				}
				out.push(item);
			});
			continue;
		}
		const text = v == null ? '' : Array.isArray(v) ? joinArray(v) : typeof v === 'object' ? '' : String(v);
		out.push({ id: f.id, label: f.label, v, text });
	}
	return out;
}


const isEmptyVal = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);
const sameVal = (a, b) => {
	if (isEmptyVal(a) && isEmptyVal(b)) return true;
	const norm = (v) => (v && typeof v === 'object' && !Array.isArray(v) && v.path ? `file:${v.path}` : JSON.stringify(v));
	return norm(a) === norm(b);
};
const showVal = (v) => {
	if (isEmptyVal(v)) return '(empty)';
	if (Array.isArray(v)) return joinArray(v, '; ').slice(0, 300);
	if (typeof v === 'object') return `File: ${v.name || 'uploaded file'}`;
	return String(v).slice(0, 300);
};

/** What changed between the stored data and the edited data: [{ label, from, to }] (empty when nothing changed). */
export function diffData(fields, before, after) {
	const out = [];
	for (const f of fields || []) {
		const a = before?.[f.id];
		const b = after?.[f.id];
		if (sameVal(a, b)) continue;
		out.push({ label: f.label, from: showVal(a), to: showVal(b) });
	}
	return out;
}
