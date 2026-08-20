import assert from 'node:assert/strict';
import { mkdtemp, readdir, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, test } from 'node:test';

import { generateId } from '../crypto/random.js';
import { createLocalBlobStore } from './local-blob-store.js';

let root: string;

before(async () => {
  root = await mkdtemp(path.join(tmpdir(), 'blob-store-test-'));
});

after(async () => {
  await rm(root, { recursive: true, force: true });
});

void test('round-trips a written chunk', async () => {
  const store = createLocalBlobStore(root);
  const transferId = generateId();
  await store.write(transferId, 0, Buffer.from('hello'));
  assert.deepStrictEqual(await store.read(transferId, 0), Buffer.from('hello'));
});

void test('refuses to overwrite an already-written chunk', async () => {
  const store = createLocalBlobStore(root);
  const transferId = generateId();
  await store.write(transferId, 0, Buffer.from('first'));
  await assert.rejects(() => store.write(transferId, 0, Buffer.from('second')));
});

void test('deleteTransfer removes every chunk and the directory itself', async () => {
  const store = createLocalBlobStore(root);
  const transferId = generateId();
  await store.write(transferId, 0, Buffer.from('a'));
  await store.write(transferId, 1, Buffer.from('b'));
  await store.deleteTransfer(transferId);
  await assert.rejects(() => store.read(transferId, 0));
  assert.ok(!(await readdir(root)).includes(transferId));
});

void test('rejects a transfer id containing path traversal', async () => {
  const store = createLocalBlobStore(root);
  await assert.rejects(() => store.write('../../etc', 0, Buffer.from('x')));
});

void test('rejects a negative chunk index', async () => {
  const store = createLocalBlobStore(root);
  await assert.rejects(() => store.write(generateId(), -1, Buffer.from('x')));
});
