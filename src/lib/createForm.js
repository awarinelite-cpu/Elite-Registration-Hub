import { doc, setDoc } from 'firebase/firestore';
import { auth, firestore } from '$lib/firebase.js';
import { adminFetch } from '$lib/adminSession.svelte.js';

/** Creates a form, auto-resolving slug/prefix clashes. Returns the final slug. */
export async function createForm({ title, slug, prefix, fields, description = '', kind = 'registration', quiz = null, softcopy = [] }) {
	// slug / prefix must be unique across ALL forms (checked server-side so sub-admins needn't read others' forms)
	const taken = async (s, p) => (await adminFetch(`/api/admin/check?slug=${encodeURIComponent(s)}&prefix=${encodeURIComponent(p)}`));
	let finalSlug = slug;
	for (let n = 2; (await taken(finalSlug, '')).slugTaken; n++) finalSlug = `${slug}-${n}`;

	let finalPrefix = prefix;
	for (let n = 2; (await taken('', finalPrefix)).prefixTaken; n++) finalPrefix = `${prefix}-${n}`;

	await setDoc(doc(firestore, 'forms', finalSlug), {
		title,
		ownerId: auth.currentUser.uid,
		description,
		prefix: finalPrefix,
		status: 'active',
		startDate: '',
		closingDate: '',
		allowEdits: kind === 'registration',
		kind,
		quiz,
		softcopy,
		fields,
		counter: 0,
		createdAt: Date.now(),
		updatedAt: Date.now()
	});
	return { slug: finalSlug, prefix: finalPrefix };
}
