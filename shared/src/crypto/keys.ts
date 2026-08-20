import { KEY_BYTES, utf8Bytes, WRAP_NONCE_BYTES, wrapAad } from '../wire-format.js';
import { importAesGcmKey } from './aes-gcm.js';

const PBKDF2_ITERATIONS = 600_000;
const HKDF_INFO_KEK = utf8Bytes('SFT1 kek');
const HKDF_INFO_SERVER_VERIFIER = utf8Bytes('SFT1 server verifier');

export function generateFileKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEY_BYTES));
}

export function generateLinkSecret(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(KEY_BYTES));
}

async function hkdfSha256(
  ikm: Uint8Array,
  salt: Uint8Array,
  info: Uint8Array,
  byteLength: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', ikm, 'HKDF', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits(
    { name: 'HKDF', hash: 'SHA-256', salt, info },
    keyMaterial,
    byteLength * 8,
  );
  return new Uint8Array(bits);
}

async function pbkdf2Sha256(
  password: string,
  salt: Uint8Array,
  byteLength: number,
): Promise<Uint8Array> {
  const keyMaterial = await crypto.subtle.importKey('raw', utf8Bytes(password), 'PBKDF2', false, [
    'deriveBits',
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', hash: 'SHA-256', salt, iterations: PBKDF2_ITERATIONS },
    keyMaterial,
    byteLength * 8,
  );
  return new Uint8Array(bits);
}

async function derivePasswordBits(password: string, transferId: string): Promise<Uint8Array> {
  const passwordSalt = utf8Bytes(`SFT1 pbkdf2 salt|${transferId}`);
  return pbkdf2Sha256(password, passwordSalt, KEY_BYTES);
}

export async function deriveKek(
  linkSecret: Uint8Array,
  transferId: string,
  password?: string,
): Promise<Uint8Array> {
  const salt = utf8Bytes(transferId);
  if (password === undefined) {
    return hkdfSha256(linkSecret, salt, HKDF_INFO_KEK, KEY_BYTES);
  }

  const passwordBits = await derivePasswordBits(password, transferId);
  const ikm = new Uint8Array([...linkSecret, ...passwordBits]);
  return hkdfSha256(ikm, salt, HKDF_INFO_KEK, KEY_BYTES);
}

export async function derivePasswordVerifier(
  password: string,
  transferId: string,
): Promise<Uint8Array> {
  const passwordBits = await derivePasswordBits(password, transferId);
  return hkdfSha256(passwordBits, utf8Bytes(transferId), HKDF_INFO_SERVER_VERIFIER, KEY_BYTES);
}

export interface WrappedFileKey {
  wrapNonce: Uint8Array;
  wrappedKey: Uint8Array;
}

export async function wrapFileKey(
  fek: Uint8Array,
  kek: Uint8Array,
  transferId: string,
): Promise<WrappedFileKey> {
  const wrapNonce = crypto.getRandomValues(new Uint8Array(WRAP_NONCE_BYTES));
  const key = await importAesGcmKey(kek, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: wrapNonce, additionalData: wrapAad(transferId) },
    key,
    fek,
  );
  return { wrapNonce, wrappedKey: new Uint8Array(ciphertext) };
}

export async function unwrapFileKey(
  wrapped: WrappedFileKey,
  kek: Uint8Array,
  transferId: string,
): Promise<Uint8Array> {
  const key = await importAesGcmKey(kek, 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: wrapped.wrapNonce, additionalData: wrapAad(transferId) },
    key,
    wrapped.wrappedKey,
  );
  return new Uint8Array(plaintext);
}
