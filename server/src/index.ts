import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';
import { runMigrations } from './db/migrate.js';
import { startBackgroundJobs, stopBackgroundJobs } from './jobs/workers.js';
import { logger } from './logger.js';

const KEEP_ALIVE_TIMEOUT_MS = 65_000;
const HEADERS_TIMEOUT_MS = 66_000;
const REQUEST_TIMEOUT_MS = 5 * 60 * 1000;

function exitAfterInFlightRequestsFinish(server: Server): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      logger.info({ signal }, 'shutting down');
      server.close(() => {
        stopBackgroundJobs().then(
          () => process.exit(0),
          (err: unknown) => {
            logger.error({ err }, 'failed to stop background workers');
            process.exit(1);
          },
        );
      });
    });
  }
}

async function main(): Promise<void> {
  await runMigrations();
  await startBackgroundJobs();

  const app = createApp();
  const server = app.listen(env.PORT, () => {
    logger.info({ port: env.PORT }, 'server listening');
  });

  server.keepAliveTimeout = KEEP_ALIVE_TIMEOUT_MS;
  server.headersTimeout = HEADERS_TIMEOUT_MS;
  server.requestTimeout = REQUEST_TIMEOUT_MS;

  exitAfterInFlightRequestsFinish(server);
}

main().catch((err: unknown) => {
  logger.error({ err }, 'failed to start server');
  process.exit(1);
});
