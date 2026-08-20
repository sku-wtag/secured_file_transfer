import { createCipheriv, createDecipheriv, randomBytes } from 'node:crypto';

import { env } from '../config/env.js';
import { decodeBase64Key } from './hashing.js';

const ALGORITHM = 'aes-256-gcm';
const NONCE_BYTES = 12;
const TAG_BYTES = 16;

const fieldKey = decodeBase64Key(env.FIELD_ENCRYPTION_KEY, 32);

export function encryptField(plaintext: string): string {
  const nonce = randomBytes(NONCE_BYTES);
  const cipher = createCipheriv(ALGORITHM, fieldKey, nonce);
  const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([nonce, ciphertext, tag]).toString('base64');
}

export function decryptField(encoded: string): string {
  const combined = Buffer.from(encoded, 'base64');
  const nonce = combined.subarray(0, NONCE_BYTES);
  const tag = combined.subarray(combined.length - TAG_BYTES);
  const ciphertext = combined.subarray(NONCE_BYTES, combined.length - TAG_BYTES);

  const decipher = createDecipheriv(ALGORITHM, fieldKey, nonce);
  decipher.setAuthTag(tag);
  return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
}
