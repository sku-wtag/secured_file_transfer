import { and, desc, eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { requireSession, requireVerifiedAccount } from '../auth/require-session.js';
import { env } from '../config/env.js';
import { generateId, isValidGeneratedId } from '../crypto/random.js';
import { db } from '../db/client.js';
import { downloadEvents, transfers } from '../db/schema/index.js';
import { HttpError } from '../middleware/error-handler.js';
import { purgeTransfer } from '../transfers/lifecycle.js';
import { reserveQuota } from '../transfers/quota.js';

async function loadOwnedTransfer(transferId: unknown, ownerId: string) {
  if (!isValidGeneratedId(transferId)) throw new HttpError(404, 'Transfer not found');
  const transfer = await db.query.transfers.findFirst({
    where: and(eq(transfers.id, transferId), eq(transfers.ownerId, ownerId)),
  });
  if (!transfer) throw new HttpError(404, 'Transfer not found');
  return transfer;
}

const HOUR_MS = 60 * 60 * 1000;

const createTransferBody = z.object({
  chunkSizeBytes: z.number().int().positive().max(env.MAX_CHUNK_BYTES),
  chunkCount: z.number().int().nonnegative(),
  totalCiphertextBytes: z.number().int().nonnegative().max(env.MAX_UPLOAD_BYTES),
  expiresInHours: z.number().int().positive().max(env.TRANSFER_MAX_TTL_HOURS).optional(),
  maxDownloads: z.number().int().positive().optional(),
});

export const transfersRouter = Router();

transfersRouter.post('/', requireSession, requireVerifiedAccount, async (req, res) => {
  const { userId } = req;
  if (!userId) throw new HttpError(401, 'Authentication required');

  const parsed = createTransferBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Invalid request body');

  const granted = await reserveQuota(userId, parsed.data.totalCiphertextBytes);
  if (!granted) throw new HttpError(413, 'Account storage quota exceeded');

  const id = generateId();
  const ttlHours = parsed.data.expiresInHours ?? env.TRANSFER_DEFAULT_TTL_HOURS;

  await db.insert(transfers).values({
    id,
    ownerId: userId,
    chunkSizeBytes: parsed.data.chunkSizeBytes,
    chunkCount: parsed.data.chunkCount,
    totalCiphertextBytes: parsed.data.totalCiphertextBytes,
    expiresAt: new Date(Date.now() + ttlHours * HOUR_MS),
    maxDownloads: parsed.data.maxDownloads,
  });

  res.status(201).json({ transferId: id });
});

transfersRouter.get('/', requireSession, requireVerifiedAccount, async (req, res) => {
  const { userId } = req;
  if (!userId) throw new HttpError(401, 'Authentication required');

  const owned = await db.query.transfers.findMany({
    where: eq(transfers.ownerId, userId),
    orderBy: desc(transfers.createdAt),
  });

  res.status(200).json({
    transfers: owned.map((transfer) => ({
      id: transfer.id,
      status: transfer.status,
      createdAt: transfer.createdAt,
      expiresAt: transfer.expiresAt,
      totalCiphertextBytes: transfer.totalCiphertextBytes,
      maxDownloads: transfer.maxDownloads,
      downloadCount: transfer.downloadCount,
    })),
  });
});

transfersRouter.delete('/:id', requireSession, requireVerifiedAccount, async (req, res) => {
  const { userId } = req;
  if (!userId) throw new HttpError(401, 'Authentication required');

  const transfer = await loadOwnedTransfer(req.params.id, userId);
  await purgeTransfer(transfer);
  res.status(204).end();
});

transfersRouter.get('/:id/events', requireSession, requireVerifiedAccount, async (req, res) => {
  const { userId } = req;
  if (!userId) throw new HttpError(401, 'Authentication required');

  const transfer = await loadOwnedTransfer(req.params.id, userId);
  const events = await db.query.downloadEvents.findMany({
    where: eq(downloadEvents.transferId, transfer.id),
    orderBy: desc(downloadEvents.startedAt),
  });

  res.status(200).json({
    events: events.map((event) => ({ id: event.id, startedAt: event.startedAt })),
  });
});
