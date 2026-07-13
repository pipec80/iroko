import postgres from 'npm:postgres@3';

const BATCH_SIZE = 20;
const VISIBILITY_TIMEOUT_SECONDS = 60;
const MAX_READ_COUNT = 5;

interface QueueMessage {
  msg_id: number;
  read_ct: number;
  enqueued_at: string;
  vt: string;
  message: { accountId: string; email: string; subject: string; body: string };
}

Deno.serve(async () => {
  const dbUrl = Deno.env.get('SUPABASE_DB_URL');
  const resendApiKey = Deno.env.get('RESEND_API_KEY');
  const fromEmail = Deno.env.get('FROM_EMAIL');
  if (!dbUrl || !resendApiKey || !fromEmail) {
    return new Response('missing required env vars', { status: 500 });
  }

  const sql = postgres(dbUrl, { prepare: false });
  let processed = 0;
  let exhausted = 0;

  try {
    const messages = (await sql`
      SELECT * FROM pgmq.read('email_queue', ${VISIBILITY_TIMEOUT_SECONDS}, ${BATCH_SIZE})
    `) as unknown as QueueMessage[];

    for (const msg of messages) {
      if (msg.read_ct >= MAX_READ_COUNT) {
        await sql`SELECT pgmq.archive('email_queue', ${msg.msg_id}::bigint)`;
        exhausted++;
        console.error('email_queue message exhausted retries', {
          msgId: msg.msg_id,
          readCt: msg.read_ct,
        });
        continue;
      }

      const res = await fetch('https://api.resend.com/emails', {
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
        await sql`SELECT pgmq.delete('email_queue', ${msg.msg_id}::bigint)`;
        processed++;
      }
      // si falla, no se borra: vuelve a estar visible pasado el vt para reintento
    }

    return new Response(JSON.stringify({ processed, exhausted, total: messages.length }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } finally {
    await sql.end();
  }
});
