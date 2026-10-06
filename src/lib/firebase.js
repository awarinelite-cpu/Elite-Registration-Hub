import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is not a secret (access is enforced by security rules).
// Environment variables override these defaults.
const e = import.meta.env;
const app = getApps()[0] ?? initializeApp({
	apiKey: e.VITE_FIREBASE_API_KEY || 'AIzaSyBiR5sJJ-CkPAuP6pzsus61ygZ6yRuwI5Y',
	authDomain: e.VITE_FIREBASE_AUTH_DOMAIN || 'wavify-faa2c.firebaseapp.com',
	projectId: e.VITE_FIREBASE_PROJECT_ID || 'wavify-faa2c',
	storageBucket: e.VITE_FIREBASE_STORAGE_BUCKET || 'wavify-faa2c.firebasestorage.app',
	messagingSenderId: e.VITE_FIREBASE_MESSAGING_SENDER_ID || '172346596147',
	appId: e.VITE_FIREBASE_APP_ID || '1:172346596147:web:f02dd765925bf54cb73c46'
});

export const auth = getAuth(app);
export const firestore = getFirestore(app, e.VITE_FIRESTORE_DATABASE_ID || 'elitereg');
