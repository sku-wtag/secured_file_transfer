import { mkdir, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';

import { isValidGeneratedId } from '../crypto/random.js';
import { type BlobStore, ChunkAlreadyStoredError } from './blob-store.js';

function transferDir(root: string, transferId: string): string {
  if (!isValidGeneratedId(transferId)) {
    throw new Error('Invalid transfer id');
  }
  const resolved = path.resolve(root, transferId);
  if (path.dirname(resolved) !== path.resolve(root)) {
    throw new Error(`Transfer id escapes blob root: ${transferId}`);
  }
  return resolved;
}

function chunkPath(root: string, transferId: string, chunkIndex: number): string {
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
    throw new Error(`Invalid chunk index: ${String(chunkIndex)}`);
  }
  return path.join(transferDir(root, transferId), String(chunkIndex));
}

function isFileAlreadyExists(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'EEXIST';
}

export function createLocalBlobStore(root: string): BlobStore {
  return {
    async write(transferId, chunkIndex, data) {
      const dir = transferDir(root, transferId);
      await mkdir(dir, { recursive: true });
      try {
        await writeFile(chunkPath(root, transferId, chunkIndex), data, { flag: 'wx' });
      } catch (error) {
        if (isFileAlreadyExists(error)) {
          throw new ChunkAlreadyStoredError(transferId, chunkIndex);
        }
        throw error;
      }
    },

    async read(transferId, chunkIndex) {
      return readFile(chunkPath(root, transferId, chunkIndex));
    },

    async deleteTransfer(transferId) {
      await rm(transferDir(root, transferId), { recursive: true, force: true });
    },
  };
}
