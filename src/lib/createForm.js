import { collection, doc, getDoc, getDocs, query, setDoc, where } from 'firebase/firestore';
import { firestore } from '$lib/firebase.js';

/** Creates a form, auto-resolving slug/prefix clashes. Returns the final slug. */
export async function createForm({ title, slug, prefix, fields, description = '', kind = 'registration', quiz = null }) {
	let finalSlug = slug;
	for (let n = 2; (await getDoc(doc(firestore, 'forms', finalSlug))).exists(); n++) finalSlug = `${slug}-${n}`;

	let finalPrefix = prefix;
	for (let n = 2; !(await getDocs(query(collection(firestore, 'forms'), where('prefix', '==', finalPrefix)))).empty; n++) {
		finalPrefix = `${prefix}-${n}`;
	}

	await setDoc(doc(firestore, 'forms', finalSlug), {
		title,
		description,
		prefix: finalPrefix,
		status: 'active',
		startDate: '',
		closingDate: '',
		allowEdits: kind === 'registration',
		kind,
		quiz,
		fields,
		counter: 0,
		createdAt: Date.now(),
		updatedAt: Date.now()
	});
	return { slug: finalSlug, prefix: finalPrefix };
}
