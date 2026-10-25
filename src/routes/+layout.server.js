import { db } from '$lib/server/firebase.js';
import { readSession, SESSION_COOKIE } from '$lib/server/security.js';
import { studentName, isRegistration } from '$lib/forms.js';
import { programmeOf } from '$lib/sections.js';

// The signed-in applicant (if any), shared by every screen: status, name, notifications badge, bottom-nav targets.
export async function load({ cookies }) {
	const token = cookies.get(SESSION_COOKIE);
	if (!token) return { me: null };
	try {
		const number = readSession(token);
		if (!number) return { me: null };
		const snap = await db().collection('applications').doc(number).get();
		if (!snap.exists) return { me: null };
		const app = snap.data();
		const fsnap = await db().collection('forms').doc(app.formId).get();
		const form = fsnap.exists ? fsnap.data() : {};
		return {
			me: {
				number,
				formId: app.formId,
				title: form.title || '',
				kind: form.kind || 'registration',
				name: studentName(form, app),
				programme: programmeOf(form.fields, app.data),
				status: app.status,
				submittedAt: app.submittedAt,
				canEdit: isRegistration(form) && app.status !== 'done'
			}
		};
	} catch {
		return { me: null };
	}
}
