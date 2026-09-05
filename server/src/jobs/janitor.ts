import { and, eq, lt } from 'drizzle-orm';

import { db } from '../db/client.js';
import { transfers } from '../db/schema/index.js';
import { logger } from '../logger.js';
import { purgeTransfer } from '../transfers/lifecycle.js';

const ABANDONED_UPLOAD_HOURS = 24;

async function purgeExpiredTransfers(): Promise<number> {
  const expired = await db.query.transfers.findMany({
    where: and(eq(transfers.status, 'ready'), lt(transfers.expiresAt, new Date())),
  });
  for (const transfer of expired) await purgeTransfer(transfer);
  return expired.length;
}

async function purgeAbandonedUploads(): Promise<number> {
  const cutoff = new Date(Date.now() - ABANDONED_UPLOAD_HOURS * 60 * 60 * 1000);
  const abandoned = await db.query.transfers.findMany({
    where: and(eq(transfers.status, 'uploading'), lt(transfers.createdAt, cutoff)),
  });
  for (const transfer of abandoned) await purgeTransfer(transfer);
  return abandoned.length;
}

export async function runJanitor(): Promise<void> {
  const expiredCount = await purgeExpiredTransfers();
  const abandonedCount = await purgeAbandonedUploads();
  if (expiredCount || abandonedCount) {
    logger.info({ expiredCount, abandonedCount }, 'janitor purged transfers');
  }
}
