import { scryptSync, randomBytes, timingSafeEqual, createHmac, randomInt } from 'node:crypto';

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

function sig(payload) {
	if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET is not set');
	return createHmac('sha256', process.env.SESSION_SECRET).update(payload).digest('base64url');
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
