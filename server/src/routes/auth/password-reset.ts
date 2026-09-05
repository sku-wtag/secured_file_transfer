import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { recordAuditEvent } from '../../audit/audit-log.js';
import { consumeOneTimeToken, issueOneTimeToken } from '../../auth/one-time-tokens.js';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../../auth/password.js';
import { revokeAllSessionsForUser } from '../../auth/session.js';
import { env } from '../../config/env.js';
import { emailLookupHash, normalizeEmail } from '../../crypto/email-lookup.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { enqueueMail } from '../../jobs/queues.js';
import { HttpError } from '../../middleware/error-handler.js';
import { rateLimit } from '../../middleware/rate-limit.js';

const requestBody = z.object({ email: z.email() });
const confirmBody = z.object({
  userId: z.string().min(1),
  token: z.string().min(1),
  newPassword: z.string().min(MIN_PASSWORD_LENGTH),
});

const ACKNOWLEDGEMENT = {
  message: 'If that address has an account, a password reset email has been sent.',
};

export const passwordResetRouter = Router();

passwordResetRouter.post(
  '/password-reset/request',
  rateLimit({ points: 5, durationSeconds: 60, keyPrefix: 'password-reset-request' }),
  async (req, res) => {
    const parsed = requestBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid request body');

    const email = normalizeEmail(parsed.data.email);
    const user = await db.query.users.findFirst({
      where: eq(users.emailLookupHash, emailLookupHash(email)),
    });

    if (user) {
      const token = await issueOneTimeToken(user.id, 'password_reset');
      await enqueueMail({
        to: email,
        subject: 'Reset your password',
        text: `Reset your password: ${env.APP_ORIGIN}/reset-password/confirm?uid=${user.id}&token=${token}`,
      });
      await recordAuditEvent(req, {
        eventType: 'auth.password_reset_requested',
        actorUserId: user.id,
        subjectType: 'user',
        subjectId: user.id,
      });
    }

    res.status(202).json(ACKNOWLEDGEMENT);
  },
);

passwordResetRouter.post(
  '/password-reset/confirm',
  rateLimit({ points: 5, durationSeconds: 60, keyPrefix: 'password-reset-confirm' }),
  async (req, res) => {
    const parsed = confirmBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid request body');

    const consumed = await consumeOneTimeToken(
      parsed.data.userId,
      'password_reset',
      parsed.data.token,
    );
    if (!consumed) throw new HttpError(400, 'Invalid or expired reset link');

    const passwordHash = await hashPassword(parsed.data.newPassword);
    await db.update(users).set({ passwordHash }).where(eq(users.id, parsed.data.userId));
    await revokeAllSessionsForUser(parsed.data.userId);

    await recordAuditEvent(req, {
      eventType: 'auth.password_reset_completed',
      actorUserId: parsed.data.userId,
      subjectType: 'user',
      subjectId: parsed.data.userId,
    });

    res.status(200).json({ message: 'Password updated. Please sign in again.' });
  },
);
