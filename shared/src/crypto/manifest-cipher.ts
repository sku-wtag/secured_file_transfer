import type { FileManifest } from '../manifest-schema.js';
import { manifestSchema } from '../manifest-schema.js';
import {
  type ChunkContext,
  manifestAad,
  manifestNonce,
  utf8Bytes,
  utf8Decode,
} from '../wire-format.js';
import { importAesGcmKey } from './aes-gcm.js';

export async function encryptManifest(
  fek: Uint8Array,
  ctx: ChunkContext,
  manifest: FileManifest,
): Promise<Uint8Array> {
  const key = await importAesGcmKey(fek, 'encrypt');
  const ciphertext = await crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv: manifestNonce(ctx.noncePrefix),
      additionalData: manifestAad(ctx.transferId, ctx.chunkCount),
    },
    key,
    utf8Bytes(JSON.stringify(manifest)),
  );
  return new Uint8Array(ciphertext);
}

export async function decryptManifest(
  fek: Uint8Array,
  ctx: ChunkContext,
  encryptedManifest: Uint8Array,
): Promise<FileManifest> {
  const key = await importAesGcmKey(fek, 'decrypt');
  const plaintext = await crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv: manifestNonce(ctx.noncePrefix),
      additionalData: manifestAad(ctx.transferId, ctx.chunkCount),
    },
    key,
    encryptedManifest,
  );
  return manifestSchema.parse(JSON.parse(utf8Decode(new Uint8Array(plaintext))));
}
