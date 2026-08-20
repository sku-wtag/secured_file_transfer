import { and, eq, sql } from 'drizzle-orm';

import { env } from '../config/env.js';
import { db } from '../db/client.js';
import { users } from '../db/schema/index.js';

export async function reserveQuota(userId: string, bytes: number): Promise<boolean> {
  const updated = await db
    .update(users)
    .set({ storageUsedBytes: sql`${users.storageUsedBytes} + ${bytes}` })
    .where(
      and(
        eq(users.id, userId),
        sql`${users.storageUsedBytes} + ${bytes} <= ${env.ACCOUNT_QUOTA_BYTES}`,
      ),
    )
    .returning({ id: users.id });
  return updated.length > 0;
}

export async function releaseQuota(userId: string, bytes: number): Promise<void> {
  await db
    .update(users)
    .set({ storageUsedBytes: sql`greatest(${users.storageUsedBytes} - ${bytes}, 0)` })
    .where(eq(users.id, userId));
}
