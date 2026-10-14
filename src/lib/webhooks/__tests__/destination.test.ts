// @vitest-environment node
import { beforeEach, describe, expect, it, vi } from 'vitest';

const dns = vi.hoisted(() => ({ resolve4: vi.fn(), resolve6: vi.fn(), cancel: vi.fn() }));
vi.mock('node:dns/promises', () => ({
  Resolver: class {
    resolve4 = dns.resolve4;
    resolve6 = dns.resolve6;
    cancel = dns.cancel;
  },
}));

import {
  canonicalizeWebhookUrl,
  isPublicWebhookAddress,
  resolveWebhookDestination,
} from '../destination';

beforeEach(() => {
  dns.resolve4.mockResolvedValue(['8.8.8.8']);
  dns.resolve6.mockResolvedValue(['2606:4700:4700::1111']);
});

describe('IANA special-purpose destination policy', () => {
  it.each(['8.8.8.8', '1.1.1.1', '93.184.216.34', '2606:4700:4700::1111', '2001:4860:4860::8888'])(
    'accepts ordinary public %s',
    (address) => {
      expect(isPublicWebhookAddress(address)).toBe(true);
    },
  );
  it.each([
    '0.0.0.0',
    '10.0.0.1',
    '100.64.0.1',
    '127.0.0.1',
    '169.254.169.254',
    '172.16.0.1',
    '192.0.0.9',
    '192.0.2.1',
    '192.31.196.1',
    '192.52.193.1',
    '192.88.99.1',
    '192.168.0.1',
    '192.175.48.1',
    '198.18.0.1',
    '198.51.100.1',
    '203.0.113.1',
    '224.0.0.1',
    '240.0.0.1',
    '255.255.255.255',
    '::',
    '::1',
    '::ffff:8.8.8.8',
    '::ffff:808:808',
    '64:ff9b::808:808',
    '64:ff9b:1::1',
    '100::1',
    '100:0:0:1::1',
    '2001::1',
    '2001:1::1',
    '2001:db8::1',
    '2002:808:808::1',
    '2620:4f:8000::1',
    '3fff::1',
    '5f00::1',
    'fc00::1',
    'fe80::1',
    'ff02::1',
    'fe80::1%lo',
    '127.1',
    '0177.0.0.1',
    '0x7f000001',
    '2130706433',
    'not-an-ip',
  ])('blocks special, translated or malformed %s', (address) => {
    expect(isPublicWebhookAddress(address)).toBe(false);
  });
  it.each([
    ['100.63.255.255', true],
    ['100.127.255.255', false],
    ['100.128.0.0', true],
    ['172.15.255.255', true],
    ['172.31.255.255', false],
    ['172.32.0.0', true],
    ['198.17.255.255', true],
    ['198.19.255.255', false],
    ['198.20.0.0', true],
    ['3ffe:ffff::1', true],
    ['3fff:fff::1', false],
    ['3fff:1000::1', true],
  ] as const)('uses exact CIDR boundaries %s', (address, expected) => {
    expect(isPublicWebhookAddress(address)).toBe(expected);
  });
});

describe('canonical URL boundary', () => {
  it('normalizes DNS casing, trailing dot and default port without touching path bytes', () => {
    expect(canonicalizeWebhookUrl('https://EXAMPLE.COM.:443/a%2Fb?q=%2B').href).toBe(
      'https://example.com/a%2Fb?q=%2B',
    );
  });
  it.each([
    'http://example.com',
    'https://user:pass@example.com',
    'https://example.com@127.0.0.1',
    'https://[2606:4700::1111]',
    'https://localhost',
    'https://a.localhost',
    'https://a.local',
    'https://a.internal',
    'https://127.0.0.1',
    'https://127.1',
    'https://0177.0.0.1',
    'https://0x08080808',
    'https://134744072',
    'https://example.com:0',
    'https://example.com:65536',
    'https://example.com\\@evil.com',
    ' https://example.com',
    'https://example.com\n',
    'https://example..com',
    'https://example.com..',
    'https://%65xample.com',
    'https://example.com/#fragment',
  ])('rejects invalid or bypass URL %s', (value) => {
    expect(() => canonicalizeWebhookUrl(value)).toThrow();
  });
});

describe('A plus AAAA validation', () => {
  it('returns an immutable destination only after validating both families', async () => {
    const result = await resolveWebhookDestination(
      new URL('https://example.com:8443/hook'),
      new AbortController().signal,
    );
    expect(result).toEqual({ hostname: 'example.com', port: 8443, address: '8.8.8.8', family: 4 });
    expect(Object.isFrozen(result)).toBe(true);
    expect(dns.resolve4).toHaveBeenCalledWith('example.com');
    expect(dns.resolve6).toHaveBeenCalledWith('example.com');
  });
  it('rejects a mixed private AAAA even when A is public', async () => {
    dns.resolve6.mockResolvedValue(['::1']);
    await expect(
      resolveWebhookDestination(new URL('https://example.com'), new AbortController().signal),
    ).rejects.toMatchObject({ code: 'unsafe_destination' });
  });
  it('allows ENODATA for one family only when the other is public', async () => {
    dns.resolve4.mockRejectedValue(
      Object.assign(new Error('controlled DNS failure'), { code: 'ENODATA' }),
    );
    await expect(
      resolveWebhookDestination(new URL('https://example.com'), new AbortController().signal),
    ).resolves.toMatchObject({ family: 6 });
  });
  it.each(['ENOTFOUND', 'ESERVFAIL', 'ECONNREFUSED', 'ETIMEOUT'])(
    'fails closed on %s despite a public other family',
    async (code) => {
      dns.resolve6.mockRejectedValue(Object.assign(new Error('controlled DNS failure'), { code }));
      await expect(
        resolveWebhookDestination(new URL('https://example.com'), new AbortController().signal),
      ).rejects.toMatchObject({ code: code === 'ETIMEOUT' ? 'dns_timeout' : 'dns_failed' });
    },
  );
  it('rejects an empty total answer', async () => {
    dns.resolve4.mockResolvedValue([]);
    dns.resolve6.mockResolvedValue([]);
    await expect(
      resolveWebhookDestination(new URL('https://example.com'), new AbortController().signal),
    ).rejects.toMatchObject({ code: 'dns_failed' });
  });
  it('cancels in-flight Resolver operations on abort', async () => {
    dns.resolve4.mockImplementation(() => new Promise(() => {}));
    dns.resolve6.mockImplementation(() => new Promise(() => {}));
    const controller = new AbortController();
    const result = resolveWebhookDestination(new URL('https://example.com'), controller.signal);
    controller.abort();
    await expect(result).rejects.toMatchObject({ code: 'dns_timeout' });
    expect(dns.cancel).toHaveBeenCalled();
  });
});
