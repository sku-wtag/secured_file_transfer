import type { FileManifest } from 'shared';

interface JobBase {
  jobId: string;
  fek: Uint8Array;
  noncePrefix: Uint8Array;
  transferId: string;
  chunkCount: number;
}

export interface EncryptChunkJob extends JobBase {
  kind: 'encryptChunk';
  chunkIndex: number;
  plaintext: Uint8Array;
}

export interface DecryptChunkJob extends JobBase {
  kind: 'decryptChunk';
  chunkIndex: number;
  ciphertext: Uint8Array;
}

export interface EncryptManifestJob extends JobBase {
  kind: 'encryptManifest';
  manifest: FileManifest;
}

export interface DecryptManifestJob extends JobBase {
  kind: 'decryptManifest';
  encryptedManifest: Uint8Array;
}

export type WorkerJob = EncryptChunkJob | DecryptChunkJob | EncryptManifestJob | DecryptManifestJob;

export interface WorkerBytesResult {
  kind: 'bytesResult';
  jobId: string;
  data: Uint8Array;
}

export interface WorkerManifestResult {
  kind: 'manifestResult';
  jobId: string;
  manifest: FileManifest;
}

export interface WorkerJobError {
  kind: 'error';
  jobId: string;
  message: string;
}

export type WorkerJobMessage = WorkerBytesResult | WorkerManifestResult | WorkerJobError;
