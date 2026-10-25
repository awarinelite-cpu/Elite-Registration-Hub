import { db } from './firebase.js';
import { closedReason, isRegistration } from '../forms.js';

/** Registration forms that are open for applications right now: [{ id, title, description, closing }] */
export async function openRegistrationForms() {
	try {
		const snap = await db().collection('forms').where('status', '==', 'active').get();
		return snap.docs
			.map((d) => ({ id: d.id, ...d.data() }))
			.filter((f) => isRegistration(f) && !closedReason(f))
			.map((f) => ({ id: f.id, title: f.title, description: f.description || '', closing: f.closingDate || '' }));
	} catch {
		return [];
	}
}
