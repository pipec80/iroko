import 'server-only';

import { Resolver } from 'node:dns/promises';
import { isIP } from 'node:net';

export type WebhookErrorCode =
  | 'dns_failed'
  | 'dns_timeout'
  | 'unsafe_destination'
  | 'invalid_url'
  | 'tls_failed'
  | 'redirect_denied'
  | 'response_too_large'
  | 'request_timeout'
  | 'network_failed'
  | 'http_failed'
  | 'worker_failed';

/** Safe error code only: never attach URLs, resolver messages or credentials. */
export class WebhookDestinationError extends Error {
  constructor(readonly code: WebhookErrorCode) {
    super(code);
    this.name = 'WebhookDestinationError';
  }
}

export type ValidatedDestination = Readonly<{
  hostname: string;
  port: number;
  address: string;
  family: 4 | 6;
}>;

const MAX_URL_LENGTH = 2000;
const DNS_TIMEOUT_MS = 5000;

function ipv4Value(address: string): bigint {
  return address.split('.').reduce((value, octet) => (value << 8n) | BigInt(octet), 0n);
}

function ipv6Value(address: string): bigint {
  const [left = '', right = ''] = address.split('::');
  const head = left === '' ? [] : left.split(':');
  const tail = right === '' ? [] : right.split(':');
  const groups =
    address.includes('::') ?
      [...head, ...Array<string>(8 - head.length - tail.length).fill('0'), ...tail]
    : head;
  return groups.reduce((value, group) => (value << 16n) | BigInt(`0x${group}`), 0n);
}

function inPrefix(value: bigint, base: bigint, prefix: number, bits: number): boolean {
  const shift = BigInt(bits - prefix);
  return value >> shift === base >> shift;
}

// Policy v1, verified 2026-10-09 against the IANA special-purpose registries:
// https://www.iana.org/assignments/iana-ipv4-special-registry/
// https://www.iana.org/assignments/iana-ipv6-special-registry/
// Conservative: reject every special-purpose entry, including globally reachable
// anycast exceptions. IPv6 permits only ordinary 2000::/3 global unicast.
const IPV4_BLOCKS: ReadonlyArray<readonly [string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.31.196.0', 24],
  ['192.52.193.0', 24],
  ['192.88.99.0', 24],
  ['192.168.0.0', 16],
  ['192.175.48.0', 24],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];
const IPV6_BLOCKS: ReadonlyArray<readonly [string, number]> = [
  ['2001::', 23],
  ['2001:db8::', 32],
  ['2002::', 16],
  ['2620:4f:8000::', 48],
  ['3fff::', 20],
];
const ipv4Blocks = IPV4_BLOCKS.map(([base, prefix]) => [ipv4Value(base), prefix] as const);
const ipv6Blocks = IPV6_BLOCKS.map(([base, prefix]) => [ipv6Value(base), prefix] as const);

/** Accept ordinary global addresses; deny special, translated and malformed IPs. */
export function isPublicWebhookAddress(address: string): boolean {
  const family = isIP(address);
  if (family === 4) {
    const value = ipv4Value(address);
    return !ipv4Blocks.some(([base, prefix]) => inPrefix(value, base, prefix, 32));
  }
  if (family !== 6 || address.includes('%') || address.includes('.')) return false;
  const value = ipv6Value(address);
  return (
    inPrefix(value, ipv6Value('2000::'), 3, 128) &&
    !ipv6Blocks.some(([base, prefix]) => inPrefix(value, base, prefix, 128))
  );
}

/** Canonical HTTPS URL shared by registration and delivery; no DNS side effects. */
export function canonicalizeWebhookUrl(value: string): URL {
  if (value.length > MAX_URL_LENGTH || /[\u0000-\u0020\u007f\\]/.test(value)) {
    throw new WebhookDestinationError('invalid_url');
  }
  const authority = /^https:\/\/([^/?#]+)/i.exec(value)?.[1];
  const parsedAuthority = authority && /^([A-Za-z0-9.-]+)(?::([0-9]{1,5}))?$/.exec(authority);
  if (!parsedAuthority?.[1]) throw new WebhookDestinationError('invalid_url');
  const rawHost = parsedAuthority[1].toLowerCase();
  const hostname = rawHost.endsWith('.') ? rawHost.slice(0, -1) : rawHost;
  const port = Number(parsedAuthority[2] ?? 443);
  if (
    port < 1 ||
    port > 65535 ||
    hostname.length > 253 ||
    !hostname.includes('.') ||
    hostname.split('.').some((label) => !/^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label)) ||
    /(^|\.)(localhost|local|internal)$/.test(hostname)
  ) {
    throw new WebhookDestinationError('invalid_url');
  }
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WebhookDestinationError('invalid_url');
  }
  // WHATWG URL canonicalizes octal, hex and shortened IPv4. Reject those inputs
  // before they can be mistaken for DNS names (including a trailing-dot form).
  if (
    url.protocol !== 'https:' ||
    url.username ||
    url.password ||
    url.hash ||
    url.hostname.toLowerCase().replace(/\.$/, '') !== hostname
  ) {
    throw new WebhookDestinationError('invalid_url');
  }
  if (/^[0-9.]+$/.test(hostname) && isIP(hostname) !== 4)
    throw new WebhookDestinationError('invalid_url');
  if (isIP(hostname) !== 0 && !isPublicWebhookAddress(hostname))
    throw new WebhookDestinationError('unsafe_destination');
  url.hostname = hostname;
  return url;
}

function dnsError(error: unknown): WebhookDestinationError {
  const code =
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined;
  return new WebhookDestinationError(code === 'ETIMEOUT' ? 'dns_timeout' : 'dns_failed');
}

/** Resolve all A/AAAA records per attempt, reject the entire mixed set, then pin one. */
export async function resolveWebhookDestination(
  url: URL,
  signal: AbortSignal,
): Promise<ValidatedDestination> {
  const canonical = canonicalizeWebhookUrl(url.href);
  if (signal.aborted) throw new WebhookDestinationError('dns_timeout');
  const hostname = canonical.hostname;
  const port = Number(canonical.port || 443);
  if (isIP(hostname) === 4) return Object.freeze({ hostname, port, address: hostname, family: 4 });
  const resolver = new Resolver({ timeout: DNS_TIMEOUT_MS, tries: 1 });
  let timer: ReturnType<typeof setTimeout> | undefined;
  let onAbort = () => {};
  const aborted = new Promise<never>((_, reject) => {
    onAbort = () => {
      resolver.cancel();
      reject(new WebhookDestinationError('dns_timeout'));
    };
    signal.addEventListener('abort', onAbort, { once: true });
    timer = setTimeout(onAbort, DNS_TIMEOUT_MS);
  });
  async function familyRecords(family: 4 | 6): Promise<ValidatedDestination[]> {
    try {
      const records = await (family === 4 ?
        resolver.resolve4(hostname)
      : resolver.resolve6(hostname));
      return records.map((address) => ({ hostname, port, address, family }));
    } catch (error) {
      if (
        typeof error === 'object' &&
        error !== null &&
        'code' in error &&
        error.code === 'ENODATA'
      )
        return [];
      throw dnsError(error);
    }
  }
  try {
    const answers = (
      await Promise.race([Promise.all([familyRecords(4), familyRecords(6)]), aborted])
    ).flat();
    if (!answers.length) throw new WebhookDestinationError('dns_failed');
    if (
      answers.some(
        (answer) =>
          isIP(answer.address) !== answer.family || !isPublicWebhookAddress(answer.address),
      )
    ) {
      throw new WebhookDestinationError('unsafe_destination');
    }
    const selected = answers[0];
    if (!selected) throw new WebhookDestinationError('dns_failed');
    return Object.freeze(selected);
  } finally {
    clearTimeout(timer);
    signal.removeEventListener('abort', onAbort);
    resolver.cancel();
  }
}
