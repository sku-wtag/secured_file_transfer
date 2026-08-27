import type { NextFunction, Request, Response } from 'express';

import { recordServerError } from '../devtools/error-log.js';

export class HttpError extends Error {
  readonly status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = 'HttpError';
    this.status = status;
  }
}

export function notFoundHandler(req: Request, res: Response): void {
  res.status(404).json({ error: 'Not Found', path: req.originalUrl });
}

function requestIdOf(req: Request): string | undefined {
  return typeof req.id === 'string' ? req.id : undefined;
}

export function errorHandler(err: unknown, req: Request, res: Response, _next: NextFunction): void {
  if (err instanceof HttpError && err.status < 500) {
    res.status(err.status).json({ error: err.message });
    return;
  }

  const status = err instanceof HttpError ? err.status : 500;
  const requestId = requestIdOf(req);

  req.log.error({ err }, 'unhandled request error');
  recordServerError({
    requestId,
    method: req.method,
    path: req.originalUrl,
    status,
    error: err,
  });

  res.status(status).json({ error: 'Internal Server Error', requestId });
}
