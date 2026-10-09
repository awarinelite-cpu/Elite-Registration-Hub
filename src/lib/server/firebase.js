import { initializeApp, cert, getApps } from 'firebase-admin/app';
import { getFirestore } from 'firebase-admin/firestore';
import { getStorage } from 'firebase-admin/storage';
import { getAuth } from 'firebase-admin/auth';

// The service-account key is a SECRET (full admin access). It must stay in the
// FIREBASE_SERVICE_ACCOUNT environment variable and never be committed to GitHub.
// Everything else (project, bucket, database) is fixed here.
const PROJECT_ID = 'elitereghub';
const BUCKET = 'elitereghub.firebasestorage.app';
const DATABASE_ID = '(default)';

export function serviceAccount() {
	if (!process.env.FIREBASE_SERVICE_ACCOUNT) throw new Error('FIREBASE_SERVICE_ACCOUNT is not set');
	return JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
}

function app() {
	if (getApps().length) return getApps()[0];
	return initializeApp({ credential: cert(serviceAccount()), projectId: PROJECT_ID, storageBucket: BUCKET });
}

export const db = () => getFirestore(app(), DATABASE_ID);
export const bucket = () => getStorage(app()).bucket();
export const adminAuth = () => getAuth(app());
