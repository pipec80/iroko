import { Client } from 'jsr:@db/postgres';

import type { EmailQueuePort, QueueMessage } from './handler.ts';

const QUEUE_NAME = 'email_queue';

/**
 * Only module that talks to Postgres — kept out of handler.ts so `deno test`
 * never needs network.
 *
 * Uses `@db/postgres` (not `npm:postgres`): the edge-runtime's Node-compat
 * DNS resolver fails to resolve Docker Compose service hostnames
 * (`getaddrinfo ENOTFOUND`) for npm-imported drivers — a known issue
 * (supabase/postgres#1447), worked around upstream by using a native Deno
 * driver instead.
 */
export function createPgmqQueue(dbUrl: string): EmailQueuePort {
  const client = new Client(dbUrl);
  const ready = client.connect();

  return {
    async read(visibilityTimeoutSeconds, batchSize) {
      await ready;
      const result = await client.queryObject`
        SELECT * FROM pgmq.read(${QUEUE_NAME}, ${visibilityTimeoutSeconds}, ${batchSize})
      `;
      return result.rows as unknown as QueueMessage[];
    },
    async archive(msgId) {
      await ready;
      await client.queryArray`SELECT pgmq.archive(${QUEUE_NAME}, ${msgId}::bigint)`;
    },
    async delete(msgId) {
      await ready;
      await client.queryArray`SELECT pgmq.delete(${QUEUE_NAME}, ${msgId}::bigint)`;
    },
    async close() {
      await ready;
      await client.end();
    },
  };
}
