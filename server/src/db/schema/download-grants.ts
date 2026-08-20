import { pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { transfers } from './transfers.js';

export const downloadGrants = pgTable('download_grants', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id')
    .notNull()
    .references(() => transfers.id, { onDelete: 'cascade' }),
  secretHash: text('secret_hash').notNull(),
  ipTruncated: text('ip_truncated').notNull(),
  issuedAt: timestamp('issued_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
});
