import { chunkAad, type ChunkContext, chunkNonce } from '../wire-format.js';
import { importAesGcmKey } from './aes-gcm.js';

export async function encryptChunk(
  fek: Uint8Array,
  chunkIndex: number,
  ctx: ChunkContext,
  plaintext: Uint8Array,
): Promise<Uint8Array> {
  const key = await importAesGcmKey(fek, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: chunkNonce(ctx.noncePrefix, chunkIndex),
      additionalData: chunkAad(ctx.transferId, chunkIndex, ctx.chunkCount),
    },
    key,
    plaintext,
  );
  return new Uint8Array(ciphertext);
}

export async function decryptChunk(
  fek: Uint8Array,
  chunkIndex: number,
  ctx: ChunkContext,
  ciphertext: Uint8Array,
): Promise<Uint8Array> {
  const key = await importAesGcmKey(fek, 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: chunkNonce(ctx.noncePrefix, chunkIndex),
      additionalData: chunkAad(ctx.transferId, chunkIndex, ctx.chunkCount),
    },
    key,
    ciphertext,
  );
  return new Uint8Array(plaintext);
}
