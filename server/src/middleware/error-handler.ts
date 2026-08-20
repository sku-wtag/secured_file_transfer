import type { NextFunction, Request, Response } from 'express';

import { isProduction } from '../config/env.js';

/** Errors thrown with a known HTTP status, so handlers can signal intent. */
export class HttpError extends Error {
  // Declared as a plain field rather than a constructor parameter property:
  // `erasableSyntaxOnly` forbids syntax that emits runtime code.
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

/**
 * Express identifies error middleware by arity, so all four parameters must
 * stay in the signature even though `next` is unused.
 */
export function errorHandler(
  err: unknown,
  _req: Request,
  res: Response,
  _next: NextFunction,
): void {
  const status = err instanceof HttpError ? err.status : 500;
  const message = err instanceof Error ? err.message : 'Internal Server Error';

  if (status >= 500) {
    console.error(err);
  }

  res.status(status).json({
    error: status >= 500 && isProduction ? 'Internal Server Error' : message,
  });
}
