import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { collect, storeUploads } from '$lib/server/collect.js';
import { readSession, SESSION_COOKIE } from '$lib/server/security.js';
import { closedReason } from '$lib/forms.js';

async function current(cookies) {
	const number = readSession(cookies.get(SESSION_COOKIE));
	if (!number) redirect(303, '/login');
	const appRef = db().collection('applications').doc(number);
	const appSnap = await appRef.get();
	if (!appSnap.exists) redirect(303, '/login');
	const app = appSnap.data();
	const formSnap = await db().collection('forms').doc(app.formId).get();
	return { appRef, app, form: formSnap.data() };
}

export async function load({ cookies }) {
	const { app, form } = await current(cookies);
	const files = {};
	const values = {};
	for (const f of form.fields) {
		const v = app.data[f.id];
		if (v && typeof v === 'object' && !Array.isArray(v)) files[f.id] = { name: v.name };
		else if (v !== undefined) values[f.id] = v;
	}
	const closed = closedReason(form);
	return {
		title: form.title,
		fields: form.fields,
		values,
		files,
		applicationNumber: app.applicationNumber,
		status: app.status,
		submittedAt: app.submittedAt,
		canEdit: !!form.allowEdits && !closed && app.status === 'submitted',
		closed
	};
}

export const actions = {
	update: async ({ request, cookies }) => {
		const { appRef, app, form } = await current(cookies);
		if (!form.allowEdits || closedReason(form) || app.status !== 'submitted') {
			return fail(403, { message: 'Editing is no longer allowed for this application.' });
		}
		const fd = await request.formData();
		const { values, errors, uploads } = collect(form.fields, fd, app.data);
		if (Object.keys(errors).length) return fail(400, { message: errors._form || 'Please correct the highlighted fields.', errors, values });
		const files = await storeUploads(app.formId, uploads);
		await appRef.update({ data: { ...values, ...files }, updatedAt: Date.now() });
		return { saved: true };
	},
	logout: async ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
