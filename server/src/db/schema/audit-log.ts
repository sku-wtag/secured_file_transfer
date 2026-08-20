import { jsonb, pgTable, text, timestamp } from 'drizzle-orm/pg-core';

export const auditLog = pgTable('audit_log', {
  id: text('id').primaryKey(),
  occurredAt: timestamp('occurred_at', { withTimezone: true }).notNull().defaultNow(),
  eventType: text('event_type').notNull(),
  actorUserId: text('actor_user_id'),
  actorIpTruncated: text('actor_ip_truncated'),
  subjectType: text('subject_type').notNull(),
  subjectId: text('subject_id').notNull(),
  detail: jsonb('detail').notNull().default({}),
});
