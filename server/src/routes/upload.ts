import { and, eq } from 'drizzle-orm';
import express, { Router } from 'express';
import { GCM_TAG_BYTES } from 'shared';
import { z } from 'zod';

import { hashPassword } from '../auth/password.js';
import { requireSession, requireVerifiedAccount } from '../auth/require-session.js';
import { env } from '../config/env.js';
import { sha256Hex } from '../crypto/hashing.js';
import { isValidGeneratedId } from '../crypto/random.js';
import { db } from '../db/client.js';
import { transferChunks, transfers } from '../db/schema/index.js';
import { HttpError } from '../middleware/error-handler.js';
import { blobStore } from '../storage/instance.js';

async function loadUploadingTransfer(transferId: unknown, ownerId: string) {
  if (!isValidGeneratedId(transferId)) throw new HttpError(404, 'Transfer not found');
  const transfer = await db.query.transfers.findFirst({
    where: and(eq(transfers.id, transferId), eq(transfers.ownerId, ownerId)),
  });
  if (transfer?.status !== 'uploading') throw new HttpError(404, 'Transfer not found');
  return transfer;
}

async function assertAllChunksUploaded(transferId: string, chunkCount: number): Promise<void> {
  const uploaded = await db.query.transferChunks.findMany({
    where: eq(transferChunks.transferId, transferId),
  });
  const indices = new Set(uploaded.map((chunk) => chunk.chunkIndex));
  if (indices.size !== chunkCount) throw new HttpError(409, 'Not every chunk has been uploaded');
  for (let index = 0; index < chunkCount; index += 1) {
    if (!indices.has(index)) throw new HttpError(409, `Missing chunk ${String(index)}`);
  }
}

const finalizeBody = z.object({
  wrappedFileKey: z.string().min(1),
  wrapNonce: z.string().min(1),
  encryptedManifest: z.string().min(1),
  noncePrefix: z.string().min(1),
  passwordVerifier: z.string().min(1),
});

export const uploadRouter = Router();

uploadRouter.put(
  '/:id/chunks/:index',
  requireSession,
  requireVerifiedAccount,
  express.raw({ type: 'application/octet-stream', limit: env.MAX_CHUNK_BYTES + GCM_TAG_BYTES }),
  async (req, res) => {
    const { userId } = req;
    if (!userId) throw new HttpError(401, 'Authentication required');

    const chunkIndex = Number(req.params.index);
    if (!Number.isInteger(chunkIndex) || chunkIndex < 0) {
      throw new HttpError(400, 'Invalid chunk index');
    }

    const transfer = await loadUploadingTransfer(req.params.id, userId);
    if (chunkIndex >= transfer.chunkCount) throw new HttpError(400, 'Chunk index out of range');

    const body: unknown = req.body;
    if (!Buffer.isBuffer(body) || body.length === 0) throw new HttpError(400, 'Empty chunk body');
    if (body.length > transfer.chunkSizeBytes + GCM_TAG_BYTES) {
      throw new HttpError(413, 'Chunk exceeds the declared chunk size');
    }

    try {
      await blobStore.write(transfer.id, chunkIndex, body);
    } catch {
      throw new HttpError(409, 'Chunk already uploaded');
    }

    await db.insert(transferChunks).values({
      transferId: transfer.id,
      chunkIndex,
      ciphertextBytes: body.length,
      sha256: sha256Hex(body),
    });

    res.status(204).end();
  },
);

uploadRouter.post('/:id/finalize', requireSession, requireVerifiedAccount, async (req, res) => {
  const { userId } = req;
  if (!userId) throw new HttpError(401, 'Authentication required');

  const parsed = finalizeBody.safeParse(req.body);
  if (!parsed.success) throw new HttpError(400, 'Invalid request body');

  const transfer = await loadUploadingTransfer(req.params.id, userId);
  await assertAllChunksUploaded(transfer.id, transfer.chunkCount);

  const { passwordVerifier, ...rest } = parsed.data;
  const gateVerifierHash = await hashPassword(passwordVerifier);

  await db
    .update(transfers)
    .set({
      ...rest,
      gate: 'link_password',
      gateVerifierHash,
      status: 'ready',
      finalizedAt: new Date(),
    })
    .where(eq(transfers.id, transfer.id));

  res.status(200).json({ transferId: transfer.id });
});
