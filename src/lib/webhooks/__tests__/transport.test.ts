// @vitest-environment node
import { EventEmitter } from 'node:events';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type * as DestinationModule from '../destination';

const mocks = vi.hoisted(() => ({ resolve: vi.fn(), request: vi.fn(), destroyAgent: vi.fn() }));
vi.mock('../destination', async (importOriginal) => ({
  ...(await importOriginal<typeof DestinationModule>()),
  resolveWebhookDestination: mocks.resolve,
}));
vi.mock('node:https', () => ({
  Agent: class {
    destroy = mocks.destroyAgent;
  },
  request: mocks.request,
}));
import { sendWebhookRequest } from '../transport';

const headers = {
  'Content-Type': 'application/json',
  'X-Iroko-Event': 'account.updated',
  'X-Iroko-Delivery-Id': '123e4567-e89b-42d3-a456-426614174000',
  'X-Iroko-Timestamp': '1791554400',
  'X-Iroko-Signature': `sha256=${'a'.repeat(64)}`,
};
let status = 204;
let chunks: Buffer[] = [];
let sentBody: Buffer | undefined;
beforeEach(() => {
  status = 204;
  chunks = [];
  sentBody = undefined;
  mocks.resolve.mockResolvedValue({
    hostname: 'example.com',
    port: 443,
    address: '8.8.8.8',
    family: 4,
  });
  mocks.request.mockImplementation((_options, callback) => {
    const request = Object.assign(new EventEmitter(), {
      destroy: vi.fn(),
      end: (body: Buffer) => {
        sentBody = body;
        queueMicrotask(() => {
          const response = Object.assign(new EventEmitter(), {
            statusCode: status,
            destroy: vi.fn(),
          });
          callback(response);
          for (const chunk of chunks) response.emit('data', chunk);
          response.emit('end');
        });
      },
    });
    return request;
  });
});
const input = () => ({
  url: 'https://example.com/hook',
  bodyText: '{"árbol":"🌳"}',
  headers,
  signal: new AbortController().signal,
});

describe('delivery transport contract', () => {
  it('sends exact UTF-8 bytes with a dedicated agent and original TLS identity', async () => {
    expect(await sendWebhookRequest(input())).toEqual({ kind: 'success', statusCode: 204 });
    expect(sentBody).toEqual(Buffer.from(input().bodyText));
    const options = mocks.request.mock.calls[0]?.[0];
    expect(options).toMatchObject({
      hostname: 'example.com',
      servername: 'example.com',
      rejectUnauthorized: true,
      method: 'POST',
      autoSelectFamily: false,
    });
    expect(options.headers['content-length']).toBe(Buffer.byteLength(input().bodyText));
    const lookup = vi.fn();
    options.lookup('example.com', { all: false }, lookup);
    expect(lookup).toHaveBeenCalledWith(null, '8.8.8.8', 4);
    expect(mocks.destroyAgent).toHaveBeenCalledOnce();
  });
  it.each([301, 302, 303, 307, 308])('rejects %s without another request', async (code) => {
    status = code;
    expect(await sendWebhookRequest(input())).toEqual({
      kind: 'rejected',
      code: 'redirect_denied',
      statusCode: code,
    });
    expect(mocks.request).toHaveBeenCalledOnce();
  });
  it.each([408, 425, 429, 500, 503])('retries HTTP %s', async (code) => {
    status = code;
    expect(await sendWebhookRequest(input())).toEqual({
      kind: 'retryable',
      code: 'http_failed',
      statusCode: code,
    });
  });
  it('rejects permanent HTTP failure', async () => {
    status = 400;
    expect(await sendWebhookRequest(input())).toEqual({
      kind: 'rejected',
      code: 'http_failed',
      statusCode: 400,
    });
  });
  it('caps response bytes including a final oversize chunk', async () => {
    chunks = [Buffer.alloc(65537)];
    expect(await sendWebhookRequest(input())).toEqual({
      kind: 'rejected',
      code: 'response_too_large',
    });
  });
  it.each(['Host', 'Authorization', 'Proxy-Authorization', 'Connection', 'X-Unexpected'])(
    'rejects injected %s before DNS',
    async (name) => {
      expect(
        await sendWebhookRequest({ ...input(), headers: { ...headers, [name]: 'evil' } }),
      ).toEqual({ kind: 'rejected', code: 'invalid_url' });
      expect(mocks.resolve).not.toHaveBeenCalled();
    },
  );
  it('rejects CRLF values before DNS', async () => {
    expect(
      await sendWebhookRequest({
        ...input(),
        headers: { ...headers, 'X-Iroko-Event': 'account.updated\r\nHost: evil' },
      }),
    ).toEqual({ kind: 'rejected', code: 'invalid_url' });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('rejects missing headers before DNS', async () => {
    expect(await sendWebhookRequest({ ...input(), headers: {} })).toEqual({
      kind: 'rejected',
      code: 'invalid_url',
    });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('enforces a global deadline while DNS is pending', async () => {
    vi.useFakeTimers();
    try {
      mocks.resolve.mockImplementation(
        (_url, signal: AbortSignal) =>
          new Promise((_, reject) =>
            signal.addEventListener('abort', () => reject(new Error('aborted')), { once: true }),
          ),
      );
      const pending = sendWebhookRequest(input());
      await vi.advanceTimersByTimeAsync(5000);
      expect(await pending).toEqual({ kind: 'retryable', code: 'request_timeout' });
      expect(mocks.request).not.toHaveBeenCalled();
    } finally {
      vi.useRealTimers();
    }
  });
  it('shares the five-second deadline between DNS and a stalled HTTPS request', async () => {
    vi.useFakeTimers();
    try {
      mocks.resolve.mockImplementation(
        () =>
          new Promise((resolve) =>
            setTimeout(
              () =>
                resolve({
                  hostname: 'example.com',
                  port: 443,
                  address: '8.8.8.8',
                  family: 4,
                }),
              4000,
            ),
          ),
      );
      const destroy = vi.fn();
      mocks.request.mockReturnValue(Object.assign(new EventEmitter(), { destroy, end: vi.fn() }));
      let completed = false;
      const pending = sendWebhookRequest(input()).then((outcome) => {
        completed = true;
        return outcome;
      });
      await vi.advanceTimersByTimeAsync(4999);
      expect(mocks.request).toHaveBeenCalledOnce();
      expect(completed).toBe(false);
      await vi.advanceTimersByTimeAsync(1);
      expect(await pending).toEqual({ kind: 'retryable', code: 'request_timeout' });
      expect(destroy).toHaveBeenCalledOnce();
      expect(mocks.destroyAgent).toHaveBeenCalledOnce();
    } finally {
      vi.useRealTimers();
    }
  });
});
