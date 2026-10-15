// @vitest-environment node
import assert from 'node:assert/strict';
import dgram from 'node:dgram';
import { createHash, createHmac } from 'node:crypto';
import { once } from 'node:events';
import { mkdir, writeFile } from 'node:fs/promises';
import https from 'node:https';
import { Resolver } from 'node:dns/promises';
import type * as DnsModule from 'node:dns/promises';
import type * as HttpsModule from 'node:https';
import type { RequestOptions } from 'node:https';
import type { IncomingMessage } from 'node:http';
import type { LookupFunction } from 'node:net';
import { TLSSocket } from 'node:tls';
import { afterAll, beforeAll, beforeEach, expect, it, vi } from 'vitest';

const boundary = vi.hoisted(() => ({ dnsServer: '', ca: '', pins: [] as string[] }));
vi.mock('node:dns/promises', async (importOriginal) => {
  const original = await importOriginal<typeof DnsModule>();
  return {
    ...original,
    Resolver: class extends original.Resolver {
      constructor(options?: ConstructorParameters<typeof original.Resolver>[0]) {
        super(options);
        this.setServers([boundary.dnsServer]);
      }
    },
  };
});
vi.mock('node:https', async (importOriginal) => {
  const original = await importOriginal<typeof HttpsModule>();
  return {
    ...original,
    request: (options: RequestOptions, callback?: (response: IncomingMessage) => void) => {
      const pinned = options.lookup;
      const lookup: LookupFunction = (hostname, lookupOptions, done) => {
        assert.ok(pinned, 'production transport must supply pinned lookup');
        pinned(hostname, lookupOptions, (error, address, family) => {
          if (error) {
            done(error, '');
            return;
          }
          // TEST ONLY post-classification network mapping. No classifier/resolver
          // replacement: real UDP DNS returns real public/private addresses.
          const map = (value: string) => {
            boundary.pins.push(value);
            if (value !== '8.8.8.8') throw new Error('unexpected production-pinned address');
            return '127.0.0.1';
          };
          if (Array.isArray(address))
            done(
              null,
              address.map((answer) => ({ address: map(answer.address), family: 4 })),
            );
          else done(null, map(address), family);
        });
      };
      return original.request({ ...options, ca: boundary.ca, lookup }, callback);
    },
  };
});

import { canonicalizeWebhookUrl, resolveWebhookDestination } from '../destination';
import { sendWebhookRequest } from '../transport';
import { createTestCertificates } from './test-certificates';

type Mode = 'public' | 'private' | 'mixed' | 'rebind' | 'empty' | 'error' | 'drop';
let mode: Mode = 'public';
let aQueries = 0;
let totalQueries = 0;
let forbiddenConnections = 0;
let forbiddenRequests = 0;
let port = 0;
const receipts: Array<{ bytes: Buffer; sni: string | false; hmac: boolean }> = [];
const dnsServer = dgram.createSocket('udp4');
const tlsServers: https.Server[] = [];
let badPort = 0;
const secret = 'whsec_generated_test_contract';
const bodyText =
  '{"id":"123e4567-e89b-42d3-a456-426614174000","type":"account.updated","data":{"name":"árbol 🌳"}}';
const headers = {
  'Content-Type': 'application/json',
  'X-Iroko-Event': 'account.updated',
  'X-Iroko-Delivery-Id': '123e4567-e89b-42d3-a456-426614174000',
  'X-Iroko-Timestamp': '1791554400',
  'X-Iroko-Signature': `sha256=${createHmac('sha256', secret).update(`1791554400.${bodyText}`).digest('hex')}`,
};
const observations: Array<Record<string, unknown>> = [];

dnsServer.on('message', (packet, remote) => {
  let end = 12;
  while (packet[end] !== 0) end += 1 + (packet[end] ?? 0);
  end++;
  const type = packet.readUInt16BE(end);
  end += 4;
  totalQueries++;
  if (mode === 'drop') return;
  let addresses: string[] = [];
  if (type === 1) {
    aQueries++;
    if (mode !== 'empty' && mode !== 'error')
      addresses = [
        mode === 'private' || (mode === 'rebind' && aQueries > 1) ? '127.0.0.2' : '8.8.8.8',
      ];
  }
  if (type === 28 && mode === 'mixed') addresses = ['::1'];
  const header = Buffer.alloc(12);
  header.writeUInt16BE(packet.readUInt16BE(0));
  header.writeUInt16BE(mode === 'error' ? 0x8583 : 0x8580, 2);
  header.writeUInt16BE(1, 4);
  header.writeUInt16BE(addresses.length, 6);
  const records = addresses.map((address) => {
    const data =
      type === 1 ?
        Buffer.from(address.split('.').map(Number))
      : Buffer.from('00000000000000000000000000000001', 'hex');
    const record = Buffer.alloc(12);
    record.writeUInt16BE(0xc00c);
    record.writeUInt16BE(type, 2);
    record.writeUInt16BE(1, 4);
    record.writeUInt16BE(data.length, 10);
    return Buffer.concat([record, data]);
  });
  dnsServer.send(
    Buffer.concat([header, packet.subarray(12, end), ...records]),
    remote.port,
    remote.address,
  );
});

beforeAll(async () => {
  const certificates = createTestCertificates();
  boundary.ca = certificates.ca;
  dnsServer.bind(0, '127.0.0.1');
  await once(dnsServer, 'listening');
  boundary.dnsServer = `127.0.0.1:${dnsServer.address().port}`;
  const allowed = https.createServer(
    { key: certificates.key, cert: certificates.cert },
    (request, response) => {
      const chunks: Buffer[] = [];
      request.on('data', (chunk: Buffer) => chunks.push(chunk));
      request.on('end', () => {
        const bytes = Buffer.concat(chunks);
        receipts.push({
          bytes,
          sni: request.socket instanceof TLSSocket ? (request.socket.servername ?? false) : false,
          hmac:
            request.headers['x-iroko-signature'] ===
            `sha256=${createHmac('sha256', secret).update(`${request.headers['x-iroko-timestamp']}.`).update(bytes).digest('hex')}`,
        });
        if (request.url?.startsWith('/redirect/')) {
          response.writeHead(Number(request.url.split('/')[2]), {
            Location: `https://127.0.0.2:${port}/forbidden`,
          });
          response.end();
        } else if (request.url === '/large') response.end(Buffer.alloc(65537));
        else if (request.url !== '/hang') {
          response.writeHead(204);
          response.end();
        }
      });
    },
  );
  allowed.listen(0, '127.0.0.1');
  await once(allowed, 'listening');
  const address = allowed.address();
  assert.ok(address && typeof address !== 'string');
  port = address.port;
  const prohibited = https.createServer(
    { key: certificates.key, cert: certificates.cert },
    (request, response) => {
      forbiddenRequests++;
      request.resume();
      response.end();
    },
  );
  prohibited.on('connection', () => forbiddenConnections++);
  prohibited.listen(port, '127.0.0.2');
  await once(prohibited, 'listening');
  const wrong = https.createServer(
    { key: certificates.wrongKey, cert: certificates.wrongCert },
    (_request, response) => response.end(),
  );
  wrong.on('tlsClientError', () => {});
  wrong.listen(0, '127.0.0.1');
  await once(wrong, 'listening');
  const badAddress = wrong.address();
  assert.ok(badAddress && typeof badAddress !== 'string');
  badPort = badAddress.port;
  tlsServers.push(allowed, prohibited, wrong);
}, 15000);
beforeEach(() => {
  mode = 'public';
  aQueries = 0;
  totalQueries = 0;
  boundary.pins.length = 0;
});
afterAll(async () => {
  for (const server of tlsServers) {
    server.closeAllConnections();
    await new Promise<void>((resolve) => server.close(() => resolve()));
  }
  await new Promise<void>((resolve) => dnsServer.close(() => resolve()));
  await mkdir('.superpowers/012-2-ssrf', { recursive: true });
  await writeFile(
    '.superpowers/012-2-ssrf/production-transport-network-results.json',
    JSON.stringify(
      {
        node: process.version,
        observations,
        limits: [
          'TEST ONLY CA and socket mapping after production classification; real UDP DNS and production modules execute together',
          'No Cloud/hosting acceptance; ordinary public IP maps to loopback receptor; classifier never substituted',
        ],
        cleanup: 'DNS and HTTPS servers closed',
      },
      null,
      2,
    ),
  );
});
const send = (path = '/', signal = new AbortController().signal, requestPort = port) =>
  sendWebhookRequest({
    url: `https://delivery.test:${requestPort}${path}`,
    bodyText,
    headers,
    signal,
  });

it('observes vulnerable double-resolution comparator over real DNS and HTTPS', async () => {
  mode = 'rebind';
  const validated = await resolveWebhookDestination(
    canonicalizeWebhookUrl(`https://delivery.test:${port}`),
    new AbortController().signal,
  );
  expect(validated.address).toBe('8.8.8.8');
  const resolver = new Resolver();
  // Comparator intentionally re-resolves rather than using validated.address.
  const before = forbiddenConnections;
  await new Promise<void>((resolve, reject) => {
    const outgoing = https.get(
      {
        hostname: 'delivery.test',
        servername: 'delivery.test',
        port,
        ca: boundary.ca,
        agent: false,
        ...({ autoSelectFamily: false } satisfies { autoSelectFamily: boolean }),
        lookup: (_hostname, options, done) => {
          resolver
            .resolve4('delivery.test')
            .then(([address]) => {
              assert.ok(address);
              if (options.all) done(null, [{ address, family: 4 }]);
              else done(null, address, 4);
            })
            .catch((error: Error) => done(error, ''));
        },
      },
      (response) => {
        response.resume();
        response.on('end', resolve);
      },
    );
    outgoing.on('error', reject);
  });
  expect(forbiddenConnections - before).toBe(1);
  expect(aQueries).toBe(2);
  observations.push({
    case: 'vulnerable comparator',
    forbiddenConnectionDelta: 1,
    forbiddenRequests,
    aQueries,
  });
});
it('integrates DNS wire → production classifier → pinned HTTPS/TLS/HMAC without rebinding', async () => {
  mode = 'rebind';
  const before = forbiddenConnections;
  expect(await send()).toEqual({ kind: 'success', statusCode: 204 });
  expect(aQueries).toBe(1);
  expect(totalQueries).toBe(2);
  expect(boundary.pins).toEqual(['8.8.8.8']);
  expect(forbiddenConnections).toBe(before);
  const receipt = receipts.at(-1);
  expect(receipt?.bytes).toEqual(Buffer.from(bodyText));
  expect(receipt?.sni).toBe('delivery.test');
  expect(receipt?.hmac).toBe(true);
  observations.push({
    case: 'production integrated pinning',
    aQueries,
    totalQueries,
    pins: [...boundary.pins],
    forbiddenConnectionDelta: 0,
    hmac: true,
    bodySha256: createHash('sha256').update(bodyText).digest('hex'),
  });
});
it.each(['private', 'mixed', 'empty', 'error'] as const)(
  'fails closed on real DNS %s',
  async (value) => {
    mode = value;
    const before = forbiddenConnections;
    const result = await send();
    expect(result.kind).not.toBe('success');
    expect(boundary.pins).toEqual([]);
    expect(forbiddenConnections).toBe(before);
    observations.push({ case: `DNS ${value}`, result, forbiddenConnectionDelta: 0 });
  },
);
it.each([301, 302, 303, 307, 308])('does not follow actual HTTP %s', async (code) => {
  const before = forbiddenConnections;
  expect(await send(`/redirect/${code}`)).toEqual({
    kind: 'rejected',
    code: 'redirect_denied',
    statusCode: code,
  });
  expect(forbiddenConnections).toBe(before);
  observations.push({ case: `redirect ${code}`, forbiddenConnectionDelta: 0 });
});
it('rejects a trusted certificate for the wrong TLS hostname', async () => {
  expect(await send('/', new AbortController().signal, badPort)).toEqual({
    kind: 'rejected',
    code: 'tls_failed',
  });
  observations.push({ case: 'wrong TLS hostname', result: 'tls_failed' });
});
it('re-resolves changed DNS on retry and prevents the second connection', async () => {
  mode = 'rebind';
  expect(await send()).toEqual({ kind: 'success', statusCode: 204 });
  const before = forbiddenConnections;
  expect(await send()).toEqual({ kind: 'rejected', code: 'unsafe_destination' });
  expect(forbiddenConnections).toBe(before);
  observations.push({ case: 'retry changed DNS', aQueries, forbiddenConnectionDelta: 0 });
});
it('enforces actual response cap', async () => {
  expect(await send('/large')).toEqual({ kind: 'rejected', code: 'response_too_large' });
});
it('cancels a stalled HTTPS response', async () => {
  expect(await send('/hang', AbortSignal.timeout(100))).toEqual({
    kind: 'retryable',
    code: 'request_timeout',
  });
});
it('cancels dropped real DNS responses without making a socket', async () => {
  mode = 'drop';
  expect(await send('/', AbortSignal.timeout(100))).toEqual({
    kind: 'retryable',
    code: 'request_timeout',
  });
  expect(boundary.pins).toEqual([]);
});
