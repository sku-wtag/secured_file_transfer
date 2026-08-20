import { eq } from 'drizzle-orm';
import type { Request, Response } from 'express';
import { Router } from 'express';
import { z } from 'zod';

import { recordAuditEvent } from '../../audit/audit-log.js';
import { hashPassword, verifyPassword } from '../../auth/password.js';
import { issueSession } from '../../auth/session.js';
import { emailLookupHash, normalizeEmail } from '../../crypto/email-lookup.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';
import { HttpError } from '../../middleware/error-handler.js';
import { rateLimit } from '../../middleware/rate-limit.js';

type User = typeof users.$inferSelect;

const loginBody = z.object({ email: z.email(), password: z.string().min(1) });

const MAX_FAILED_ATTEMPTS = 10;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000;
const GENERIC_FAILURE = 'Invalid email or password';
const DUMMY_PASSWORD = 'not-a-real-password-used-only-for-timing-parity';

let dummyHash: Promise<string> | undefined;
function getDummyHash(): Promise<string> {
  dummyHash ??= hashPassword(DUMMY_PASSWORD);
  return dummyHash;
}

function isAccountLocked(user: User): boolean {
  return Boolean(user.lockedUntil && user.lockedUntil > new Date());
}

async function recordFailedAttempt(userId: string, currentCount: number): Promise<void> {
  const nextCount = currentCount + 1;
  const lockedUntil =
    nextCount >= MAX_FAILED_ATTEMPTS ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null;
  await db
    .update(users)
    .set({ failedLoginCount: nextCount, lockedUntil })
    .where(eq(users.id, userId));
}

async function recordLoginFailure(
  req: Request,
  user: User | undefined,
  passwordOk: boolean,
): Promise<void> {
  if (user && !passwordOk && !isAccountLocked(user)) {
    await recordFailedAttempt(user.id, user.failedLoginCount);
  }
  if (user) {
    await recordAuditEvent(req, {
      eventType: 'auth.login_failure',
      subjectType: 'user',
      subjectId: user.id,
    });
  }
}

async function completeLogin(req: Request, res: Response, user: User): Promise<void> {
  await db.update(users).set({ failedLoginCount: 0 }).where(eq(users.id, user.id));
  await issueSession(req, res, user.id);
  await recordAuditEvent(req, {
    eventType: 'auth.login_success',
    actorUserId: user.id,
    subjectType: 'user',
    subjectId: user.id,
  });
  res.status(200).json({ message: 'Signed in' });
}

export const loginRouter = Router();

loginRouter.post(
  '/login',
  rateLimit({ points: 10, durationSeconds: 60, keyPrefix: 'login-ip' }),
  async (req, res) => {
    const parsed = loginBody.safeParse(req.body);
    if (!parsed.success) throw new HttpError(400, 'Invalid request body');

    const email = normalizeEmail(parsed.data.email);
    const user = await db.query.users.findFirst({
      where: eq(users.emailLookupHash, emailLookupHash(email)),
    });

    const passwordOk = await verifyPassword(
      user?.passwordHash ?? (await getDummyHash()),
      parsed.data.password,
    );

    if (!user || !passwordOk || isAccountLocked(user)) {
      await recordLoginFailure(req, user, passwordOk);
      throw new HttpError(401, GENERIC_FAILURE);
    }
    if (user.status !== 'active') {
      throw new HttpError(403, 'Please verify your email before signing in');
    }

    await completeLogin(req, res, user);
  },
);
