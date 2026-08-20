import { eq } from 'drizzle-orm';

import { isValidGeneratedId } from '../crypto/random.js';
import { db } from '../db/client.js';
import { transfers } from '../db/schema/index.js';

type Transfer = typeof transfers.$inferSelect;

export type TransferAccessResult =
  | { kind: 'ok'; transfer: Transfer }
  | { kind: 'not_found' }
  | { kind: 'gone'; reason: 'revoked' | 'expired' | 'download_limit_reached' };

export async function resolveTransferAccess(transferId: unknown): Promise<TransferAccessResult> {
  if (!isValidGeneratedId(transferId)) return { kind: 'not_found' };

  const transfer = await db.query.transfers.findFirst({ where: eq(transfers.id, transferId) });
  if (transfer?.status !== 'ready') return { kind: 'not_found' };
  if (transfer.revokedAt) return { kind: 'gone', reason: 'revoked' };
  if (transfer.expiresAt < new Date()) return { kind: 'gone', reason: 'expired' };
  if (transfer.maxDownloads !== null && transfer.downloadCount >= transfer.maxDownloads) {
    return { kind: 'gone', reason: 'download_limit_reached' };
  }

  return { kind: 'ok', transfer };
}
