import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is not a secret (access is enforced by security rules).
// Environment variables override these defaults.
const e = import.meta.env;
const app = getApps()[0] ?? initializeApp({
	apiKey: e.VITE_FIREBASE_API_KEY || 'AIzaSyBg97jU_6an58a0k-YtKAbm_56dScVhHRI',
	authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || 'elitereghub.firebaseapp.com',
	projectId: e.VITE_FIREBASE_PROJECT_ID || 'elitereghub',
	storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET || 'elitereghub.firebasestorage.app',
	messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID || '415231096216',
	appId: e.VITE_FIREBASE_APP_ID || '1:415231096216:web:3eac14811d91b9c62da7ed'
});

export const auth = getAuth(app);
export const firestore = getFirestore(app, e.VITE_FIRESTORE_DATABASE_ID || '(default)');
