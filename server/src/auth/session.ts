import { and, eq, isNull } from 'drizzle-orm';
import type { Request, Response } from 'express';

import { env } from '../config/env.js';
import { constantTimeEqual, sha256Hex, truncateIp } from '../crypto/hashing.js';
import { generateId, generateToken } from '../crypto/random.js';
import { db } from '../db/client.js';
import { sessions } from '../db/schema/index.js';
import {
  baseCookieOptions,
  CSRF_COOKIE_NAME,
  csrfCookieOptions,
  SESSION_COOKIE_NAME,
} from './cookies.js';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

export interface SessionRecord {
  id: string;
  userId: string;
}

function requestFingerprint(req: Request) {
  return {
    ipTruncated: truncateIp(req.ip ?? '0.0.0.0'),
    userAgentHash: sha256Hex(Buffer.from(req.headers['user-agent'] ?? '')),
  };
}

export async function issueSession(req: Request, res: Response, userId: string): Promise<void> {
  const id = generateId();
  const secret = generateToken();
  const now = Date.now();
  const { ipTruncated, userAgentHash } = requestFingerprint(req);

  await db.insert(sessions).values({
    id,
    userId,
    secretHash: sha256Hex(Buffer.from(secret)),
    ipTruncated,
    userAgentHash,
    idleExpiresAt: new Date(now + env.SESSION_IDLE_HOURS * HOUR_MS),
    absoluteExpiresAt: new Date(now + env.SESSION_ABSOLUTE_DAYS * DAY_MS),
  });

  res.cookie(SESSION_COOKIE_NAME, `${id}.${secret}`, baseCookieOptions());
  res.cookie(CSRF_COOKIE_NAME, generateToken(), csrfCookieOptions());
}

export function clearSessionCookies(res: Response): void {
  res.clearCookie(SESSION_COOKIE_NAME, baseCookieOptions());
  res.clearCookie(CSRF_COOKIE_NAME, csrfCookieOptions());
}

export async function resolveSession(req: Request): Promise<SessionRecord | null> {
  const cookieValue: unknown = req.cookies[SESSION_COOKIE_NAME];
  if (typeof cookieValue !== 'string') return null;

  const separatorIndex = cookieValue.indexOf('.');
  if (separatorIndex < 0) return null;
  const id = cookieValue.slice(0, separatorIndex);
  const secret = cookieValue.slice(separatorIndex + 1);

  const row = await db.query.sessions.findFirst({ where: eq(sessions.id, id) });
  if (!row || row.revokedAt) return null;
  if (!constantTimeEqual(row.secretHash, sha256Hex(Buffer.from(secret)))) return null;

  const now = new Date();
  if (row.idleExpiresAt < now || row.absoluteExpiresAt < now) return null;

  await db
    .update(sessions)
    .set({
      lastSeenAt: now,
      idleExpiresAt: new Date(now.getTime() + env.SESSION_IDLE_HOURS * HOUR_MS),
    })
    .where(eq(sessions.id, id));

  return { id: row.id, userId: row.userId };
}

export async function revokeSession(sessionId: string): Promise<void> {
  await db.update(sessions).set({ revokedAt: new Date() }).where(eq(sessions.id, sessionId));
}

export async function revokeAllSessionsForUser(userId: string): Promise<void> {
  await db
    .update(sessions)
    .set({ revokedAt: new Date() })
    .where(and(eq(sessions.userId, userId), isNull(sessions.revokedAt)));
}
