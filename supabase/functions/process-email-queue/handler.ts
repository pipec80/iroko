// No imports on purpose: deno test type-checks this module, and any import
// (even a type-only one from an npm package) would force it to resolve
// over the network. Everything the handler needs is either a Web API or
// injected via Deps.

const BATCH_SIZE = 20;
const VISIBILITY_TIMEOUT_SECONDS = 60;
const MAX_READ_COUNT = 5;

export interface QueueMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: { accountId: string; email: string; subject: string; body: string };
}

/** Minimal pgmq surface the worker needs — see pgmq-queue.ts for the real Postgres-backed impl. */
export interface EmailQueuePort {
  read(visibilityTimeoutSeconds: number, batchSize: number): Promise<QueueMessage[]>;
  archive(msgId: number): Promise<void>;
  delete(msgId: number): Promise<void>;
  close(): Promise<void>;
}

export interface Deps {
  env: (key: string) => string | undefined;
  openQueue: (dbUrl: string) => EmailQueuePort;
  fetch: typeof fetch;
}

export async function handleRequest(_req: Request, deps: Deps): Promise<Response> {
  const dbUrl = deps.env('SUPABASE_DB_URL');
  const resendApiKey = deps.env('RESEND_API_KEY');
  const fromEmail = deps.env('FROM_EMAIL');
  if (!dbUrl || !resendApiKey || !fromEmail) {
    return new Response('missing required env vars', { status: 500 });
  }

  const queue = deps.openQueue(dbUrl);
  let processed = 0;
  let exhausted = 0;

  try {
    const messages = await queue.read(VISIBILITY_TIMEOUT_SECONDS, BATCH_SIZE);

    for (const msg of messages) {
      if (msg.read_ct >= MAX_READ_COUNT) {
        await queue.archive(msg.msg_id);
        exhausted++;
        console.error('email_queue message exhausted retries', {
          msgId: msg.msg_id,
          readCt: msg.read_ct,
        });
        continue;
      }

      const res = await deps.fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromEmail,
          to: msg.message.email,
          subject: msg.message.subject,
          html: msg.message.body,
        }),
      });

      if (res.ok) {
        await queue.delete(msg.msg_id);
        processed++;
      }
      // si falla, no se borra: vuelve a estar visible pasado el vt para reintento
    }

    return new Response(JSON.stringify({ processed, exhausted, total: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await queue.close();
  }
}
