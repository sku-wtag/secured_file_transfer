import { fileURLToPath } from 'node:url';

import { migrate } from 'drizzle-orm/postgres-js/migrator';

import { logger } from '../logger.js';
import { db } from './client.js';

const migrationsFolder = fileURLToPath(new URL('./migrations', import.meta.url));

export async function runMigrations(): Promise<void> {
  await migrate(db, { migrationsFolder });
  logger.info('database migrations applied');
}
