import assert from 'node:assert/strict';
import test from 'node:test';

import { decryptField, encryptField } from './field-encryption.js';

void test('round-trips a plaintext value', () => {
  const ciphertext = encryptField('shorojit@example.com');
  assert.strictEqual(decryptField(ciphertext), 'shorojit@example.com');
});

void test('produces a different ciphertext each time (random nonce)', () => {
  const first = encryptField('same value');
  const second = encryptField('same value');
  assert.notStrictEqual(first, second);
});

void test('rejects a ciphertext with a flipped bit', () => {
  const ciphertext = encryptField('tamper me');
  const bytes = Buffer.from(ciphertext, 'base64');
  const lastIndex = bytes.length - 1;
  bytes.writeUInt8(bytes.readUInt8(lastIndex) ^ 0xff, lastIndex);
  assert.throws(() => decryptField(bytes.toString('base64')));
});

void test('rejects a truncated ciphertext', () => {
  const ciphertext = encryptField('truncate me');
  const bytes = Buffer.from(ciphertext, 'base64');
  assert.throws(() => decryptField(bytes.subarray(0, bytes.length - 1).toString('base64')));
});
