import { handleRequest } from './handler.ts';
import { createPgmqQueue } from './pgmq-queue.ts';

Deno.serve((req) =>
  handleRequest(req, {
    env: (k) => Deno.env.get(k),
    openQueue: createPgmqQueue,
    fetch: globalThis.fetch.bind(globalThis),
  }),
);
