import { assertEquals } from 'jsr:@std/assert@1.0.14';

import type { Deps, EmailQueuePort, QueueMessage } from '../process-email-queue/handler.ts';
import { handleRequest } from '../process-email-queue/handler.ts';

const REQUIRED_ENV = {
  SUPABASE_DB_URL: 'postgres://test',
  RESEND_API_KEY: 'test-key',
  FROM_EMAIL: 'noreply@example.com',
  CRON_SECRET: 'test-cron-secret',
};

function makeMessage(overrides: Partial<QueueMessage> = {}): QueueMessage {
  return {
    msg_id: 1,
    read_ct: 0,
    enqueued_at: '2026-01-01T00:00:00Z',
    vt: '2026-01-01T00:01:00Z',
    message: { accountId: 'acc-1', email: 'to@example.com', subject: 'Hi', body: '<p>Hi</p>' },
    ...overrides,
  };
}

/** Builds a fake EmailQueuePort + fetch, and Deps wired to both, recording every call. */
function makeDeps(opts: {
  env?: Partial<Record<keyof typeof REQUIRED_ENV, string | undefined>>;
  messages?: QueueMessage[];
  resendStatus?: number | ((callIndex: number) => number);
  fetchImpl?: typeof fetch;
}) {
  const env = { ...REQUIRED_ENV, ...opts.env };
  const archived: number[] = [];
  const deleted: number[] = [];
  const fetches: Array<{ url: string; init?: RequestInit }> = [];
  let closed = false;
  let openQueueCalls = 0;

  const queue: EmailQueuePort = {
    read: () => Promise.resolve(opts.messages ?? []),
    archive: (msgId) => {
      archived.push(msgId);
      return Promise.resolve();
    },
    delete: (msgId) => {
      deleted.push(msgId);
      return Promise.resolve();
    },
    close: () => {
      closed = true;
      return Promise.resolve();
    },
  };

  let fetchCallCount = 0;
  const fetchImpl: typeof fetch =
    opts.fetchImpl ??
    ((url, init) => {
      fetches.push({ url: String(url), init });
      const status =
        typeof opts.resendStatus === 'function' ?
          opts.resendStatus(fetchCallCount++)
        : (opts.resendStatus ?? 200);
      return Promise.resolve(new Response(null, { status }));
    });

  const deps: Deps = {
    env: (key) => env[key as keyof typeof env],
    openQueue: () => {
      openQueueCalls++;
      return queue;
    },
    fetch: fetchImpl,
  };

  return {
    deps,
    archived,
    deleted,
    fetches,
    isClosed: () => closed,
    openQueueCalls: () => openQueueCalls,
  };
}

const dummyRequest = new Request('http://localhost/', {
  headers: { 'X-Cron-Secret': REQUIRED_ENV.CRON_SECRET },
});

Deno.test('returns 500 and never opens the queue when an env var is missing', async () => {
  for (const missing of [
    'SUPABASE_DB_URL',
    'RESEND_API_KEY',
    'FROM_EMAIL',
    'CRON_SECRET',
  ] as const) {
    const { deps, openQueueCalls } = makeDeps({ env: { [missing]: undefined } });
    const res = await handleRequest(dummyRequest, deps);
    assertEquals(res.status, 500);
    assertEquals(openQueueCalls(), 0);
  }
});

Deno.test(
  'returns 401 and never opens the queue when the cron secret header is missing',
  async () => {
    const { deps, openQueueCalls } = makeDeps({});
    const res = await handleRequest(new Request('http://localhost/'), deps);
    assertEquals(res.status, 401);
    assertEquals(openQueueCalls(), 0);
  },
);

Deno.test(
  'returns 401 and never opens the queue when the cron secret header is wrong',
  async () => {
    const { deps, openQueueCalls } = makeDeps({});
    const req = new Request('http://localhost/', { headers: { 'X-Cron-Secret': 'wrong' } });
    const res = await handleRequest(req, deps);
    assertEquals(res.status, 401);
    assertEquals(openQueueCalls(), 0);
  },
);

Deno.test('returns processed:0 and never calls fetch on an empty queue', async () => {
  const { deps, fetches, isClosed } = makeDeps({ messages: [] });
  const res = await handleRequest(dummyRequest, deps);
  const body = await res.json();
  assertEquals(body, { processed: 0, exhausted: 0, total: 0 });
  assertEquals(fetches.length, 0);
  assertEquals(isClosed(), true);
});

Deno.test('archives an exhausted message (read_ct >= 5) without ever calling Resend', async () => {
  const { deps, archived, deleted, fetches } = makeDeps({
    messages: [makeMessage({ msg_id: 42, read_ct: 5 })],
  });
  const res = await handleRequest(dummyRequest, deps);
  const body = await res.json();
  assertEquals(archived, [42]);
  assertEquals(deleted, []);
  assertEquals(fetches.length, 0);
  assertEquals(body, { processed: 0, exhausted: 1, total: 1 });
});

Deno.test(
  'sends read_ct=4 (one below the exhaustion threshold) instead of archiving it',
  async () => {
    const { deps, archived, fetches } = makeDeps({
      messages: [makeMessage({ msg_id: 7, read_ct: 4 })],
      resendStatus: 200,
    });
    await handleRequest(dummyRequest, deps);
    assertEquals(archived, []);
    assertEquals(fetches.length, 1);
  },
);

Deno.test('deletes the message and posts the exact Resend payload on a 2xx response', async () => {
  const { deps, deleted, fetches } = makeDeps({
    messages: [
      makeMessage({
        msg_id: 9,
        message: {
          accountId: 'acc-9',
          email: 'ada@example.com',
          subject: 'Welcome',
          body: '<b>hi</b>',
        },
      }),
    ],
    resendStatus: 200,
  });
  const res = await handleRequest(dummyRequest, deps);
  const body = await res.json();

  assertEquals(deleted, [9]);
  assertEquals(body, { processed: 1, exhausted: 0, total: 1 });

  assertEquals(fetches.length, 1);
  const [call] = fetches;
  if (!call) throw new Error('expected exactly one fetch call');

  assertEquals(call.url, 'https://api.resend.com/emails');
  assertEquals(call.init?.method, 'POST');
  const headers = call.init?.headers as Record<string, string>;
  assertEquals(headers.Authorization, `Bearer ${REQUIRED_ENV.RESEND_API_KEY}`);
  assertEquals(headers['Content-Type'], 'application/json');
  assertEquals(JSON.parse(call.init?.body as string), {
    from: REQUIRED_ENV.FROM_EMAIL,
    to: 'ada@example.com',
    subject: 'Welcome',
    html: '<b>hi</b>',
  });
});

Deno.test(
  'does NOT delete the message when Resend returns a non-2xx status (leaves it retryable)',
  async () => {
    const { deps, deleted, archived } = makeDeps({
      messages: [makeMessage({ msg_id: 3 })],
      resendStatus: 422,
    });
    const res = await handleRequest(dummyRequest, deps);
    const body = await res.json();

    assertEquals(deleted, []);
    assertEquals(archived, []);
    assertEquals(body.processed, 0);
  },
);

Deno.test(
  'processes a mixed batch (exhausted + ok + failed) without one outcome affecting the others',
  async () => {
    const { deps, archived, deleted } = makeDeps({
      messages: [
        makeMessage({ msg_id: 1, read_ct: 5 }), // exhausted
        makeMessage({ msg_id: 2, read_ct: 0 }), // ok
        makeMessage({ msg_id: 3, read_ct: 0 }), // fails
      ],
      resendStatus: (callIndex) => (callIndex === 0 ? 200 : 500),
    });
    const res = await handleRequest(dummyRequest, deps);
    const body = await res.json();

    assertEquals(archived, [1]);
    assertEquals(deleted, [2]);
    assertEquals(body, { processed: 1, exhausted: 1, total: 3 });
  },
);

Deno.test(
  'still closes the queue connection when fetch throws (fixes the finally block)',
  async () => {
    const { deps, isClosed } = makeDeps({
      messages: [makeMessage()],
      fetchImpl: () => Promise.reject(new Error('network unreachable')),
    });

    await assertRejects(() => handleRequest(dummyRequest, deps));
    assertEquals(isClosed(), true);
  },
);

async function assertRejects(fn: () => Promise<unknown>): Promise<void> {
  let threw = false;
  try {
    await fn();
  } catch {
    threw = true;
  }
  if (!threw) throw new Error('Expected the promise to reject, but it resolved.');
}
