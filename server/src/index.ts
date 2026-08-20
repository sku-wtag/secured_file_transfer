import type { Server } from 'node:http';

import { createApp } from './app.js';
import { env } from './config/env.js';

function exitAfterInFlightRequestsFinish(server: Server): void {
  for (const signal of ['SIGINT', 'SIGTERM'] as const) {
    process.on(signal, () => {
      console.log(`Received ${signal}, shutting down.`);
      server.close(() => process.exit(0));
    });
  }
}

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${String(env.PORT)}`);
});

exitAfterInFlightRequestsFinish(server);
