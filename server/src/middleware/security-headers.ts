import type { RequestHandler } from 'express';
import helmet from 'helmet';

import { isProduction } from '../config/env.js';

const productionCsp = {
  useDefaults: false,
  directives: {
    defaultSrc: ["'none'"],
    scriptSrc: ["'self'"],
    styleSrc: ["'self'"],
    imgSrc: ["'self'", 'data:'],
    connectSrc: ["'self'"],
    fontSrc: ["'self'"],
    workerSrc: ["'self'"],
    frameAncestors: ["'none'"],
    objectSrc: ["'none'"],
    baseUri: ["'none'"],
    formAction: ["'self'"],
  },
};

export function securityHeaders(production = isProduction): RequestHandler {
  return helmet({
    contentSecurityPolicy: production ? productionCsp : false,
    crossOriginResourcePolicy: { policy: 'same-origin' },
    referrerPolicy: { policy: 'no-referrer' },
    hsts: production ? { maxAge: 31_536_000, includeSubDomains: true, preload: true } : false,
  });
}
