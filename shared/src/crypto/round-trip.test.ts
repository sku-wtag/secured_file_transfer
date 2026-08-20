import assert from 'node:assert/strict';
import test from 'node:test';

import { CHUNK_SIZE_BYTES } from '../wire-format.js';
import { decryptFile } from './decrypt-file.js';
import type { EncryptedFile } from './encrypt-file.js';
import { encryptFile } from './encrypt-file.js';
import { generateFileKey } from './keys.js';

const TRANSFER_ID = 'transfer-abc123';
const SMALL_CHUNK_SIZE = 16;

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length));
}

async function roundTrip(plaintext: Uint8Array, chunkSize = SMALL_CHUNK_SIZE) {
  const fek = generateFileKey();
  const encrypted = await encryptFile(plaintext, fek, {
    transferId: TRANSFER_ID,
    name: 'report.pdf',
    type: 'application/pdf',
    chunkSize,
  });
  const decrypted = await decryptFile(encrypted, fek, TRANSFER_ID, encrypted.chunks.length);
  return { fek, encrypted, decrypted };
}

void test('round-trips an empty file', async () => {
  const { encrypted, decrypted } = await roundTrip(new Uint8Array(0));
  assert.strictEqual(encrypted.chunks.length, 0);
  assert.strictEqual(decrypted.plaintext.length, 0);
  assert.strictEqual(decrypted.manifest.size, 0);
});

void test('round-trips a file smaller than one chunk', async () => {
  const plaintext = randomBytes(SMALL_CHUNK_SIZE - 3);
  const { encrypted, decrypted } = await roundTrip(plaintext);
  assert.strictEqual(encrypted.chunks.length, 1);
  assert.deepStrictEqual(decrypted.plaintext, plaintext);
});

void test('round-trips a file that is an exact multiple of the chunk size', async () => {
  const plaintext = randomBytes(SMALL_CHUNK_SIZE * 3);
  const { encrypted, decrypted } = await roundTrip(plaintext);
  assert.strictEqual(encrypted.chunks.length, 3);
  assert.deepStrictEqual(decrypted.plaintext, plaintext);
});

void test('round-trips a multi-chunk file with a short final chunk', async () => {
  const plaintext = randomBytes(SMALL_CHUNK_SIZE * 4 + 5);
  const { encrypted, decrypted } = await roundTrip(plaintext);
  assert.strictEqual(encrypted.chunks.length, 5);
  assert.deepStrictEqual(decrypted.plaintext, plaintext);
  assert.strictEqual(decrypted.manifest.name, 'report.pdf');
  assert.strictEqual(decrypted.manifest.type, 'application/pdf');
});

void test('uses the default 4 MiB chunk size when none is given', async () => {
  const fek = generateFileKey();
  const plaintext = randomBytes(10);
  const encrypted = await encryptFile(plaintext, fek, {
    transferId: TRANSFER_ID,
    name: 'x',
    type: 'text/plain',
  });
  assert.strictEqual(encrypted.chunks.length, 1);
  const { manifest } = await decryptFile(encrypted, fek, TRANSFER_ID, 1);
  assert.strictEqual(manifest.chunkSize, CHUNK_SIZE_BYTES);
});

async function expectDecryptFailure(
  mutate: (encrypted: EncryptedFile) => EncryptedFile,
  options: { fek?: Uint8Array; transferId?: string; chunkCount?: number } = {},
): Promise<void> {
  const fek = generateFileKey();
  const plaintext = randomBytes(SMALL_CHUNK_SIZE * 3 + 4);
  const encrypted = await encryptFile(plaintext, fek, {
    transferId: TRANSFER_ID,
    name: 'x',
    type: 'text/plain',
    chunkSize: SMALL_CHUNK_SIZE,
  });
  const authoritativeChunkCount = encrypted.chunks.length;
  const tampered = mutate(structuredClone(encrypted));
  await assert.rejects(() =>
    decryptFile(
      tampered,
      options.fek ?? fek,
      options.transferId ?? TRANSFER_ID,
      options.chunkCount ?? authoritativeChunkCount,
    ),
  );
}

void test('fails closed on a flipped ciphertext bit', async () => {
  await expectDecryptFailure((encrypted) => {
    const firstChunk = encrypted.chunks[0];
    assert.ok(firstChunk);
    firstChunk[0] = (firstChunk[0] ?? 0) ^ 0xff;
    return encrypted;
  });
});

void test('fails closed on a flipped auth tag', async () => {
  await expectDecryptFailure((encrypted) => {
    const chunk = encrypted.chunks[0];
    assert.ok(chunk);
    chunk[chunk.length - 1] = (chunk[chunk.length - 1] ?? 0) ^ 0xff;
    return encrypted;
  });
});

void test('fails closed when two chunks are swapped', async () => {
  await expectDecryptFailure((encrypted) => {
    const [first, second] = encrypted.chunks;
    assert.ok(first);
    assert.ok(second);
    encrypted.chunks[0] = second;
    encrypted.chunks[1] = first;
    return encrypted;
  });
});

void test('fails closed when a chunk is duplicated over another', async () => {
  await expectDecryptFailure((encrypted) => {
    const firstChunk = encrypted.chunks[0];
    assert.ok(firstChunk);
    encrypted.chunks[1] = structuredClone(firstChunk);
    return encrypted;
  });
});

void test('fails closed when the final chunk is dropped', async () => {
  await expectDecryptFailure((encrypted) => {
    encrypted.chunks.pop();
    return encrypted;
  }, {});
});

void test('fails closed with the wrong transfer id', async () => {
  await expectDecryptFailure((encrypted) => encrypted, { transferId: 'a-different-transfer' });
});

void test('fails closed with the wrong file key', async () => {
  await expectDecryptFailure((encrypted) => encrypted, { fek: generateFileKey() });
});
