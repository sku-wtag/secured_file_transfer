import type { NextFunction, Request, Response } from 'express';

import { CSRF_COOKIE_NAME, csrfCookieOptions } from '../auth/cookies.js';
import { env } from '../config/env.js';
import { constantTimeEqual } from '../crypto/hashing.js';
import { generateToken } from '../crypto/random.js';
import { HttpError } from './error-handler.js';

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);
const allowedOrigins = new Set([env.CLIENT_ORIGIN, env.PUBLIC_BASE_URL]);

function isStringCookie(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

export function ensureCsrfCookie(req: Request, res: Response, next: NextFunction): void {
  if (!isStringCookie(req.cookies[CSRF_COOKIE_NAME])) {
    res.cookie(CSRF_COOKIE_NAME, generateToken(), csrfCookieOptions());
  }
  next();
}

export function requireCsrf(req: Request, _res: Response, next: NextFunction): void {
  if (SAFE_METHODS.has(req.method)) {
    next();
    return;
  }

  const origin = req.headers.origin;
  if (typeof origin === 'string' && !allowedOrigins.has(origin)) {
    next(new HttpError(403, 'Origin not allowed'));
    return;
  }

  const cookieToken: unknown = req.cookies[CSRF_COOKIE_NAME];
  const headerToken = req.headers['x-csrf-token'];

  if (
    !isStringCookie(cookieToken) ||
    typeof headerToken !== 'string' ||
    !constantTimeEqual(cookieToken, headerToken)
  ) {
    next(new HttpError(403, 'Invalid or missing CSRF token'));
    return;
  }

  next();
}
