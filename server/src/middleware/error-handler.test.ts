import assert from 'node:assert/strict';
import test from 'node:test';

import express from 'express';
import request from 'supertest';

import { logger } from '../logger.js';
import { errorHandler, HttpError } from './error-handler.js';

function errorFieldOf(body: string): unknown {
  return (JSON.parse(body) as { error: unknown }).error;
}

function testApp(thrown: unknown) {
  const app = express();
  app.use((req, _res, next) => {
    req.log = logger;
    next();
  });
  app.get('/', () => {
    throw thrown;
  });
  app.use(errorHandler);
  return app;
}

void test('a database failure never returns its query to the client', async () => {
  const drizzleFailure = new Error(
    'Failed query: select "id", "email_hash" from "users" where "users"."id" = $1\nparams: 42',
  );
  const response = await request(testApp(drizzleFailure)).get('/');

  assert.strictEqual(response.status, 500);
  assert.strictEqual(errorFieldOf(response.text), 'Internal Server Error');
  assert.doesNotMatch(response.text, /select|from "users"|params/i);
});

void test('a deliberate client error keeps its message', async () => {
  const response = await request(testApp(new HttpError(404, 'Transfer not found'))).get('/');

  assert.strictEqual(response.status, 404);
  assert.strictEqual(errorFieldOf(response.text), 'Transfer not found');
});

void test('a server-side HttpError is redacted like any other failure', async () => {
  const response = await request(testApp(new HttpError(503, 'postgres pool exhausted'))).get('/');

  assert.strictEqual(response.status, 503);
  assert.strictEqual(errorFieldOf(response.text), 'Internal Server Error');
});
