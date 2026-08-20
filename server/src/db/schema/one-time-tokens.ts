import { pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const oneTimeTokenPurpose = pgEnum('one_time_token_purpose', [
  'email_verification',
  'password_reset',
]);

export const oneTimeTokens = pgTable('one_time_tokens', {
  id: text('id').primaryKey(),
  userId: text('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  purpose: oneTimeTokenPurpose('purpose').notNull(),
  tokenHash: text('token_hash').notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  consumedAt: timestamp('consumed_at', { withTimezone: true }),
});
