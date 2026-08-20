import { randomBytes } from 'node:crypto';

export function base64UrlEncode(bytes: Uint8Array): string {
  return Buffer.from(bytes).toString('base64url');
}

export function base64UrlDecode(value: string): Buffer {
  return Buffer.from(value, 'base64url');
}

export function generateId(byteLength = 16): string {
  return base64UrlEncode(randomBytes(byteLength));
}

export function generateToken(byteLength = 32): string {
  return base64UrlEncode(randomBytes(byteLength));
}

const idPattern = /^[A-Za-z0-9_-]{10,64}$/;

export function isValidGeneratedId(value: string): boolean {
  return idPattern.test(value);
}
