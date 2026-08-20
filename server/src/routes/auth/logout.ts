import { Router } from 'express';

import { recordAuditEvent } from '../../audit/audit-log.js';
import { requireSession } from '../../auth/require-session.js';
import { clearSessionCookies, revokeSession } from '../../auth/session.js';
import { HttpError } from '../../middleware/error-handler.js';

export const logoutRouter = Router();

logoutRouter.post('/logout', requireSession, async (req, res) => {
  const { userId, sessionId } = req;
  if (!userId || !sessionId) throw new HttpError(401, 'Authentication required');

  await revokeSession(sessionId);
  clearSessionCookies(res);
  await recordAuditEvent(req, {
    eventType: 'auth.logout',
    actorUserId: userId,
    subjectType: 'user',
    subjectId: userId,
  });

  res.status(204).end();
});
