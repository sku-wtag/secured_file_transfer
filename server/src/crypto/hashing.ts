import { createHash, createHmac, timingSafeEqual } from 'node:crypto';

import { base64UrlEncode } from './random.js';

export function sha256Hex(data: Uint8Array): string {
  return createHash('sha256').update(data).digest('hex');
}

export function hmacSha256(key: Buffer, data: string): Buffer {
  return createHmac('sha256', key).update(data, 'utf8').digest();
}

export function constantTimeEqual(a: string, b: string): boolean {
  const bufferA = Buffer.from(a, 'utf8');
  const bufferB = Buffer.from(b, 'utf8');
  if (bufferA.length !== bufferB.length) return false;
  return timingSafeEqual(bufferA, bufferB);
}

export function truncateIpv4(ip: string): string {
  const octets = ip.split('.');
  if (octets.length !== 4) return truncateIpv6(ip);
  return `${octets[0]}.${octets[1]}.${octets[2]}.0`;
}

function truncateIpv6(ip: string): string {
  const groups = ip.split(':').filter((group) => group.length > 0);
  return `${groups.slice(0, 3).join(':')}::`;
}

export function truncateIp(ip: string): string {
  return ip.includes(':') ? truncateIpv6(ip) : truncateIpv4(ip);
}

export function decodeBase64Key(value: string, expectedByteLength: number): Buffer {
  const decoded = Buffer.from(value, 'base64');
  if (decoded.length !== expectedByteLength) {
    throw new Error(
      `Expected a ${String(expectedByteLength)}-byte key, got ${String(decoded.length)}`,
    );
  }
  return decoded;
}

export { base64UrlEncode };
