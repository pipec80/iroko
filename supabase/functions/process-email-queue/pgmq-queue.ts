import postgres from 'npm:postgres@3';

import type { EmailQueuePort, QueueMessage } from './handler.ts';

const QUEUE_NAME = 'email_queue';

/** Only module that talks to Postgres — kept out of handler.ts so `deno test` never needs network. */
export function createPgmqQueue(dbUrl: string): EmailQueuePort {
  const sql = postgres(dbUrl, { prepare: false });

  return {
    async read(visibilityTimeoutSeconds, batchSize) {
      const rows = await sql`
        SELECT * FROM pgmq.read(${QUEUE_NAME}, ${visibilityTimeoutSeconds}, ${batchSize})
      `;
      return rows as unknown as QueueMessage[];
    },
    async archive(msgId) {
      await sql`SELECT pgmq.archive(${QUEUE_NAME}, ${msgId}::bigint)`;
    },
    async delete(msgId) {
      await sql`SELECT pgmq.delete(${QUEUE_NAME}, ${msgId}::bigint)`;
    },
    async close() {
      await sql.end();
    },
  };
}
