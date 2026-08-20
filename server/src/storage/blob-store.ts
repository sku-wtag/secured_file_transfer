export interface BlobStore {
  write(transferId: string, chunkIndex: number, data: Buffer): Promise<void>;
  read(transferId: string, chunkIndex: number): Promise<Buffer>;
  deleteTransfer(transferId: string): Promise<void>;
}
