import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is not a secret (access is enforced by security rules).
// Environment variables override these defaults.
const e = import.meta.env;
const app = getApps()[0] ?? initializeApp({
	apiKey: e.VITE_FIREBASE_API_KEY || 'AIzaSyAB8yCfmdvOTWRpj50Hhc7AWuabWLDvy6k',
	authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || 'nacon-post-utme-past-question.firebaseapp.com',
	projectId: e.VITE_FIREBASE_PROJECT_ID || 'nacon-post-utme-past-question',
	storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET || 'nacon-post-utme-past-question.firebasestorage.app',
	messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID || '1090299637128',
	appId: e.VITE_FIREBASE_APP_ID || '1:1090299637128:web:e01e6f4e0946dbcb9fde3d'
});

export const auth = getAuth(app);
export const firestore = getFirestore(app, e.VITE_FIRESTORE_DATABASE_ID || 'elitereg');
