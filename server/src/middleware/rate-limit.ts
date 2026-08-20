import type { NextFunction, Request, RequestHandler, Response } from 'express';
import { RateLimiterMemory } from 'rate-limiter-flexible';

import { HttpError } from './error-handler.js';

interface RateLimitOptions {
  points: number;
  durationSeconds: number;
  keyPrefix: string;
  keyFor?: (req: Request) => string;
}

function defaultKey(req: Request): string {
  return req.ip ?? 'unknown';
}

export function rateLimit(options: RateLimitOptions): RequestHandler {
  const limiter = new RateLimiterMemory({
    points: options.points,
    duration: options.durationSeconds,
    keyPrefix: options.keyPrefix,
  });
  const keyFor = options.keyFor ?? defaultKey;

  return function rateLimitMiddleware(req: Request, _res: Response, next: NextFunction): void {
    limiter
      .consume(keyFor(req))
      .then(() => {
        next();
      })
      .catch(() => {
        next(new HttpError(429, 'Too many requests'));
      });
  };
}
