import type { FileManifest } from '../manifest-schema.js';
import {
  CHUNK_SIZE_BYTES,
  type ChunkContext,
  expectedChunkCount,
  NONCE_PREFIX_BYTES,
} from '../wire-format.js';
import { encryptChunk } from './chunk-cipher.js';
import { encryptManifest } from './manifest-cipher.js';

export interface EncryptedFile {
  noncePrefix: Uint8Array;
  chunks: Uint8Array[];
  encryptedManifest: Uint8Array;
}

export interface EncryptFileOptions {
  transferId: string;
  name: string;
  type: string;
  chunkSize?: number;
}

export async function encryptFile(
  plaintext: Uint8Array,
  fek: Uint8Array,
  options: EncryptFileOptions,
): Promise<EncryptedFile> {
  const chunkSize = options.chunkSize ?? CHUNK_SIZE_BYTES;
  const noncePrefix = crypto.getRandomValues(new Uint8Array(NONCE_PREFIX_BYTES));
  const chunkCount = expectedChunkCount(plaintext.length, chunkSize);
  const ctx: ChunkContext = { noncePrefix, transferId: options.transferId, chunkCount };

  const chunks: Uint8Array[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const start = index * chunkSize;
    const slice = plaintext.subarray(start, Math.min(start + chunkSize, plaintext.length));
    chunks.push(await encryptChunk(fek, index, ctx, slice));
  }

  const manifest: FileManifest = {
    v: 1,
    name: options.name,
    type: options.type,
    size: plaintext.length,
    chunkSize,
  };
  const encryptedManifest = await encryptManifest(fek, ctx, manifest);

  return { noncePrefix, chunks, encryptedManifest };
}
