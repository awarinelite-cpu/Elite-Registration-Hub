import { serviceAccount } from './firebase.js';
import { scryptSync, randomBytes, timingSafeEqual, createHmac, randomInt, createCipheriv, createDecipheriv, createHash } from 'node:crypto';

export const newPin = () => String(randomInt(100000, 1000000));

export function hashPin(pin) {
	const salt = randomBytes(16).toString('hex');
	return `${salt}:${scryptSync(pin, salt, 32).toString('hex')}`;
}

export function checkPin(pin, stored) {
	if (!stored || !pin) return false;
	const [salt, hash] = stored.split(':');
	const a = Buffer.from(scryptSync(String(pin), salt, 32).toString('hex'));
	const b = Buffer.from(hash);
	return a.length === b.length && timingSafeEqual(a, b);
}

// No separate SESSION_SECRET needed: the signing key is derived from the service-account
// private key (server-only). An explicit SESSION_SECRET still wins if you set one.
let derived;
function secret() {
	if (process.env.SESSION_SECRET) return process.env.SESSION_SECRET;
	return (derived ??= createHmac('sha256', serviceAccount().private_key).update('elitereg-session-v1').digest('hex'));
}

function sig(payload) {
	return createHmac('sha256', secret()).update(payload).digest('base64url');
}

const SESSION_MS = 2 * 60 * 60 * 1000;
export const SESSION_COOKIE = 'elitereg_session';
export const SESSION_SECONDS = SESSION_MS / 1000;

export function makeSession(applicationNumber) {
	const payload = Buffer.from(JSON.stringify({ n: applicationNumber, e: Date.now() + SESSION_MS })).toString('base64url');
	return `${payload}.${sig(payload)}`;
}

/** Returns the application number or null. */
export function readSession(token) {
	if (!token || !token.includes('.')) return null;
	const [payload, given] = token.split('.');
	const expected = sig(payload);
	const a = Buffer.from(given);
	const b = Buffer.from(expected);
	if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
	try {
		const { n, e } = JSON.parse(Buffer.from(payload, 'base64url').toString());
		return e > Date.now() ? n : null;
	} catch {
		return null;
	}
}

// Recoverable copy of the PIN so an admin can re-send it to a student who forgot it.
// AES-256-GCM, key derived from the server-only secret; the browser only ever sees ciphertext.
const pinKey = () => createHash('sha256').update('elitereg-pin-v1:' + secret()).digest();

export function encryptPin(pin) {
	const iv = randomBytes(12);
	const c = createCipheriv('aes-256-gcm', pinKey(), iv);
	const enc = Buffer.concat([c.update(String(pin), 'utf8'), c.final()]);
	return [iv, c.getAuthTag(), enc].map((b) => b.toString('base64url')).join('.');
}

/** Returns the PIN, or null when there is no (readable) copy. */
export function decryptPin(stored) {
	try {
		if (!stored) return null;
		const [iv, tag, enc] = stored.split('.').map((x) => Buffer.from(x, 'base64url'));
		const d = createDecipheriv('aes-256-gcm', pinKey(), iv);
		d.setAuthTag(tag);
		return Buffer.concat([d.update(enc), d.final()]).toString('utf8');
	} catch {
		return null;
	}
}
