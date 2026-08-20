import { and, eq, isNull } from 'drizzle-orm';

import { constantTimeEqual, sha256Hex } from '../crypto/hashing.js';
import { generateId, generateToken } from '../crypto/random.js';
import { db } from '../db/client.js';
import { oneTimeTokens } from '../db/schema/index.js';

type OneTimeTokenPurpose = 'email_verification' | 'password_reset';

const TOKEN_TTL_MS = new Map<OneTimeTokenPurpose, number>([
  ['email_verification', 24 * 60 * 60 * 1000],
  ['password_reset', 60 * 60 * 1000],
]);

export async function issueOneTimeToken(
  userId: string,
  purpose: OneTimeTokenPurpose,
): Promise<string> {
  const token = generateToken();
  const ttlMs = TOKEN_TTL_MS.get(purpose) ?? 60 * 60 * 1000;

  await db.insert(oneTimeTokens).values({
    id: generateId(),
    userId,
    purpose,
    tokenHash: sha256Hex(Buffer.from(token)),
    expiresAt: new Date(Date.now() + ttlMs),
  });

  return token;
}

export async function consumeOneTimeToken(
  userId: string,
  purpose: OneTimeTokenPurpose,
  token: string,
): Promise<boolean> {
  const tokenHash = sha256Hex(Buffer.from(token));

  const candidates = await db.query.oneTimeTokens.findMany({
    where: and(
      eq(oneTimeTokens.userId, userId),
      eq(oneTimeTokens.purpose, purpose),
      isNull(oneTimeTokens.consumedAt),
    ),
  });

  const now = new Date();
  const match = candidates.find(
    (row) => constantTimeEqual(row.tokenHash, tokenHash) && row.expiresAt > now,
  );
  if (!match) return false;

  await db.update(oneTimeTokens).set({ consumedAt: now }).where(eq(oneTimeTokens.id, match.id));
  return true;
}
