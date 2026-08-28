import { Router } from 'express';

import { authRouter } from './auth/index.js';
import { downloadRouter } from './download.js';
import { healthRouter } from './health.js';
import { transfersRouter } from './transfers.js';
import { uploadRouter } from './upload.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
apiRouter.use('/transfers', transfersRouter);
apiRouter.use('/transfers', uploadRouter);
apiRouter.use('/download', downloadRouter);
