import { z } from 'zod';

/** Catálogo v1 — debe coincidir con private.webhook_event_catalog() en la DB. */
export const WEBHOOK_EVENT_TYPES = [
  'member.invited',
  'member.joined',
  'member.removed',
  'account.updated',
] as const;

export type WebhookEventType = (typeof WEBHOOK_EVENT_TYPES)[number];

const PRIVATE_HOST = /^(localhost|127\.|10\.|192\.168\.|172\.(1[6-9]|2\d|3[01])\.|0\.|\[::1\])/i;
const PRIVATE_SUFFIX = /\.(local|internal)$/i;

function isPublicHttpsUrl(value: string): boolean {
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return false;
  }
  if (parsed.protocol !== 'https:') return false;
  return !PRIVATE_HOST.test(parsed.hostname) && !PRIVATE_SUFFIX.test(parsed.hostname);
}

/**
 * Valida endpoints de webhook antes de tocar la DB.
 * El chequeo de host privado es defensa superficial contra SSRF — pg_net hace
 * el request desde la DB; DNS rebinding queda como límite conocido documentado.
 */
export const webhookEndpointSchema = z.object({
  url: z.string().max(2000).refine(isPublicHttpsUrl, 'invalid_url'),
  description: z.string().trim().max(200).optional(),
  events: z.array(z.enum(WEBHOOK_EVENT_TYPES)).min(1).max(WEBHOOK_EVENT_TYPES.length),
});

export type WebhookEndpointInput = z.infer<typeof webhookEndpointSchema>;

export const deliveriesQuerySchema = z.object({
  endpointId: z.uuid().optional(),
  limit: z.number().int().min(1).max(100).default(20),
  cursor: z.object({ createdAt: z.string(), id: z.uuid() }).optional(),
});

export type DeliveriesQueryInput = z.input<typeof deliveriesQuerySchema>;
