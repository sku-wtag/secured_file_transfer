import type { webcrypto } from 'node:crypto';

export async function importAesGcmKey(
  rawKey: Uint8Array,
  usage: 'encrypt' | 'decrypt',
): Promise<webcrypto.CryptoKey> {
  return crypto.subtle.importKey('raw', rawKey, 'AES-GCM', false, [usage]);
}
