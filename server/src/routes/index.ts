import { Router } from 'express';

import { authRouter } from './auth/index.js';
import { healthRouter } from './health.js';

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use('/auth', authRouter);
