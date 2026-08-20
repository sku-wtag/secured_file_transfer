import { base64UrlEncode } from 'shared';

export function buildShareLink(transferId: string, linkSecret: Uint8Array): string {
  const secret = base64UrlEncode(linkSecret);
  return `${window.location.origin}/d/${transferId}#k=${secret}`;
}
