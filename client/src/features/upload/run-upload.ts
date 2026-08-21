import type { FileManifest } from 'shared';
import {
  base64UrlEncode,
  CHUNK_SIZE_BYTES,
  deriveKek,
  derivePasswordVerifier,
  expectedChunkCount,
  GCM_TAG_BYTES,
  generateFileKey,
  generateLinkSecret,
  NONCE_PREFIX_BYTES,
  wrapFileKey,
} from 'shared';

import { apiRequest, uploadChunkBytes } from '../../api/client.ts';
import { runBytesJob } from '../../crypto/run-worker-job.ts';
import { buildShareLink } from './link-builder.ts';

export interface UploadOptions {
  expiresInHours?: number;
  maxDownloads?: number;
  password: string;
}

async function readChunk(file: File, index: number, chunkSize: number): Promise<Uint8Array> {
  const start = index * chunkSize;
  const slice = file.slice(start, Math.min(start + chunkSize, file.size));
  return new Uint8Array(await slice.arrayBuffer());
}

async function uploadChunks(
  file: File,
  worker: Worker,
  ctx: { fek: Uint8Array; noncePrefix: Uint8Array; transferId: string; chunkCount: number },
  onProgress: (done: number) => void,
): Promise<void> {
  for (let index = 0; index < ctx.chunkCount; index += 1) {
    const plaintext = await readChunk(file, index, CHUNK_SIZE_BYTES);
    const ciphertext = await runBytesJob(
      worker,
      { kind: 'encryptChunk', jobId: crypto.randomUUID(), chunkIndex: index, plaintext, ...ctx },
      [plaintext.buffer as ArrayBuffer],
    );
    await uploadChunkBytes(`/transfers/${ctx.transferId}/chunks/${String(index)}`, ciphertext);
    onProgress(index + 1);
  }
}

async function finalizeUpload(
  file: File,
  worker: Worker,
  ctx: { fek: Uint8Array; noncePrefix: Uint8Array; transferId: string; chunkCount: number },
  access: { linkSecret: Uint8Array; password: string },
): Promise<string> {
  const { linkSecret, password } = access;
  const manifest: FileManifest = {
    v: 1,
    name: file.name,
    type: file.type || 'application/octet-stream',
    size: file.size,
    chunkSize: CHUNK_SIZE_BYTES,
  };
  const encryptedManifest = await runBytesJob(worker, {
    kind: 'encryptManifest',
    jobId: crypto.randomUUID(),
    manifest,
    ...ctx,
  });

  const kek = await deriveKek(linkSecret, ctx.transferId, password);
  const { wrapNonce, wrappedKey } = await wrapFileKey(ctx.fek, kek, ctx.transferId);
  const passwordVerifier = await derivePasswordVerifier(password, ctx.transferId);

  await apiRequest(`/transfers/${ctx.transferId}/finalize`, {
    method: 'POST',
    body: {
      wrappedFileKey: base64UrlEncode(wrappedKey),
      wrapNonce: base64UrlEncode(wrapNonce),
      encryptedManifest: base64UrlEncode(encryptedManifest),
      noncePrefix: base64UrlEncode(ctx.noncePrefix),
      passwordVerifier: base64UrlEncode(passwordVerifier),
    },
  });

  return buildShareLink(ctx.transferId, linkSecret);
}

export async function runUpload(
  file: File,
  options: UploadOptions,
  worker: Worker,
  onProgress: (done: number, total: number) => void,
): Promise<string> {
  const fek = generateFileKey();
  const linkSecret = generateLinkSecret();
  const noncePrefix = crypto.getRandomValues(new Uint8Array(NONCE_PREFIX_BYTES));
  const chunkCount = expectedChunkCount(file.size, CHUNK_SIZE_BYTES);
  const totalCiphertextBytes = file.size + chunkCount * GCM_TAG_BYTES;

  const { transferId } = await apiRequest<{ transferId: string }>('/transfers', {
    method: 'POST',
    body: {
      chunkSizeBytes: CHUNK_SIZE_BYTES,
      chunkCount,
      totalCiphertextBytes,
      expiresInHours: options.expiresInHours,
      maxDownloads: options.maxDownloads,
    },
  });

  const ctx = { fek, noncePrefix, transferId, chunkCount };
  await uploadChunks(file, worker, ctx, (done) => {
    onProgress(done, chunkCount);
  });
  return finalizeUpload(file, worker, ctx, { linkSecret, password: options.password });
}
