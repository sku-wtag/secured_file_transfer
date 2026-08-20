export interface TransferSummary {
  id: string;
  status: 'uploading' | 'ready' | 'revoked' | 'expired';
  createdAt: string;
  expiresAt: string;
  totalCiphertextBytes: number;
  maxDownloads: number | null;
  downloadCount: number;
}
