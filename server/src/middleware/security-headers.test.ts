import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import { securityHeaders } from './security-headers.js';

function appWith(production: boolean) {
  const app = express();
  app.use(securityHeaders(production));
  app.get('/', (_req, res) => {
    res.send('ok');
  });
  return app;
}

void test('production mode sends a locked-down CSP with no third-party origins', async () => {
  const response = await request(appWith(true)).get('/');
  const csp = response.headers['content-security-policy'];
  assert.ok(csp);
  assert.match(csp, /default-src 'none'/);
  assert.match(csp, /script-src 'self'/);
  assert.doesNotMatch(csp, /https?:\/\//);
});

void test('production mode sends HSTS with includeSubDomains and preload', async () => {
  const response = await request(appWith(true)).get('/');
  const hsts = response.headers['strict-transport-security'];
  assert.ok(hsts);
  assert.match(hsts, /includeSubDomains/);
  assert.match(hsts, /preload/);
});

void test('dev mode omits CSP so Vite HMR keeps working', async () => {
  const response = await request(appWith(false)).get('/');
  assert.strictEqual(response.headers['content-security-policy'], undefined);
});

void test('every mode sends nosniff, no-referrer, and same-origin isolation headers', async () => {
  const response = await request(appWith(false)).get('/');
  assert.strictEqual(response.headers['x-content-type-options'], 'nosniff');
  assert.strictEqual(response.headers['referrer-policy'], 'no-referrer');
  assert.strictEqual(response.headers['cross-origin-resource-policy'], 'same-origin');
});
