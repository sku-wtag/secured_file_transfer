import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { recordAuditEvent } from '../../audit/audit-log.js';
import { consumeOneTimeToken } from '../../auth/one-time-tokens.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { HttpError } from '../../middleware/error-handler.js';
import { rateLimit } from '../../middleware/rate-limit.js';

const verifyBody = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
});

export const verifyEmailRouter = Router();

verifyEmailRouter.post(
  '/verify-email',
  rateLimit({ points: 10, durationSeconds: 60, keyPrefix: 'verify-email' }),
  async (req, res) => {
    const parsed = verifyBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid request body');

    const consumed = await consumeOneTimeToken(
      parsed.data.userId,
      'email_verification',
      parsed.data.token,
    );
    if (!consumed) throw new HttpError(400, 'Invalid or expired verification link');

    await db
      .update(users)
      .set({ status: 'active', emailVerifiedAt: new Date() })
      .where(eq(users.id, parsed.data.userId));

    await recordAuditEvent(req, {
      eventType: 'auth.email_verified',
      actorUserId: parsed.data.userId,
      subjectType: 'user',
      subjectId: parsed.data.userId,
    });

    res.status(200).json({ message: 'Email verified' });
  },
);
