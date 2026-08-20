import { config as loadDotenv } from 'dotenv';
import { z } from 'zod';

// Loaded here rather than in `index.ts` because ESM hoists imports: any module
// that reads `process.env` at import time must see the file already applied.
// Workspace-local `.env` wins over a shared one at the repo root.
loadDotenv({ path: ['.env', '../.env'], quiet: true });

/**
 * Parsed once at boot so a misconfigured environment fails fast and loudly
 * instead of surfacing as an undefined value deep in a request handler.
 */
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(3000),
  CLIENT_ORIGIN: z.url().default('http://localhost:5173'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
export const isProduction = env.NODE_ENV === 'production';
