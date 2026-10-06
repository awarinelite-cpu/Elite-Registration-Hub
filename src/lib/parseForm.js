import { newFieldId, slugify } from '$lib/forms.js';

const NOISE = /\b(details?|forms?|registration|application)\b/gi;

function inferType(label) {
	const l = label.toLowerCase();
	if (/e-?mail/.test(l)) return 'email';
	if (/phone|mobile|whatsapp/.test(l)) return 'phone';
	if (/\bnin\b|national identi/.test(l)) return 'nin';
	if (/date of birth|\bdob\b|birth date/.test(l)) return 'date';
	if (/address/.test(l)) return 'textarea';
	if (/^state\b/.test(l)) return 'state';
	if (/local government|\blga\b/.test(l)) return 'lga';
	return 'text';
}

function cleanLabel(raw) {
	let label = raw.replace(/\s+/g, ' ').trim().replace(/[:\s_.-]+$/, '').trim();
	let required = true;
	if (/\((optional)\)/i.test(label)) {
		required = false;
		label = label.replace(/\s*\(optional\)/i, '').trim();
	}
	return { label, required };
}

/**
 * Turn pasted text like:
 *   FUOYE DETAILS
 *   1. Surname:
 *   ...
 *   SEND SOFTCOPY OF
 *   1. Passport
 * into { title, slug, prefix, fields }.
 */
export function parseFormText(text) {
	const lines = text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
	const numbered = /^\(?\d+[.)\]]\s*(.+)$/;
	const bullet = /^[-•*]\s+(.+)$/;

	let title = '';
	let mode = 'fields';
	const fields = [];

	const hasNumbers = lines.some((l) => numbered.test(l));

	for (const line of lines) {
		const m = line.match(numbered) || (hasNumbers ? null : line.match(bullet));
		if (m) {
			const { label, required } = cleanLabel(m[1]);
			if (!label) continue;
			if (mode === 'upload') {
				fields.push({ id: newFieldId(), type: /passport|photo/i.test(label) ? 'photo' : 'file', label: /passport/i.test(label) && !/photo/i.test(label) ? 'Passport photograph' : label, required, placeholder: '' });
			} else {
				fields.push({ id: newFieldId(), type: inferType(label), label, required, placeholder: '' });
			}
			continue;
		}
		// un-numbered line: section header / title / "Label:" style field
		if (/send|upload|attach|softcopy|soft copy|scan|submit copies/i.test(line) && !/:\s*\S/.test(line)) {
			mode = 'upload';
		} else if (!title && !hasNumbers && !line.endsWith(':')) {
			title = line;
		} else if (!title && hasNumbers && !fields.length) {
			title = line;
		} else if (!hasNumbers && line.endsWith(':')) {
			const { label, required } = cleanLabel(line);
			fields.push({ id: newFieldId(), type: inferType(label), label, required, placeholder: '' });
		}
	}

	title = title.replace(/[:\s]+$/, '').trim() || 'New Registration';
	const base = title.replace(NOISE, ' ').replace(/\s+/g, ' ').trim() || title;
	return {
		title: /regist|apply|application|form/i.test(title) ? title : `${base} Registration`,
		slug: slugify(base) || 'registration',
		prefix: slugify(base).toUpperCase().slice(0, 24) || 'REG',
		fields
	};
}
