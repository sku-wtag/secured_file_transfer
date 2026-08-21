import type { ChunkContext, FileManifest } from 'shared';
import {
  base64UrlDecode,
  base64UrlEncode,
  deriveKek,
  derivePasswordVerifier,
  unwrapFileKey,
} from 'shared';

import { apiRequest, fetchChunkBytes } from '../../api/client.ts';
import { runBytesJob, runManifestJob } from '../../crypto/run-worker-job.ts';
import type { FileSink } from './save-file.ts';

interface GrantResponse {
  grantToken: string;
  wrappedFileKey: string;
  wrapNonce: string;
  encryptedManifest: string;
  noncePrefix: string;
  chunkCount: number;
}

export interface OpenedDownload {
  fek: Uint8Array;
  ctx: ChunkContext;
  grantToken: string;
  manifest: FileManifest;
}

export async function openDownload(
  transferId: string,
  linkSecret: Uint8Array,
  worker: Worker,
  password: string,
): Promise<OpenedDownload> {
  const passwordVerifier = await derivePasswordVerifier(password, transferId);
  const grant = await apiRequest<GrantResponse>(`/download/${transferId}/grant`, {
    method: 'POST',
    body: { passwordVerifier: base64UrlEncode(passwordVerifier) },
  });
  const noncePrefix = base64UrlDecode(grant.noncePrefix);
  const ctx: ChunkContext = { noncePrefix, transferId, chunkCount: grant.chunkCount };

  const kek = await deriveKek(linkSecret, transferId, password);
  const fek = await unwrapFileKey(
    {
      wrapNonce: base64UrlDecode(grant.wrapNonce),
      wrappedKey: base64UrlDecode(grant.wrappedFileKey),
    },
    kek,
    transferId,
  );

  const manifest = await runManifestJob(worker, {
    kind: 'decryptManifest',
    jobId: crypto.randomUUID(),
    fek,
    encryptedManifest: base64UrlDecode(grant.encryptedManifest),
    ...ctx,
  });

  return { fek, ctx, grantToken: grant.grantToken, manifest };
}

export async function downloadInto(
  opened: OpenedDownload,
  worker: Worker,
  sink: FileSink,
  onProgress: (done: number, total: number) => void,
): Promise<void> {
  const { fek, ctx, grantToken } = opened;

  for (let index = 0; index < ctx.chunkCount; index += 1) {
    const ciphertext = await fetchChunkBytes(
      `/download/${ctx.transferId}/chunks/${String(index)}`,
      grantToken,
    );
    const plaintext = await runBytesJob(
      worker,
      {
        kind: 'decryptChunk',
        jobId: crypto.randomUUID(),
        chunkIndex: index,
        ciphertext,
        fek,
        ...ctx,
      },
      [ciphertext.buffer as ArrayBuffer],
    );
    await sink.write(plaintext);
    onProgress(index + 1, ctx.chunkCount);
  }

  await sink.close();
}
