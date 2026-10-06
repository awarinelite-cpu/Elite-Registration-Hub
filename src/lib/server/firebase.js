import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

function app() {
	if (getApps().length) return getApps()[0];
	if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
	const sa = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
	return initializeApp({
		credential: cert(sa),
		storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${sa.project_id}.firebasestorage.app`
	});
}

export const db = () => getFirestore(app());
export const bucket = () => getStorage(app()).bucket();
export const adminAuth = () => getAuth(app());
