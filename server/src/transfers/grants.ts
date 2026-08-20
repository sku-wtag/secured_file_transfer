import { and, eq, isNull, or, sql } from 'drizzle-orm';
import type { Request } from 'express';

import { env } from '../config/env.js';
import { constantTimeEqual, sha256Hex, truncateIp } from '../crypto/hashing.js';
import { generateId, generateToken } from '../crypto/random.js';
import { db } from '../db/client.js';
import { downloadEvents, downloadGrants, transfers } from '../db/schema/index.js';

type Transfer = typeof transfers.$inferSelect;

async function consumeOneDownloadSlot(transferId: string): Promise<boolean> {
  const updated = await db
    .update(transfers)
    .set({ downloadCount: sql`${transfers.downloadCount} + 1` })
    .where(
      and(
        eq(transfers.id, transferId),
        or(
          isNull(transfers.maxDownloads),
          sql`${transfers.downloadCount} < ${transfers.maxDownloads}`,
        ),
      ),
    )
    .returning({ id: transfers.id });
  return updated.length > 0;
}

export async function issueDownloadGrant(req: Request, transfer: Transfer): Promise<string | null> {
  const granted = await consumeOneDownloadSlot(transfer.id);
  if (!granted) return null;

  const id = generateId();
  const secret = generateToken();
  const expiresAt = new Date(Date.now() + env.DOWNLOAD_GRANT_TTL_MINUTES * 60 * 1000);
  const ipTruncated = truncateIp(req.ip ?? '0.0.0.0');

  await db.insert(downloadGrants).values({
    id,
    transferId: transfer.id,
    secretHash: sha256Hex(Buffer.from(secret)),
    ipTruncated,
    expiresAt,
  });

  await db.insert(downloadEvents).values({
    id: generateId(),
    transferId: transfer.id,
    grantId: id,
    ipTruncated,
    userAgentHash: sha256Hex(Buffer.from(req.headers['user-agent'] ?? '')),
  });

  return `${id}.${secret}`;
}

export async function validateDownloadGrant(
  grantToken: unknown,
  transferId: string,
): Promise<boolean> {
  if (typeof grantToken !== 'string') return false;
  const separatorIndex = grantToken.indexOf('.');
  if (separatorIndex < 0) return false;

  const id = grantToken.slice(0, separatorIndex);
  const secret = grantToken.slice(separatorIndex + 1);

  const grant = await db.query.downloadGrants.findFirst({ where: eq(downloadGrants.id, id) });
  if (grant?.transferId !== transferId) return false;
  if (!constantTimeEqual(grant.secretHash, sha256Hex(Buffer.from(secret)))) return false;
  if (grant.expiresAt < new Date()) return false;

  return true;
}
