import type { FileManifest } from '../manifest-schema.js';
import { type ChunkContext, concatBytes, expectedChunkCount } from '../wire-format.js';
import { decryptChunk } from './chunk-cipher.js';
import type { EncryptedFile } from './encrypt-file.js';
import { decryptManifest } from './manifest-cipher.js';

export async function decryptFile(
  encrypted: EncryptedFile,
  fek: Uint8Array,
  transferId: string,
  chunkCount: number,
): Promise<{ plaintext: Uint8Array; manifest: FileManifest }> {
  const ctx: ChunkContext = { noncePrefix: encrypted.noncePrefix, transferId, chunkCount };
  const manifest = await decryptManifest(fek, ctx, encrypted.encryptedManifest);

  if (expectedChunkCount(manifest.size, manifest.chunkSize) !== chunkCount) {
    throw new Error('Chunk count does not match the authenticated manifest');
  }
  if (encrypted.chunks.length !== chunkCount) {
    throw new Error('Wrong number of chunks delivered');
  }

  const plaintextChunks: Uint8Array[] = [];
  for (let index = 0; index < chunkCount; index += 1) {
    const ciphertextChunk = encrypted.chunks[index];
    if (!ciphertextChunk) throw new Error(`Missing chunk ${String(index)}`);
    plaintextChunks.push(await decryptChunk(fek, index, ctx, ciphertextChunk));
  }

  const plaintext = concatBytes(...plaintextChunks);

  if (plaintext.length !== manifest.size) {
    throw new Error('Decrypted size does not match the manifest');
  }

  return { plaintext, manifest };
}
