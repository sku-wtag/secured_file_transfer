import assert from 'node:assert/strict';
import test from 'node:test';

import { emailLookupHash, normalizeEmail } from './email-lookup.js';

void test('normalizes case and surrounding whitespace', () => {
  assert.strictEqual(normalizeEmail('  Person@Example.COM  '), 'person@example.com');
});

void test('produces the same lookup hash regardless of case or whitespace', () => {
  assert.strictEqual(
    emailLookupHash('Person@Example.com'),
    emailLookupHash(' person@example.com '),
  );
});

void test('produces different lookup hashes for different addresses', () => {
  assert.notStrictEqual(emailLookupHash('a@example.com'), emailLookupHash('b@example.com'));
});
