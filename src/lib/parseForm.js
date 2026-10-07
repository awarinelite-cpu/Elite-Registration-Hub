import { newFieldId, slugify } from '$lib/forms.js';

const NOISE = /\b(details?|forms?|registration|application)\b/gi;
const UPLOAD_WORDS = /send|upload|attach|softcopy|soft copy|scan|submit copies/i;
const GENDER = ['Male', 'Female'];
const MARITAL = ['Single', 'Married', 'Divorced', 'Widowed'];

function inferType(label) {
	const l = label.toLowerCase();
	if (/e-?mail/.test(l)) return 'email';
	if (/phone|mobile|whatsapp/.test(l)) return 'phone';
	if (/\bnin\b|national identi/.test(l)) return 'nin';
	if (/date of birth|\bdob\b|birth date|^date\b|date of /.test(l)) return 'date';
	if (/address/.test(l)) return 'textarea';
	if (/^state\b/.test(l)) return 'state';
	if (/local government|\blga\b/.test(l)) return 'lga';
	if (/^age\b/.test(l)) return 'number';
	if (/\bgender\b|^sex\b/.test(l) || /marital/.test(l)) return 'select';
	return 'text';
}

function defaultOptions(label) {
	if (/\bgender\b|^sex\b/i.test(label)) return GENDER;
	if (/marital/i.test(label)) return MARITAL;
	return [];
}

// "(optional)", "(if applicable)", "(personnel only)" make a field optional and become its placeholder note
const QUALIFIER = /\(\s*(optional|if applicable|if any|where applicable|personnel only|for personnel only)\s*\)/gi;

function cleanLabel(raw) {
	let label = raw.replace(/\s+/g, ' ').trim().replace(/[:\s_.-]+$/, '').trim();
	let required = true;
	let note = '';
	label = label.replace(QUALIFIER, (_, q) => {
		required = false;
		if (!note && !/^optional$/i.test(q)) note = /personnel/i.test(q) ? 'Personnel only' : 'If applicable';
		return '';
	});
	label = label.replace(/\s+/g, ' ').replace(/[:\s_.-]+$/, '').trim();
	return { label, required, note };
}

function makeField(label, { required = true, note = '', options = [], type } = {}) {
	const t = type || (options.length ? 'select' : inferType(label));
	const f = { id: newFieldId(), type: t, label, required, placeholder: note };
	if (t === 'select' || t === 'radio' || t === 'checkbox') f.options = options.length ? options : defaultOptions(label);
	return f;
}

/** "Label: value" line (form-style layout). The text after the colon is only a hint, except "A/B" which gives dropdown options. */
function fieldFromColonLine(line, section) {
	const idx = line.indexOf(':');
	const { label: rawLabel, required: r1, note: n1 } = cleanLabel(line.slice(0, idx));
	let value = line.slice(idx + 1);
	let required = r1;
	let note = n1;
	value = value.replace(QUALIFIER, (_, q) => {
		required = false;
		if (!note && !/^optional$/i.test(q)) note = /personnel/i.test(q) ? 'Personnel only' : 'If applicable';
		return '';
	});
	value = value.replace(/\[[^\]}]*[\]}]/g, '').replace(/\s+/g, ' ').trim();
	if (!rawLabel) return null;

	let label = rawLabel;
	let type;
	// bare "From:" / "To:" under a heading such as "Attendance Period"
	if (/^(from|to)$/i.test(label) && section) {
		label = `${section} (${label.charAt(0).toUpperCase()}${label.slice(1).toLowerCase()})`;
		type = 'date';
	}
	let options = [];
	if (/^[A-Za-z][A-Za-z .'-]*(\s*\/\s*[A-Za-z][A-Za-z .'-]*)+$/.test(value)) {
		options = value.split('/').map((s) => s.trim()).filter(Boolean);
	}
	return makeField(label, { required, note, options, type });
}

/**
 * Turn pasted text into { title, slug, prefix, fields }. Two layouts are understood:
 *
 *   Numbered list                         Form style ("Label:" lines)
 *   FUOYE DETAILS                         NIGERIAN ARMY COLLEGE OF NURSING (NACON)
 *   1. Surname:                           APPLICATION FORM.
 *   ...                                   Personal Information
 *   SEND SOFTCOPY OF                      Surname:
 *   1. Passport                           Title: Mr/Miss        (A/B after the colon = dropdown)
 *                                         Rank (if applicable): (qualifier = optional)
 *                                         SCANNED COPY
 *                                         1. Passport           (numbered lines after an upload heading = file uploads)
 */
export function parseFormText(text) {
	const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	const numbered = /^\(?\d+[.)\]]\s*(.+)$/;
	const bullet = /^[-•*]\s+(.+)$/;
	const isItem = (l) => numbered.test(l) || bullet.test(l);

	// upload headings: a heading word, no value after a colon, and a list of items right after it
	const oldMarker = (l) => !numbered.test(l) && UPLOAD_WORDS.test(l) && !/:\s*\S/.test(l);
	let markers = new Set(lines.map((l, i) => (oldMarker(l) && lines[i + 1] && isItem(lines[i + 1]) ? i : -1)).filter((i) => i >= 0));
	if (!markers.size) markers = new Set(lines.map((l, i) => (oldMarker(l) ? i : -1)).filter((i) => i >= 0));
	const firstMarker = markers.size ? Math.min(...markers) : lines.length;

	const hasNumbers = lines.some((l) => numbered.test(l));
	// numbered lines before the upload heading = old numbered-list layout; otherwise "Label:" lines are fields
	const numberedFields = lines.slice(0, firstMarker).some((l) => numbered.test(l));

	let title = '';
	let titleExtended = false;
	let section = '';
	let mode = 'fields';
	const fields = [];

	lines.forEach((line, i) => {
		const m = line.match(numbered) || (hasNumbers ? null : line.match(bullet));
		if (m) {
			const { label, required } = cleanLabel(m[1]);
			if (!label) return;
			if (mode === 'upload') {
				fields.push({ id: newFieldId(), type: /passport|photo/i.test(label) ? 'photo' : 'file', label: /passport/i.test(label) && !/photo/i.test(label) ? 'Passport photograph' : label, required, placeholder: '' });
			} else {
				fields.push({ id: newFieldId(), type: inferType(label), label, required, placeholder: '' });
			}
			return;
		}
		// un-numbered line: heading / title / "Label:" style field
		if (markers.has(i)) {
			mode = 'upload';
		} else if (!title && !hasNumbers && !line.endsWith(':') && !(!numberedFields && line.includes(':'))) {
			title = line;
		} else if (!title && hasNumbers && !fields.length && !(!numberedFields && line.includes(':'))) {
			title = line;
		} else if (mode === 'fields' && !numberedFields && line.includes(':')) {
			const f = fieldFromColonLine(line, section);
			if (f) fields.push(f);
		} else if (mode === 'fields' && !numberedFields && !line.includes(':')) {
			// heading lines: "APPLICATION FORM." completes the title, others ("Personal Information") label what follows
			if (title && !fields.length && !titleExtended && /application|registration/i.test(line) && !/\d/.test(line)) {
				title = `${title} ${line.replace(/[.:\s]+$/, '')}`;
				titleExtended = true;
			} else if (fields.length || title) {
				section = line.replace(/[.:\s]+$/, '');
			}
		} else if (!hasNumbers && line.endsWith(':')) {
			const { label, required } = cleanLabel(line);
			fields.push({ id: newFieldId(), type: inferType(label), label, required, placeholder: '' });
		}
	});

	title = title.replace(/[.:\s]+$/, '').trim() || 'New Registration';
	// an acronym in brackets, e.g. "(NACON)", makes a neat link and number prefix
	const acronym = title.match(/\(([A-Za-z]{2,10})\)/)?.[1];
	const base = acronym || title.replace(NOISE, ' ').replace(/\s+/g, ' ').trim() || title;
	return {
		title: /regist|apply|application|form/i.test(title) ? title : `${title.replace(NOISE, ' ').replace(/\s+/g, ' ').trim() || title} Registration`,
		slug: slugify(base) || 'registration',
		prefix: acronym ? acronym.toUpperCase() : slugify(base).toUpperCase().slice(0, 24) || 'REG',
		fields
	};
}
