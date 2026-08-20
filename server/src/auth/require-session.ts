import { eq } from 'drizzle-orm';
import type { NextFunction, Request, Response } from 'express';

import { db } from '../db/client.js';
import { users } from '../db/schema/index.js';
import { HttpError } from '../middleware/error-handler.js';
import { resolveSession } from './session.js';

declare module 'express-serve-static-core' {
  interface Request {
    userId?: string;
    sessionId?: string;
  }
}

export async function requireSession(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  const session = await resolveSession(req);
  if (!session) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }
  req.userId = session.userId;
  req.sessionId = session.id;
  next();
}

export async function requireVerifiedAccount(
  req: Request,
  _res: Response,
  next: NextFunction,
): Promise<void> {
  if (!req.userId) {
    next(new HttpError(401, 'Authentication required'));
    return;
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, req.userId) });
  if (user?.status !== 'active') {
    next(new HttpError(403, 'Account not verified'));
    return;
  }
  next();
}
