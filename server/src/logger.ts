import pino from 'pino';

import { isProduction } from './config/env.js';

export const logger = pino({ level: isProduction ? 'info' : 'debug' });
