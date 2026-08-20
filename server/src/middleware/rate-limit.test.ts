import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import { errorHandler } from './error-handler.js';
import { rateLimit } from './rate-limit.js';

function testApp() {
  const app = express();
  app.use(
    rateLimit({ points: 2, durationSeconds: 60, keyPrefix: `test-${String(Math.random())}` }),
  );
  app.get('/', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

void test('allows requests within the point budget', async () => {
  const app = testApp();
  assert.strictEqual((await request(app).get('/')).status, 200);
  assert.strictEqual((await request(app).get('/')).status, 200);
});

void test('rejects once the point budget is exhausted', async () => {
  const app = testApp();
  await request(app).get('/');
  await request(app).get('/');
  const response = await request(app).get('/');
  assert.strictEqual(response.status, 429);
});
