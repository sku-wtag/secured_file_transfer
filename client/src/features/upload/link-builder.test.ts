import { describe, expect, it } from 'vitest';

import { buildShareLink } from './link-builder.ts';

describe('buildShareLink', () => {
  it('embeds the transfer id in the path and the secret in the hash', () => {
    const secret = new Uint8Array([1, 2, 3, 4]);
    const link = buildShareLink('transfer-abc', secret);

    expect(link).toMatch(/^http:\/\/localhost:3000\/d\/transfer-abc#k=/);
  });

  it('omits the secret from the path portion of the link', () => {
    const secret = new Uint8Array([255, 0, 128]);
    const link = buildShareLink('transfer-xyz', secret);
    const [path] = link.split('#');

    expect(path).toBe('http://localhost:3000/d/transfer-xyz');
  });
});
