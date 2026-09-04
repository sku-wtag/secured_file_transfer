export class ChunkAlreadyStoredError extends Error {
  constructor(transferId: string, chunkIndex: number) {
    super(`Chunk ${String(chunkIndex)} of transfer ${transferId} is already stored`);
    this.name = 'ChunkAlreadyStoredError';
  }
}

export interface BlobStore {
  write(transferId: string, chunkIndex: number, data: Buffer): Promise<void>;
  read(transferId: string, chunkIndex: number): Promise<Buffer>;
  deleteTransfer(transferId: string): Promise<void>;
}
