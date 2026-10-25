import { db } from '$lib/server/firebase.js';
import { openRegistrationForms } from '$lib/server/openForms.js';
import { migrateFormFields, isRegistration } from '$lib/forms.js';
import { isExam, titleCase } from '$lib/sections.js';

// Shown when no form can be found, so the screen is never empty.
const DEFAULT_DOCS = [
	{ label: 'WAEC/NECO Scratch Card', required: true },
	{ label: 'Recent Passport Photograph', required: true },
	{ label: 'Birth Certificate / Age Declaration', required: true },
	{ label: 'Local Government Certificate', required: true },
	{ label: "O'Level Result(s)", required: true },
	{ label: 'Other Supporting Documents', required: false }
];

export async function load({ url }) {
	let docs = DEFAULT_DOCS;
	try {
		const wanted = url.searchParams.get('form');
		const open = await openRegistrationForms();
		const id = wanted || (open.length === 1 ? open[0].id : '');
		if (id) {
			const snap = await db().collection('forms').doc(id).get();
			if (snap.exists && isRegistration(snap.data())) {
				const { fields, softcopy = [] } = snap.data();
				const list = migrateFormFields(fields, { uploads: true, softcopy });
				const out = [];
				const exam = list.find(isExam);
				if (exam) out.push({ label: 'WAEC/NECO Scratch Card', required: !!exam.required });
				for (const f of list) {
					if (f.id === 'doc_ssce_2') continue;
					if (f.type === 'photo') out.push({ label: 'Recent Passport Photograph', required: !!f.required });
					else if (f.type === 'file') out.push({ label: titleCase(f.label), required: !!f.required });
				}
				if (out.length) docs = out;
			}
		}
	} catch {
		/* fall back to the default list */
	}
	return { docs };
}
