// Groups a registration form's fields into the screens of the app:
// Personal Details, Academic Details, Contact Details, Next of Kin, Documents.
// Forms are built by the admin, so grouping is by field type first and label second.
import { buildDetailItems } from './forms.js';

const ACADEMIC = /programme|program\b|course|department|faculty|jamb|utme|institution|school|qualification|level|subject|o'?\s?level|ssce|waec|neco|grade|result|reg(istration)?\s*(no|number)|exam/i;
const CONTACT = /phone|mobile|whatsapp|e-?mail|address|contact|residen|town|city|postal|zip/i;
const KIN = /kin|guardian|referee|sponsor|parent|spouse/i;

export const isExam = (f) => f.type === 'scratchcards' || f.type === 'ssceexams';

/** personal | academic | contact | kin | docs | exam */
export function sectionOf(f) {
	if (f.type === 'file' || f.type === 'photo') return 'docs';
	if (isExam(f)) return 'exam';
	if (f.type === 'state' || f.type === 'lga') return 'personal';
	const label = f.label || '';
	if (KIN.test(label)) return 'kin';
	if (f.type === 'phone' || f.type === 'email' || CONTACT.test(label)) return 'contact';
	if (ACADEMIC.test(label)) return 'academic';
	return 'personal';
}

const META = {
	personal: { title: 'Personal Details', icon: 'user', hint: 'Fill in your personal information as it appears on your documents.' },
	academic: { title: 'Academic Details', icon: 'graduation', hint: 'Tell us about your academic background.' },
	contact: { title: 'Contact Details', icon: 'phone', hint: 'Tell us how we can reach you.' },
	kin: { title: 'Next of Kin', icon: 'users', hint: '' },
	docs: { title: 'Upload Documents', icon: 'upload', hint: 'Upload clear copies of your documents.' }
};
export const sectionMeta = (key) => META[key];

/** The steps of the New Application wizard. Empty steps are skipped; "Review & Submit" is always last. */
export function wizardSteps(fields) {
	const by = (keys) => fields.filter((f) => keys.includes(sectionOf(f))).map((f) => f.id);
	const steps = [
		{ key: 'personal', title: 'Personal Details', hint: META.personal.hint, ids: by(['personal']) },
		{ key: 'academic', title: 'Academic Details', hint: META.academic.hint, ids: by(['academic']) },
		{ key: 'contact', title: 'Contact Details', hint: META.contact.hint, ids: by(['contact', 'kin']) }
	].filter((s) => s.ids.length);
	steps.push({ key: 'review', title: 'Review & Submit', hint: 'Upload your documents, enter your exam details and submit.', ids: by(['docs', 'exam']) });
	return steps;
}

const isEmpty = (v) => v == null || v === '' || (Array.isArray(v) && !v.length);

/** Application sections for the "My Application" screen: [{ key, title, icon, complete, items }] */
export function applicationSections(fields, data) {
	const items = buildDetailItems(fields, data);
	const owner = (item) => fields.find((f) => f.id === item.id || item.id.startsWith(f.id + '-'));
	const out = [];
	for (const key of ['personal', 'academic', 'contact', 'kin', 'docs']) {
		const mine = fields.filter((f) => (sectionOf(f) === 'exam' ? 'academic' : sectionOf(f)) === key);
		if (!mine.length) continue;
		const required = mine.filter((f) => f.required);
		const test = required.length ? required : mine;
		const complete = test.every((f) => !isEmpty(data?.[f.id]));
		out.push({ key, ...META[key], complete, items: items.filter((it) => mine.includes(owner(it))) });
	}
	return out;
}

/** Programme / course the applicant applied for, if the form asks for one. */
export function programmeOf(fields, data) {
	const f = (fields || []).find((x) => /programme|program\b|course of study|department/i.test(x.label || '') && typeof data?.[x.id] === 'string' && data[x.id].trim());
	return f ? data[f.id].trim() : '';
}

export const titleCase = (s) =>
	String(s || '')
		.toLowerCase()
		.replace(/(^|[\s/(-])([a-z])/g, (_, a, b) => a + b.toUpperCase());
