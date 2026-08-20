import { integer, pgTable, primaryKey, text, timestamp } from 'drizzle-orm/pg-core';

import { transfers } from './transfers.js';

export const transferChunks = pgTable(
  'transfer_chunks',
  {
    transferId: text('transfer_id')
      .notNull()
      .references(() => transfers.id, { onDelete: 'cascade' }),
    chunkIndex: integer('chunk_index').notNull(),
    ciphertextBytes: integer('ciphertext_bytes').notNull(),
    sha256: text('sha256').notNull(),
    storedAt: timestamp('stored_at', { withTimezone: true }).notNull().defaultNow(),
  },
  (table) => [primaryKey({ columns: [table.transferId, table.chunkIndex] })],
);
