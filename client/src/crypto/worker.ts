import type { ChunkContext } from 'shared';
import { decryptChunk, decryptManifest, encryptChunk, encryptManifest } from 'shared';

import type { WorkerJob, WorkerJobMessage } from './worker-protocol.ts';

function contextOf(job: WorkerJob): ChunkContext {
  return { noncePrefix: job.noncePrefix, transferId: job.transferId, chunkCount: job.chunkCount };
}

async function runJob(job: WorkerJob): Promise<WorkerJobMessage> {
  const ctx = contextOf(job);
  switch (job.kind) {
    case 'encryptChunk':
      return {
        kind: 'bytesResult',
        jobId: job.jobId,
        data: await encryptChunk(job.fek, job.chunkIndex, ctx, job.plaintext),
      };
    case 'decryptChunk':
      return {
        kind: 'bytesResult',
        jobId: job.jobId,
        data: await decryptChunk(job.fek, job.chunkIndex, ctx, job.ciphertext),
      };
    case 'encryptManifest':
      return {
        kind: 'bytesResult',
        jobId: job.jobId,
        data: await encryptManifest(job.fek, ctx, job.manifest),
      };
    case 'decryptManifest':
      return {
        kind: 'manifestResult',
        jobId: job.jobId,
        manifest: await decryptManifest(job.fek, ctx, job.encryptedManifest),
      };
  }
}

self.onmessage = (event: MessageEvent<WorkerJob>) => {
  const job = event.data;
  runJob(job)
    .then((message) => {
      const transfer = message.kind === 'bytesResult' ? [message.data.buffer as ArrayBuffer] : [];
      self.postMessage(message, { transfer });
    })
    .catch((error: unknown) => {
      const message: WorkerJobMessage = {
        kind: 'error',
        jobId: job.jobId,
        message: error instanceof Error ? error.message : 'Encryption failed',
      };
      self.postMessage(message);
    });
};
