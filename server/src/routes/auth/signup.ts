import { eq } from 'drizzle-orm';
import { Router } from 'express';
import { z } from 'zod';

import { recordAuditEvent } from '../../audit/audit-log.js';
import { issueOneTimeToken } from '../../auth/one-time-tokens.js';
import { hashPassword, MIN_PASSWORD_LENGTH } from '../../auth/password.js';
import { env } from '../../config/env.js';
import { emailLookupHash, normalizeEmail } from '../../crypto/email-lookup.js';
import { encryptField } from '../../crypto/field-encryption.js';
import { generateId } from '../../crypto/random.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { enqueueMail } from '../../jobs/queues.js';
import { HttpError } from '../../middleware/error-handler.js';
import { rateLimit } from '../../middleware/rate-limit.js';

const signupBody = z.object({
  email: z.email(),
  password: z.string().min(MIN_PASSWORD_LENGTH),
});

const ACKNOWLEDGEMENT = {
  message: 'If that address can be registered, a verification email has been sent to it.',
};

export const signupRouter = Router();

signupRouter.post(
  '/signup',
  rateLimit({ points: 5, durationSeconds: 60, keyPrefix: 'signup' }),
  async (req, res) => {
    const parsed = signupBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid request body');

    const email = normalizeEmail(parsed.data.email);
    const lookupHash = emailLookupHash(email);
    const passwordHash = await hashPassword(parsed.data.password);

    const existing = await db.query.users.findFirst({
      where: eq(users.emailLookupHash, lookupHash),
    });

    if (existing) {
      res.status(202).json(ACKNOWLEDGEMENT);
      return;
    }

    const userId = generateId();
    await db.insert(users).values({
      id: userId,
      emailLookupHash: lookupHash,
      emailEncrypted: encryptField(email),
      passwordHash,
    });

    const token = await issueOneTimeToken(userId, 'email_verification');
    await enqueueMail({
      to: email,
      subject: 'Verify your email',
      text: `Verify your account: ${env.APP_ORIGIN}/verify-email?uid=${userId}&token=${token}`,
    });
    await recordAuditEvent(req, {
      eventType: 'auth.signup',
      subjectType: 'user',
      subjectId: userId,
    });

    res.status(202).json(ACKNOWLEDGEMENT);
  },
);
