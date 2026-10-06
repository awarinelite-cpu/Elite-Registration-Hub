import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { collect, storeUploads } from '$lib/server/collect.js';
import { readSession, SESSION_COOKIE } from '$lib/server/security.js';
import { closedReason, FILE_TYPES, SCRATCH_FIELD_ID, migrateScratchFields, ensureUploadFields } from '$lib/forms.js';

async function current(cookies) {
	const number = readSession(cookies.get(SESSION_COOKIE));
	if (!number) redirect(303, '/login');
	const appRef = db().collection('applications').doc(number);
	const appSnap = await appRef.get();
	if (!appSnap.exists) redirect(303, '/login');
	const app = appSnap.data();
	const formSnap = await db().collection('forms').doc(app.formId).get();
	const form = formSnap.data();
	// applications submitted with the converted scratch card field keep seeing it; older ones keep their old fields
	if (app.data?.[SCRATCH_FIELD_ID]) form.fields = migrateScratchFields(form.fields);
	// every applicant can add a passport photograph / softcopy documents after submitting (optional here, so old applications can still be edited)
	form.fields = ensureUploadFields(form.fields, { required: false });
	return { appRef, app, form };
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
		// documents can be attached/replaced until the application is approved or rejected
		canUpload: ['submitted', 'reviewed'].includes(app.status) && form.fields.some((f) => FILE_TYPES.includes(f.type)),
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
	uploadDocs: async ({ request, cookies }) => {
		const { appRef, app, form } = await current(cookies);
		if (!['submitted', 'reviewed'].includes(app.status)) {
			return fail(403, { message: 'Documents can no longer be added to this application.' });
		}
		// only file fields, none forced to be required (students may add them one at a time)
		const fileFields = form.fields.filter((f) => FILE_TYPES.includes(f.type)).map((f) => ({ ...f, required: false }));
		const fd = await request.formData();
		const { errors, uploads } = collect(fileFields, fd, app.data);
		if (Object.keys(errors).length) return fail(400, { message: errors._form || 'Please correct the highlighted files.', errors });
		if (!Object.keys(uploads).length) return fail(400, { message: 'Choose at least one file to upload.', errors: {} });
		const files = await storeUploads(app.formId, uploads);
		const patch = { updatedAt: Date.now() };
		for (const [id, meta] of Object.entries(files)) patch[`data.${id}`] = meta;
		await appRef.update(patch);
		return { uploaded: true };
	},
	logout: async ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
