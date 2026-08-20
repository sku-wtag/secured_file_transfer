import { eq } from 'drizzle-orm';

import { db } from '../db/client.js';
import { transfers } from '../db/schema/index.js';
import { blobStore } from '../storage/instance.js';
import { releaseQuota } from './quota.js';

type Transfer = typeof transfers.$inferSelect;

export async function purgeTransfer(transfer: Transfer): Promise<void> {
  await blobStore.deleteTransfer(transfer.id);
  await db.delete(transfers).where(eq(transfers.id, transfer.id));
  await releaseQuota(transfer.ownerId, transfer.totalCiphertextBytes);
}
