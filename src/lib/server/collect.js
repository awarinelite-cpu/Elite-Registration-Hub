import { randomUUID } from 'node:crypto';
import { bucket } from './firebase.js';
import { FILE_TYPES, MAX_FILE_BYTES, MAX_TOTAL_BYTES, validateValue } from '$lib/forms.js';

const SAFE_NAME = (n) => n.replace(/[^a-zA-Z0-9._-]/g, '_').slice(-80);
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];

/**
 * Read + validate a submitted FormData against form.fields.
 * `existing` = previously stored data (for edits, to keep files that weren't replaced).
 * Returns { values, errors, uploads } where uploads are File objects to store.
 */
export function collect(fields, fd, existing = {}) {
	const values = {};
	const errors = {};
	const uploads = {};
	let total = 0;

	for (const f of fields) {
		const key = `f_${f.id}`;
		if (FILE_TYPES.includes(f.type)) {
			const file = fd.get(key);
			if (file && typeof file !== 'string' && file.size > 0) {
				if (file.size > MAX_FILE_BYTES) errors[f.id] = 'File is too large (max 1.5 MB).';
				else if (!ALLOWED_MIME.includes(file.type)) errors[f.id] = 'Only JPG, PNG, WebP or PDF files are allowed.';
				else if (f.type === 'photo' && !file.type.startsWith('image/')) errors[f.id] = 'Passport photo must be an image.';
				else {
					total += file.size;
					uploads[f.id] = file;
				}
			} else if (existing[f.id]) {
				values[f.id] = existing[f.id];
			} else if (f.required) {
				errors[f.id] = 'This file is required.';
			}
			continue;
		}
		const raw = f.type === 'checkbox' ? fd.getAll(key).map(String) : String(fd.get(key) ?? '').trim();
		const err = validateValue(f, raw);
		if (err) errors[f.id] = err;
		else values[f.id] = raw;
	}
	if (total > MAX_TOTAL_BYTES) errors._form = 'Total upload size is too large (max 4 MB).';
	return { values, errors, uploads };
}

export async function storeUploads(formId, uploads) {
	const out = {};
	for (const [id, file] of Object.entries(uploads)) {
		const path = `uploads/${formId}/${randomUUID()}-${SAFE_NAME(file.name)}`;
		await bucket().file(path).save(Buffer.from(await file.arrayBuffer()), { contentType: file.type, resumable: false });
		out[id] = { name: file.name, path, size: file.size, type: file.type };
	}
	return out;
}
