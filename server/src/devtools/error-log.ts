import { inspect } from 'node:util';

import { env } from '../config/env.js';

const MAX_ENTRIES = 50;
const MAX_CAUSE_DEPTH = 3;

interface ErrorDetail {
  name: string;
  message: string;
  stack?: string;
  query?: string;
  params?: unknown;
  cause?: ErrorDetail;
}

export interface ServerErrorEntry {
  requestId: string | undefined;
  method: string;
  path: string;
  status: number;
  occurredAt: string;
  detail: ErrorDetail;
}

interface RecordServerErrorInput {
  requestId: string | undefined;
  method: string;
  path: string;
  status: number;
  error: unknown;
}

const entries: ServerErrorEntry[] = [];

function readStringProperty(source: object, key: string): string | undefined {
  const value = (source as Record<string, unknown>)[key];
  return typeof value === 'string' ? value : undefined;
}

function describeError(error: unknown, remainingDepth: number): ErrorDetail {
  if (!(error instanceof Error)) {
    return { name: 'NonError', message: inspect(error, { depth: 2 }) };
  }

  const detail: ErrorDetail = { name: error.name, message: error.message };
  if (error.stack !== undefined) detail.stack = error.stack;

  const query = readStringProperty(error, 'query');
  if (query !== undefined) detail.query = query;
  if ('params' in error) detail.params = error.params;

  if (error.cause !== undefined && remainingDepth > 0) {
    detail.cause = describeError(error.cause, remainingDepth - 1);
  }

  return detail;
}

export function recordServerError({ error, ...context }: RecordServerErrorInput): void {
  if (!env.DEVTOOLS_ENABLED) return;

  entries.push({
    ...context,
    occurredAt: new Date().toISOString(),
    detail: describeError(error, MAX_CAUSE_DEPTH),
  });

  if (entries.length > MAX_ENTRIES) entries.shift();
}

export function recentServerErrors(): ServerErrorEntry[] {
  return [...entries].reverse();
}
