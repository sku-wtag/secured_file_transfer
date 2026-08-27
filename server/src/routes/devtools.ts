import { Router } from 'express';

import { recentServerErrors } from '../devtools/error-log.js';
import { HttpError } from '../middleware/error-handler.js';

export const devtoolsRouter = Router();

devtoolsRouter.get('/errors', (_req, res) => {
  res.json({ errors: recentServerErrors() });
});

devtoolsRouter.get('/errors/:requestId', (req, res) => {
  const entry = recentServerErrors().find(({ requestId }) => requestId === req.params.requestId);
  if (!entry) throw new HttpError(404, 'No recorded error for that request id');
  res.json(entry);
});
