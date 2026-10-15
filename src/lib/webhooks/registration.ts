import { z } from 'zod';

import { createAdminClient } from '@/lib/supabase/admin';
import { createClient } from '@/lib/supabase/server';

import { canonicalizeWebhookUrl, resolveWebhookDestination } from './destination';

const inputSchema = z
  .object({
    accountId: z.uuid(),
    operation: z.enum(['create', 'update']),
    endpointId: z.uuid().optional(),
    url: z.string().max(2000),
  })
  .strict()
  .refine((value) => (value.operation === 'update' ? !!value.endpointId : !value.endpointId));
const endpointSchema = z.object({
  account_id: z.uuid(),
  version: z.number().int().positive().safe(),
});
const knownErrors = new Set([
  'not_authenticated',
  'not_authorized',
  'feature_not_in_plan',
  'webhook_validation_rate_limited',
  'webhook_version_conflict',
  'endpoint_limit_reached',
  'invalid_url',
  'unsafe_destination',
  'dns_failed',
  'dns_timeout',
]);

/** Controlled registration errors never expose SQL details, destination URLs or DNS answers. */
export class WebhookRegistrationError extends Error {
  constructor(readonly code: string) {
    super(code);
    this.name = 'WebhookRegistrationError';
  }
}

/** Maps only known boundary errors; arbitrary provider/SQL messages remain private. */
export function webhookRegistrationErrorCode(error: unknown): string {
  if (typeof error !== 'object' || error === null) return 'validation_failed';
  const raw =
    'code' in error && typeof error.code === 'string' && knownErrors.has(error.code) ? error.code
    : 'message' in error && typeof error.message === 'string' ? error.message
    : '';
  if (raw === 'unsafe_webhook_url') return 'invalid_url';
  if (raw === 'not_found') return 'not_authorized';
  return knownErrors.has(raw) ? raw : 'validation_failed';
}

/** Authorizes and reserves durable budget before DNS; SQL consumes the ticket with the mutation. */
export async function prepareWebhookUrlValidation(
  input: {
    accountId: string;
    operation: 'create' | 'update';
    endpointId?: string;
    url: string;
  },
  accessToken?: string,
): Promise<{ url: string; ticket: string; version: number | null }> {
  const parsed = inputSchema.safeParse(input);
  if (!parsed.success) throw new WebhookRegistrationError('invalid_url');
  const userClient = await createClient();
  const { data: claims, error: claimsError } = await userClient.auth.getClaims(accessToken);
  const actor = z.uuid().safeParse(claims?.claims.sub);
  if (claimsError || !actor.success) throw new WebhookRegistrationError('not_authenticated');
  try {
    const url = canonicalizeWebhookUrl(parsed.data.url).href;
    const admin = createAdminClient();
    let version: number | null = null;
    if (parsed.data.operation === 'update') {
      const { data, error } = await admin
        .from('webhook_endpoints')
        .select('account_id,version')
        .eq('id', parsed.data.endpointId ?? '')
        .eq('account_id', parsed.data.accountId)
        .maybeSingle();
      const endpoint = endpointSchema.safeParse(data);
      if (error || !endpoint.success || endpoint.data.account_id !== parsed.data.accountId)
        throw new WebhookRegistrationError('not_authorized');
      version = endpoint.data.version;
    }
    const { data: reservation, error: reservationError } = await admin.rpc(
      'reserve_webhook_url_validation',
      {
        p_account_id: parsed.data.accountId,
        p_actor_id: actor.data,
        p_operation: parsed.data.operation,
        p_endpoint_id: parsed.data.endpointId,
        p_expected_version: version ?? undefined,
        p_canonical_url: url,
      },
    );
    if (reservationError) throw reservationError;
    const reservationId = z.uuid().safeParse(reservation);
    if (!reservationId.success) throw new WebhookRegistrationError('validation_failed');
    await resolveWebhookDestination(new URL(url), AbortSignal.timeout(5000));
    const { data: ticket, error: ticketError } = await admin.rpc('issue_webhook_url_validation', {
      p_reservation_id: reservationId.data,
    });
    if (ticketError) throw ticketError;
    const ticketId = z.uuid().safeParse(ticket);
    if (!ticketId.success) throw new WebhookRegistrationError('validation_failed');
    return { url, ticket: ticketId.data, version };
  } catch (error) {
    throw new WebhookRegistrationError(webhookRegistrationErrorCode(error));
  }
}
