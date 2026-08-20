import { eq } from 'drizzle-orm';
import { Router } from 'express';

import { resolveSession } from '../../auth/session.js';
import { decryptField } from '../../crypto/field-encryption.js';
import { db } from '../../db/client.js';
import { users } from '../../db/schema/index.js';

export const sessionInfoRouter = Router();

sessionInfoRouter.get('/session', async (req, res) => {
  const session = await resolveSession(req);
  if (!session) {
    res.status(200).json({ user: null });
    return;
  }

  const user = await db.query.users.findFirst({ where: eq(users.id, session.userId) });
  if (!user) {
    res.status(200).json({ user: null });
    return;
  }

  res.status(200).json({
    user: { id: user.id, email: decryptField(user.emailEncrypted), status: user.status },
  });
});
