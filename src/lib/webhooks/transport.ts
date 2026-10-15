import 'server-only';

import { Agent, request } from 'node:https';
import { isIP } from 'node:net';
import type { ClientRequest, IncomingMessage } from 'node:http';
import type { LookupFunction } from 'node:net';

import {
  canonicalizeWebhookUrl,
  resolveWebhookDestination,
  WebhookDestinationError,
} from './destination';
import type { ValidatedDestination, WebhookErrorCode } from './destination';

export type DeliveryOutcome =
  | { kind: 'success'; statusCode: number }
  | { kind: 'retryable'; code: WebhookErrorCode; statusCode?: number }
  | { kind: 'rejected'; code: WebhookErrorCode; statusCode?: number };

const ATTEMPT_TIMEOUT_MS = 5000;
const MAX_RESPONSE_BYTES = 64 * 1024;
const MAX_RESPONSE_HEADER_BYTES = 16 * 1024;
const HEADER_NAMES = new Set([
  'content-type',
  'x-iroko-event',
  'x-iroko-delivery-id',
  'x-iroko-timestamp',
  'x-iroko-signature',
]);

function safeHeaders(
  headers: Readonly<Record<string, string>>,
  body: Buffer,
): Record<string, string | number> {
  const normalized: Record<string, string | number> = {};
  for (const [name, value] of Object.entries(headers)) {
    const lower = name.toLowerCase();
    if (
      !HEADER_NAMES.has(lower) ||
      lower in normalized ||
      typeof value !== 'string' ||
      /[^\x20-\x7e]/.test(value) ||
      value.length > 256
    ) {
      throw new WebhookDestinationError('invalid_url');
    }
    normalized[lower] = value;
  }
  if (
    Object.keys(normalized).length !== HEADER_NAMES.size ||
    normalized['content-type'] !== 'application/json' ||
    !/^sha256=[0-9a-f]{64}$/.test(String(normalized['x-iroko-signature'])) ||
    !/^[0-9]{1,12}$/.test(String(normalized['x-iroko-timestamp']))
  ) {
    throw new WebhookDestinationError('invalid_url');
  }
  normalized['content-length'] = body.length;
  return normalized;
}

function failure(error: unknown): DeliveryOutcome {
  if (error instanceof WebhookDestinationError) {
    return {
      kind:
        (
          [
            'dns_failed',
            'dns_timeout',
            'request_timeout',
            'network_failed',
            'worker_failed',
          ].includes(error.code)
        ) ?
          'retryable'
        : 'rejected',
      code: error.code,
    };
  }
  const code =
    (
      typeof error === 'object' &&
      error !== null &&
      'code' in error &&
      typeof error.code === 'string'
    ) ?
      error.code
    : '';
  if (
    /^(ERR_TLS_|ERR_SSL_|CERT_|DEPTH_|SELF_SIGNED_|UNABLE_TO_VERIFY|UNABLE_TO_GET_ISSUER)/.test(
      code,
    ) ||
    code === 'EPROTO'
  ) {
    return { kind: 'rejected', code: 'tls_failed' };
  }
  return { kind: 'retryable', code: 'network_failed' };
}

function httpOutcome(statusCode: number): DeliveryOutcome {
  if (statusCode >= 200 && statusCode < 300) return { kind: 'success', statusCode };
  if (statusCode >= 300 && statusCode < 400)
    return { kind: 'rejected', code: 'redirect_denied', statusCode };
  return {
    kind: statusCode >= 500 || [408, 425, 429].includes(statusCode) ? 'retryable' : 'rejected',
    code: 'http_failed',
    statusCode,
  };
}

function transmit(
  url: URL,
  destination: ValidatedDestination,
  body: Buffer,
  headers: Record<string, string | number>,
  signal: AbortSignal,
): Promise<DeliveryOutcome> {
  // A fresh agent owns only this attempt. No globalAgent, implicit proxy options,
  // pooled sockets or cached TLS sessions may bypass the newly validated IP.
  const agent = new Agent({ keepAlive: false, maxSockets: 1, maxCachedSessions: 0 });
  const lookup: LookupFunction = (_hostname, options, callback) => {
    if (options.all) callback(null, [{ address: destination.address, family: destination.family }]);
    else callback(null, destination.address, destination.family);
  };
  return new Promise((resolve) => {
    let outgoing: ClientRequest | undefined;
    let incoming: IncomingMessage | undefined;
    let settled = false;
    const settle = (outcome: DeliveryOutcome) => {
      if (settled) return;
      settled = true;
      signal.removeEventListener('abort', abort);
      incoming?.destroy();
      outgoing?.destroy();
      agent.destroy();
      resolve(outcome);
    };
    const abort = () => settle({ kind: 'retryable', code: 'request_timeout' });
    if (signal.aborted) {
      abort();
      return;
    }
    signal.addEventListener('abort', abort, { once: true });
    try {
      outgoing = request(
        {
          protocol: 'https:',
          hostname: destination.hostname,
          port: destination.port,
          servername: isIP(destination.hostname) === 0 ? destination.hostname : undefined,
          path: `${url.pathname}${url.search}`,
          method: 'POST',
          headers,
          lookup,
          agent,
          rejectUnauthorized: true,
          ...({ autoSelectFamily: false } satisfies { autoSelectFamily: boolean }),
          maxHeaderSize: MAX_RESPONSE_HEADER_BYTES,
        },
        (response) => {
          incoming = response;
          const statusCode = response.statusCode;
          if (statusCode === undefined) {
            settle({ kind: 'retryable', code: 'network_failed' });
            return;
          }
          if (statusCode >= 300 && statusCode < 400) {
            settle(httpOutcome(statusCode));
            return;
          }
          let bytes = 0;
          response.on('data', (chunk: Buffer) => {
            bytes += chunk.length;
            if (bytes > MAX_RESPONSE_BYTES)
              settle({ kind: 'rejected', code: 'response_too_large' });
          });
          response.on('error', (error: Error) => settle(failure(error)));
          response.on('aborted', () => settle({ kind: 'retryable', code: 'network_failed' }));
          response.on('end', () => settle(httpOutcome(statusCode)));
        },
      );
      outgoing.on('error', (error: Error) => settle(failure(error)));
      outgoing.end(body);
    } catch (error) {
      settle(failure(error));
    }
  });
}

/** Resolve, classify and pin every attempt; send signed UTF-8 bytes unchanged. */
export async function sendWebhookRequest(input: {
  url: string;
  bodyText: string;
  headers: Readonly<Record<string, string>>;
  signal: AbortSignal;
}): Promise<DeliveryOutcome> {
  const deadline = new AbortController();
  const timer = setTimeout(() => deadline.abort(), ATTEMPT_TIMEOUT_MS);
  const signal = AbortSignal.any([input.signal, deadline.signal]);
  try {
    if (signal.aborted) return { kind: 'retryable', code: 'request_timeout' };
    const url = canonicalizeWebhookUrl(input.url);
    const body = Buffer.from(input.bodyText, 'utf8');
    const headers = safeHeaders(input.headers, body);
    const destination = await resolveWebhookDestination(url, signal);
    return await transmit(url, destination, body, headers, signal);
  } catch (error) {
    if (signal.aborted) return { kind: 'retryable', code: 'request_timeout' };
    return failure(error);
  } finally {
    clearTimeout(timer);
  }
}
