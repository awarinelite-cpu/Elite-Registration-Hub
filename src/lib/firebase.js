import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const e = import.meta.env;
const app = getApps()[0] ?? initializeApp({
	apiKey: e.VITE_FIREBASE_API_KEY,
	authDomain: e.VITE_FIREBASE_AUTH_DOMAIN,
	projectId: e.VITE_FIREBASE_PROJECT_ID,
	appId: e.VITE_FIREBASE_APP_ID
});

export const auth = getAuth(app);
export const firestore = getFirestore(app);
