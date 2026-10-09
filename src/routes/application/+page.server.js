import { fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { collect, storeUploads } from '$lib/server/collect.js';
import { readSession, SESSION_COOKIE } from '$lib/server/security.js';
import { diffData, studentName, SCRATCH_FIELD_ID, SSCE_FIELD_ID, migrateScratchFields, migrateSsceFields, ensureUploadFields, isRegistration, publicFields, scoreForm } from '$lib/forms.js';

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
	if (app.data?.[SSCE_FIELD_ID]) form.fields = migrateSsceFields(form.fields);
	// every applicant can add a passport photograph / softcopy documents after submitting (optional here, so old applications can still be edited)
	if (isRegistration(form)) form.fields = ensureUploadFields(form.fields, { required: false });
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
	const show = form.quiz?.showResult || 'answers';
	const scored = form.kind === 'quiz' && (show === 'answers' || app.mode === 'reading') ? scoreForm(form.fields, app.data, form.quiz, app.asked) : null;
	return {
		kind: form.kind || 'registration',
		result: form.kind === 'quiz' && show !== 'none' ? app.result || null : null,
		review: scored ? scored.items.map(({ id, label, given, answer, correct, ok, unanswered, explanation }) => ({ id, label, given, answer, correct, ok, unanswered, explanation })) : null,
		title: form.title,
		formId: app.formId,
		name: studentName(form, app),
		fields: publicFields(form.fields),
		data: app.data,
		values,
		files,
		applicationNumber: app.applicationNumber,
		status: app.status,
		submittedAt: app.submittedAt,
		// editable until the admin marks it "done" (admin can untick Done to unlock it again)
		canEdit: isRegistration(form) && app.status !== 'done'
	};
}

export const actions = {
	update: async ({ request, cookies }) => {
		const { appRef, app, form } = await current(cookies);
		if (!isRegistration(form)) return fail(403, { message: 'Answers cannot be changed after submitting.' });
		if (app.status === 'done') {
			return fail(403, { message: 'This application is marked done and is locked. Contact the admin if you need a change.' });
		}
		const fd = await request.formData();
		const { values, errors, uploads } = collect(form.fields, fd, app.data);
		if (Object.keys(errors).length) return fail(400, { message: errors._form || 'Please correct the highlighted fields.', errors, values });
		const files = await storeUploads(app.formId, uploads);
		const next = { ...values, ...files };
		const now = Date.now();
		const patch = { data: next, updatedAt: now };
		// re-edit history (admin only): what changed and when. Nothing is logged if nothing actually changed.
		const changes = diffData(form.fields, app.data, next);
		if (changes.length) patch.edits = [...(app.edits || []), { at: now, changes }].slice(-50);
		await appRef.update(patch);
		return { saved: true };
	},
	logout: async ({ cookies }) => {
		cookies.delete(SESSION_COOKIE, { path: '/' });
		redirect(303, '/login');
	}
};
