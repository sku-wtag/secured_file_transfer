import { Router } from 'express';
import { z } from 'zod';

import { verifyPassword } from '../auth/password.js';
import { isValidGeneratedId } from '../crypto/random.js';
import type { transfers } from '../db/schema/index.js';
import { HttpError } from '../middleware/error-handler.js';
import { rateLimit } from '../middleware/rate-limit.js';
import { blobStore } from '../storage/instance.js';
import { issueDownloadGrant, validateDownloadGrant } from '../transfers/grants.js';
import type { TransferAccessResult } from '../transfers/policy.js';
import { resolveTransferAccess } from '../transfers/policy.js';

type Transfer = typeof transfers.$inferSelect;

function requireAccessible(access: TransferAccessResult) {
  if (access.kind === 'not_found') throw new HttpError(404, 'Transfer not found');
  if (access.kind === 'gone') throw new HttpError(410, access.reason);
  return access.transfer;
}

const grantBody = z.object({ passwordVerifier: z.string().min(1).optional() });

async function requireGatePasses(
  transfer: Transfer,
  passwordVerifier: string | undefined,
): Promise<void> {
  if (transfer.gate !== 'link_password') return;
  if (!passwordVerifier || !transfer.gateVerifierHash) {
    throw new HttpError(401, 'Incorrect password');
  }
  if (!(await verifyPassword(transfer.gateVerifierHash, passwordVerifier))) {
    throw new HttpError(401, 'Incorrect password');
  }
}

export const downloadRouter = Router();

downloadRouter.get('/:id', async (req, res) => {
  const transfer = requireAccessible(await resolveTransferAccess(req.params.id));
  res.status(200).json({
    gate: transfer.gate,
    expiresAt: transfer.expiresAt,
    chunkCount: transfer.chunkCount,
    chunkSizeBytes: transfer.chunkSizeBytes,
    totalCiphertextBytes: transfer.totalCiphertextBytes,
  });
});

downloadRouter.post(
  '/:id/grant',
  rateLimit({ points: 10, durationSeconds: 60, keyPrefix: 'download-grant' }),
  async (req, res) => {
    const transfer = requireAccessible(await resolveTransferAccess(req.params.id));

    const body = grantBody.safeParse(req.body);
    if (!body.success) throw new HttpError(400, 'Invalid request body');
    await requireGatePasses(transfer, body.data.passwordVerifier);

    const grantToken = await issueDownloadGrant(req, transfer);
    if (!grantToken) throw new HttpError(410, 'download_limit_reached');

    res.status(200).json({
      grantToken,
      wrappedFileKey: transfer.wrappedFileKey,
      wrapNonce: transfer.wrapNonce,
      encryptedManifest: transfer.encryptedManifest,
      noncePrefix: transfer.noncePrefix,
      chunkCount: transfer.chunkCount,
    });
  },
);

downloadRouter.get('/:id/chunks/:index', async (req, res) => {
  const transferId = req.params.id;
  if (!isValidGeneratedId(transferId)) throw new HttpError(404, 'Transfer not found');

  const valid = await validateDownloadGrant(req.headers['x-download-grant'], transferId);
  if (!valid) throw new HttpError(401, 'Invalid or expired download grant');

  const chunkIndex = Number(req.params.index);
  if (!Number.isInteger(chunkIndex) || chunkIndex < 0)
    throw new HttpError(400, 'Invalid chunk index');

  let bytes: Buffer;
  try {
    bytes = await blobStore.read(transferId, chunkIndex);
  } catch {
    throw new HttpError(404, 'Chunk not found');
  }

  res.setHeader('Content-Disposition', 'attachment');
  res.status(200).contentType('application/octet-stream').send(bytes);
});
