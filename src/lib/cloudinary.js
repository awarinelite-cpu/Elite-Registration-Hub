// Direct browser -> Cloudinary uploads (unsigned preset, free plan). Only the resulting link is saved in Firestore.
// Set in Vercel -> Settings -> Environment Variables:
//   PUBLIC_CLOUDINARY_CLOUD_NAME     e.g. dxxxxxxxx
//   PUBLIC_CLOUDINARY_UPLOAD_PRESET  name of an UNSIGNED upload preset
import * as env from '$app/env/public';

// read lazily (at call time): dynamic public values arrive in the browser after this module loads
export const cloudName = () => (env.PUBLIC_CLOUDINARY_CLOUD_NAME || '').trim();
export const uploadPreset = () => (env.PUBLIC_CLOUDINARY_UPLOAD_PRESET || '').trim();
/** True once both env vars are set. Upload fields only appear on forms when this is true. */
export const cloudinaryReady = () => !!(cloudName() && uploadPreset());

/** Only links on OUR Cloudinary account are ever accepted/stored. */
export function isOurUrl(url) {
	try {
		const u = new URL(String(url));
		return u.protocol === 'https:' && u.hostname === 'res.cloudinary.com' && u.pathname.startsWith(`/${cloudName()}/`);
	} catch {
		return false;
	}
}

/** Link that makes the browser save the file instead of showing it. */
export function downloadUrl(url, filename = '') {
	const name = String(filename).replace(/\.[^.]+$/, '').replace(/[^a-zA-Z0-9_-]+/g, '_').slice(0, 80);
	return String(url).replace('/upload/', `/upload/fl_attachment${name ? ':' + name : ''}/`);
}

/**
 * Upload one file; resolves { name, url, size, type, publicId }. onProgress gets 0-100.
 * @param {File} file
 * @param {{ folder?: string, onProgress?: (pct: number) => void }} opts
 */
export function uploadToCloudinary(file, { folder = 'elitereg', onProgress } = {}) {
	return new Promise((resolve, reject) => {
		if (!cloudinaryReady()) return reject(new Error('File upload is not set up yet. Please tell the admin.'));
		const fd = new FormData();
		fd.append('file', file);
		fd.append('upload_preset', uploadPreset());
		fd.append('folder', folder);
		const xhr = new XMLHttpRequest();
		xhr.open('POST', `https://api.cloudinary.com/v1_1/${encodeURIComponent(cloudName())}/auto/upload`);
		xhr.upload.onprogress = (e) => e.lengthComputable && onProgress?.(Math.round((e.loaded / e.total) * 100));
		xhr.onerror = () => reject(new Error('Network problem while uploading. Check your connection and try again.'));
		xhr.onload = () => {
			let body = {};
			try { body = JSON.parse(xhr.responseText); } catch {}
			if (xhr.status >= 200 && xhr.status < 300 && body.secure_url) {
				resolve({ name: file.name, url: body.secure_url, size: file.size, type: file.type, publicId: body.public_id || '' });
			} else {
				reject(new Error(body?.error?.message ? `Upload failed: ${body.error.message}` : 'Upload failed. Please try again.'));
			}
		};
		xhr.send(fd);
	});
}
