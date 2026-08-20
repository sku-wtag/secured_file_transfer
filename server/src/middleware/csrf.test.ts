import assert from 'node:assert/strict';
import test from 'node:test';

import cookieParser from 'cookie-parser';
import express from 'express';
import request from 'supertest';

import { CSRF_COOKIE_NAME } from '../auth/cookies.js';
import { env } from '../config/env.js';
import { requireCsrf } from './csrf.js';
import { errorHandler } from './error-handler.js';

function testApp() {
  const app = express();
  app.use(cookieParser());
  app.use(requireCsrf);
  app.get('/', (_req, res) => {
    res.json({ ok: true });
  });
  app.post('/', (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

void test('GET requests pass through without any CSRF token', async () => {
  const response = await request(testApp()).get('/');
  assert.strictEqual(response.status, 200);
});

void test('POST without a CSRF cookie or header is rejected', async () => {
  const response = await request(testApp()).post('/');
  assert.strictEqual(response.status, 403);
});

void test('POST with a matching cookie and header succeeds', async () => {
  const response = await request(testApp())
    .post('/')
    .set('Cookie', `${CSRF_COOKIE_NAME}=abc123`)
    .set('Origin', env.CLIENT_ORIGIN)
    .set('X-CSRF-Token', 'abc123');
  assert.strictEqual(response.status, 200);
});

void test('POST with a mismatched header is rejected', async () => {
  const response = await request(testApp())
    .post('/')
    .set('Cookie', `${CSRF_COOKIE_NAME}=abc123`)
    .set('Origin', env.CLIENT_ORIGIN)
    .set('X-CSRF-Token', 'not-the-same-token');
  assert.strictEqual(response.status, 403);
});

void test('POST from a disallowed Origin is rejected even with a matching token', async () => {
  const response = await request(testApp())
    .post('/')
    .set('Cookie', `${CSRF_COOKIE_NAME}=abc123`)
    .set('Origin', 'https://attacker.example')
    .set('X-CSRF-Token', 'abc123');
  assert.strictEqual(response.status, 403);
});
