'use server';

import { z } from 'zod';

import { getActiveAccountId } from '@/lib/active-account';
import { captureServer } from '@/lib/analytics/server';
import { logger } from '@/lib/logger';
import { withServerAction } from '@/lib/server-action';
import { createClient } from '@/lib/supabase/server';
import {
  prepareWebhookUrlValidation,
  webhookRegistrationErrorCode,
} from '@/lib/webhooks/registration';
import {
  deliveriesQuerySchema,
  webhookEndpointSchema,
  type DeliveriesQueryInput,
  type WebhookEndpointInput,
  type WebhookEventType,
} from '@/lib/validation/webhooks';

export type WebhookEndpoint = {
  id: string;
  url: string;
  description: string | null;
  events: WebhookEventType[];
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type WebhookDeliveryStatus = 'pending' | 'success' | 'failed' | 'exhausted';

export type WebhookDelivery = {
  id: string;
  endpointId: string;
  eventType: string;
  status: WebhookDeliveryStatus;
  attempts: number;
  lastStatusCode: number | null;
  lastError: string | null;
  createdAt: string;
  deliveredAt: string | null;
};

export type DeliveriesPage = {
  entries: WebhookDelivery[];
  nextCursor: { createdAt: string; id: string } | null;
};

type ActionResult<T> = { data: T | null; error?: string };

const endpointIdSchema = z.object({ id: z.uuid() });
const updateEndpointSchema = webhookEndpointSchema.extend({
  id: z.uuid(),
  enabled: z.boolean(),
});

/**
 * Crea un endpoint de webhook y devuelve el signing secret UNA única vez.
 * La autorización (owner/admin) y el límite por cuenta los aplica el RPC.
 */
export const createWebhookEndpoint = withServerAction(async function createWebhookEndpoint(
  input: WebhookEndpointInput,
): Promise<ActionResult<{ id: string; secret: string }>> {
  const parsed = webhookEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  let validation;
  try {
    validation = await prepareWebhookUrlValidation({
      accountId,
      operation: 'create',
      url: parsed.data.url,
    });
  } catch (error) {
    return { data: null, error: webhookRegistrationErrorCode(error) };
  }
  const supabase = await createClient();
  const { data, error } = await supabase.rpc('create_webhook_endpoint_validated', {
    p_account_id: accountId,
    p_url: validation.url,
    p_description: parsed.data.description ?? '',
    p_events: parsed.data.events,
    p_validation_ticket: validation.ticket,
  });

  if (error) {
    logger.warn({ action: 'webhook.create', code: error.code }, 'create_webhook_endpoint failed');
    return { data: null, error: webhookRegistrationErrorCode(error) };
  }

  const row = data?.[0];
  if (!row) return { data: null, error: 'create_failed' };

  const { data: claimsData } = await supabase.auth.getClaims();
  const userId = claimsData?.claims.sub;
  if (userId) {
    await captureServer({
      event: 'webhook_created',
      properties: { event_count: parsed.data.events.length },
      distinctId: userId,
      accountId,
    });
  }

  return { data: { id: row.id, secret: row.secret } };
});

/** Actualiza URL, descripción, eventos y enabled de un endpoint (owner/admin). */
export const updateWebhookEndpoint = withServerAction(async function updateWebhookEndpoint(
  input: WebhookEndpointInput & { id: string; enabled: boolean },
): Promise<ActionResult<true>> {
  const parsed = updateEndpointSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  let validation;
  try {
    validation = await prepareWebhookUrlValidation({
      accountId,
      operation: 'update',
      endpointId: parsed.data.id,
      url: parsed.data.url,
    });
  } catch (error) {
    return { data: null, error: webhookRegistrationErrorCode(error) };
  }
  if (validation.version === null) return { data: null, error: 'validation_failed' };
  const supabase = await createClient();
  const { error } = await supabase.rpc('update_webhook_endpoint_validated', {
    p_endpoint_id: parsed.data.id,
    p_url: validation.url,
    p_description: parsed.data.description ?? '',
    p_events: parsed.data.events,
    p_enabled: parsed.data.enabled,
    p_expected_version: validation.version,
    p_validation_ticket: validation.ticket,
  });

  if (error) {
    logger.warn({ action: 'webhook.update', code: error.code }, 'update_webhook_endpoint failed');
    return { data: null, error: webhookRegistrationErrorCode(error) };
  }

  return { data: true };
});

/** Elimina un endpoint y (cascade) su historial de entregas (owner/admin). */
export const deleteWebhookEndpoint = withServerAction(async function deleteWebhookEndpoint(input: {
  id: string;
}): Promise<ActionResult<true>> {
  const parsed = endpointIdSchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { error } = await supabase.rpc('delete_webhook_endpoint', {
    p_endpoint_id: parsed.data.id,
  });

  if (error) {
    logger.warn(
      { action: 'webhook.delete', code: error.code, message: error.message },
      'delete_webhook_endpoint failed',
    );
    return { data: null, error: error.message ?? 'delete_failed' };
  }

  return { data: true };
});

/** Lista los endpoints de la cuenta activa (owner/admin, sin secret). */
export const listWebhookEndpoints = withServerAction(async function listWebhookEndpoints(): Promise<
  ActionResult<WebhookEndpoint[]>
> {
  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_webhook_endpoints', {
    p_account_id: accountId,
  });

  if (error) {
    logger.warn(
      { action: 'webhook.list', code: error.code, message: error.message },
      'list_webhook_endpoints failed',
    );
    return { data: null, error: error.message ?? 'fetch_failed' };
  }

  const endpoints: WebhookEndpoint[] = (data ?? []).map((row) => ({
    id: row.id,
    url: row.url,
    description: row.description,
    events: row.events as WebhookEventType[],
    enabled: row.enabled,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }));

  return { data: endpoints };
});

/**
 * Log de entregas paginado por keyset (created_at, id), filtrable por endpoint.
 * Mismo patrón de cursor que el visor de auditoría (F2-2G).
 */
export const listWebhookDeliveries = withServerAction(async function listWebhookDeliveries(
  input: DeliveriesQueryInput,
): Promise<ActionResult<DeliveriesPage>> {
  const parsed = deliveriesQuerySchema.safeParse(input);
  if (!parsed.success) {
    return { data: null, error: 'validation_error' };
  }

  const accountId = await getActiveAccountId();
  if (!accountId) return { data: null, error: 'no_account' };

  const { endpointId, limit, cursor } = parsed.data;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc('list_webhook_deliveries', {
    p_account_id: accountId,
    p_endpoint_id: endpointId ?? undefined,
    p_limit: limit,
    p_cursor_created_at: cursor?.createdAt ?? undefined,
    p_cursor_id: cursor?.id ?? undefined,
  });

  if (error) {
    logger.warn(
      { action: 'webhook.deliveries', code: error.code, message: error.message },
      'list_webhook_deliveries failed',
    );
    return { data: null, error: error.message ?? 'fetch_failed' };
  }

  const entries: WebhookDelivery[] = (data ?? []).map((row) => ({
    id: row.id,
    endpointId: row.endpoint_id,
    eventType: row.event_type,
    status: row.status,
    attempts: row.attempts,
    lastStatusCode: row.last_status_code,
    lastError: row.last_error,
    createdAt: row.created_at,
    deliveredAt: row.delivered_at,
  }));

  const last = entries.at(-1);
  const nextCursor =
    entries.length === limit && last ? { createdAt: last.createdAt, id: last.id } : null;

  return { data: { entries, nextCursor } };
});
