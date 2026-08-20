import assert from 'node:assert/strict';
import test from 'node:test';

import { hashPassword, verifyPassword } from './password.js';

void test('verifies a correct password against its hash', async () => {
  const hash = await hashPassword('a reasonably long passphrase');
  assert.strictEqual(await verifyPassword(hash, 'a reasonably long passphrase'), true);
});

void test('rejects an incorrect password', async () => {
  const hash = await hashPassword('a reasonably long passphrase');
  assert.strictEqual(await verifyPassword(hash, 'the wrong passphrase'), false);
});

void test('produces a different hash each time (random salt)', async () => {
  const first = await hashPassword('same input password');
  const second = await hashPassword('same input password');
  assert.notStrictEqual(first, second);
});
