export const SFT1_VERSION = 1;
export const CHUNK_SIZE_BYTES = 4 * 1024 * 1024;
export const NONCE_PREFIX_BYTES = 8;
export const GCM_TAG_BYTES = 16;
export const KEY_BYTES = 32;
export const WRAP_NONCE_BYTES = 12;
const MANIFEST_INDEX_MARKER = 0xffffffff;

const textEncoder = new TextEncoder();
const textDecoder = new TextDecoder();

export function utf8Bytes(value: string): Uint8Array {
  return textEncoder.encode(value);
}

export function utf8Decode(bytes: Uint8Array): string {
  return textDecoder.decode(bytes);
}

export function concatBytes(...parts: Uint8Array[]): Uint8Array {
  const total = parts.reduce((sum, part) => sum + part.length, 0);
  const result = new Uint8Array(total);
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}

function u32be(value: number): Uint8Array {
  const bytes = new Uint8Array(4);
  new DataView(bytes.buffer).setUint32(0, value, false);
  return bytes;
}

export function base64UrlEncode(bytes: Uint8Array): string {
  let binary = '';
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary).replaceAll('+', '-').replaceAll('/', '_').replaceAll('=', '');
}

export function base64UrlDecode(value: string): Uint8Array {
  const padded = value.replaceAll('-', '+').replaceAll('_', '/');
  const binary = atob(padded);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return bytes;
}

export function chunkNonce(noncePrefix: Uint8Array, chunkIndex: number): Uint8Array {
  return concatBytes(noncePrefix, u32be(chunkIndex));
}

export function manifestNonce(noncePrefix: Uint8Array): Uint8Array {
  return concatBytes(noncePrefix, u32be(MANIFEST_INDEX_MARKER));
}

export function chunkAad(transferId: string, chunkIndex: number, chunkCount: number): Uint8Array {
  return concatBytes(
    utf8Bytes('SFT1|chunk|'),
    utf8Bytes(transferId),
    utf8Bytes('|'),
    u32be(chunkIndex),
    utf8Bytes('|'),
    u32be(chunkCount),
  );
}

export function manifestAad(transferId: string, chunkCount: number): Uint8Array {
  return concatBytes(utf8Bytes('SFT1|manifest|'), utf8Bytes(transferId), utf8Bytes('|'), u32be(chunkCount));
}

export function wrapAad(transferId: string): Uint8Array {
  return utf8Bytes(`SFT1|wrap|${transferId}`);
}

export function expectedChunkCount(size: number, chunkSize: number): number {
  return Math.ceil(size / chunkSize);
}
