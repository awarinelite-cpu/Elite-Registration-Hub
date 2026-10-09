import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

// Firebase web config is not a secret (access is enforced by security rules).
const app = getApps()[0] ?? initializeApp({
	apiKey: 'AIzaSyBg97jU_6an58a0k-YtKAbm_56dScVhHRI',
	authDomain: 'elitereghub.firebaseapp.com',
	projectId: 'elitereghub',
	storageBucket: 'elitereghub.firebasestorage.app',
	messagingSenderId: '415231096216',
	appId: '1:415231096216:web:3eac14811d91b9c62da7ed'
});

export const auth = getAuth(app);
export const firestore = getFirestore(app, '(default)');
