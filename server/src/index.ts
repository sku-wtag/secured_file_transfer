import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();
const server = app.listen(env.PORT, () => {
  console.log(`Server listening on http://localhost:${String(env.PORT)}`);
});

/** Let in-flight requests finish before the process exits. */
for (const signal of ['SIGINT', 'SIGTERM'] as const) {
  process.on(signal, () => {
    console.log(`Received ${signal}, shutting down.`);
    server.close(() => process.exit(0));
  });
}
