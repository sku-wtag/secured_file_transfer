import { bigint, integer, pgEnum, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

import { users } from './users.js';

export const transferStatus = pgEnum('transfer_status', [
  'uploading',
  'ready',
  'revoked',
  'expired',
]);

export const transferGate = pgEnum('transfer_gate', ['link', 'link_password']);

export const transfers = pgTable('transfers', {
  id: text('id').primaryKey(),
  ownerId: text('owner_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  status: transferStatus('status').notNull().default('uploading'),
  gate: transferGate('gate').notNull().default('link'),
  gateVerifierHash: text('gate_verifier_hash'),

  wrappedFileKey: text('wrapped_file_key'),
  wrapNonce: text('wrap_nonce'),
  encryptedManifest: text('encrypted_manifest'),
  noncePrefix: text('nonce_prefix'),

  chunkSizeBytes: integer('chunk_size_bytes').notNull(),
  chunkCount: integer('chunk_count').notNull(),
  totalCiphertextBytes: bigint('total_ciphertext_bytes', { mode: 'number' }).notNull().default(0),

  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  maxDownloads: integer('max_downloads'),
  downloadCount: integer('download_count').notNull().default(0),

  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  finalizedAt: timestamp('finalized_at', { withTimezone: true }),
  revokedAt: timestamp('revoked_at', { withTimezone: true }),
});
