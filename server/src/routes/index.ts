import { Router } from 'express';

import { env } from '../config/env.js';
import { logger } from '../logger.js';
import { authRouter } from './auth/index.js';
import { devtoolsRouter } from './devtools.js';
import { downloadRouter } from './download.js';
import { healthRouter } from './health.js';
import { transfersRouter } from './transfers.js';
import { uploadRouter } from './upload.js';

export const apiRouter = Router();

if (env.DEVTOOLS_ENABLED) {
  logger.warn('backend devtools enabled at /api/devtools — never enable this in production');
  apiRouter.use('/devtools', devtoolsRouter);
}

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/transfers', uploadRouter);
apiRouter.use('/download', downloadRouter);
