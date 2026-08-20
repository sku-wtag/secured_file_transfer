import { bigint, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { downloadGrants } from './download-grants.js';
import { transfers } from './transfers.js';

export const downloadEvents = pgTable('download_events', {
  id: text('id').primaryKey(),
  transferId: text('transfer_id')
    .notNull()
    .references(() => transfers.id, { onDelete: 'cascade' }),
  grantId: text('grant_id')
    .notNull()
    .references(() => downloadGrants.id, { onDelete: 'cascade' }),
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  bytesServed: bigint('bytes_served', { mode: 'number' }).notNull().default(0),
  ipTruncated: text('ip_truncated').notNull(),
  userAgentHash: text('user_agent_hash').notNull(),
});
