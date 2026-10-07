import { error, fail } from '@sveltejs/kit';
import { db } from '$lib/server/firebase.js';
import { collect, storeUploads } from '$lib/server/collect.js';
import { hashPin, newPin } from '$lib/server/security.js';
import { closedReason, migrateFormFields, studentName } from '$lib/forms.js';

async function getForm(slug) {
	const snap = await db().collection('forms').doc(slug).get();
	if (!snap.exists) error(404, 'Form not found');
	const { title, description, status, startDate, closingDate, fields, prefix, counter } = snap.data();
	return { id: slug, title, description, status, startDate, closingDate, fields: migrateFormFields(fields), prefix, counter };
}

export async function load({ params }) {
	const form = await getForm(params.slug);
	if (form.status === 'draft') error(404, 'Form not found');
	return { form: { id: form.id, title: form.title, description: form.description, fields: form.fields }, closed: closedReason(form) };
}

export const actions = {
	default: async ({ request, params }) => {
		const form = await getForm(params.slug);
		const reason = closedReason(form);
		if (reason) return fail(403, { message: reason, errors: {}, values: {} });

		const fd = await request.formData();
		const { values, errors, uploads } = collect(form.fields, fd);
		if (Object.keys(errors).length) {
			// echo back non-file values so the student doesn't retype
			return fail(400, { message: errors._form || 'Please correct the highlighted fields.', errors, values });
		}

		const files = await storeUploads(form.id, uploads);
		const pin = newPin();
		const pinHash = hashPin(pin);
		const formRef = db().collection('forms').doc(form.id);

		const applicationNumber = await db().runTransaction(async (t) => {
			const snap = await t.get(formRef);
			const next = (snap.data().counter || 0) + 1;
			const num = `${snap.data().prefix}-${String(next).padStart(4, '0')}`;
			const appRef = db().collection('applications').doc(num);
			if ((await t.get(appRef)).exists) throw new Error('Application number collision');
			t.update(formRef, { counter: next });
			t.set(appRef, {
				formId: form.id,
				applicationNumber: num,
				pinHash,
				status: 'submitted',
				submittedAt: Date.now(),
				updatedAt: Date.now(),
				failedAttempts: 0,
				lockUntil: 0,
				data: { ...values, ...files }
			});
			return num;
		});

		// PIN is shown exactly once and never stored in plain text.
		return { success: true, applicationNumber, pin, title: form.title, name: studentName(form, { data: values }) };
	}
};
