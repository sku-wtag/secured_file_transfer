import type { Request } from 'express';

import { truncateIp } from '../crypto/hashing.js';
import { generateId } from '../crypto/random.js';
import { db } from '../db/client.js';
import { auditLog } from '../db/schema/index.js';

export type AuditEventType =
  | 'auth.signup'
  | 'auth.login_success'
  | 'auth.login_failure'
  | 'auth.logout'
  | 'auth.email_verified'
  | 'auth.password_reset_requested'
  | 'auth.password_reset_completed'
  | 'auth.account_locked';

interface AuditEvent {
  eventType: AuditEventType;
  actorUserId?: string;
  subjectType: string;
  subjectId: string;
  detail?: Record<string, unknown>;
}

export async function recordAuditEvent(req: Request, event: AuditEvent): Promise<void> {
  await db.insert(auditLog).values({
    id: generateId(),
    eventType: event.eventType,
    actorUserId: event.actorUserId ?? null,
    actorIpTruncated: truncateIp(req.ip ?? '0.0.0.0'),
    subjectType: event.subjectType,
    subjectId: event.subjectId,
    detail: event.detail ?? {},
  });
}
