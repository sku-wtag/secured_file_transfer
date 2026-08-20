import type { CookieOptions } from 'express';
import { csrfCookieName, sessionCookieName } from 'shared';

import { isProduction } from '../config/env.js';

export const SESSION_COOKIE_NAME = sessionCookieName(isProduction);
export const CSRF_COOKIE_NAME = csrfCookieName(isProduction);

export function baseCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: 'strict',
    path: '/',
  };
}

export function csrfCookieOptions(): CookieOptions {
  return { ...baseCookieOptions(), httpOnly: false };
}
