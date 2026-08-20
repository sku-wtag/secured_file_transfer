import { integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const userStatus = pgEnum('user_status', ['pending_verification', 'active', 'disabled']);

export const users = pgTable('users', {
  id: text('id').primaryKey(),
  emailLookupHash: text('email_lookup_hash').notNull().unique(),
  emailEncrypted: text('email_encrypted').notNull(),
  passwordHash: text('password_hash').notNull(),
  status: userStatus('status').notNull().default('pending_verification'),
  failedLoginCount: integer('failed_login_count').notNull().default(0),
  lockedUntil: timestamp('locked_until', { withTimezone: true }),
  storageUsedBytes: integer('storage_used_bytes').notNull().default(0),
  emailVerifiedAt: timestamp('email_verified_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).notNull().defaultNow(),
});
