import { env } from '../config/env.js';
import { decodeBase64Key, hmacSha256 } from './hashing.js';

const pepper = decodeBase64Key(env.EMAIL_LOOKUP_PEPPER, 32);

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export function emailLookupHash(email: string): string {
  return hmacSha256(pepper, normalizeEmail(email)).toString('hex');
}
