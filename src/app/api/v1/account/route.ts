import { NextResponse } from 'next/server';

import { admitAccountApiRequest } from '@/lib/api-keys/admission';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Endpoint de ejemplo de la API pública autenticada por API key (F2-2D).
 * La admisión durable comparte cuota entre las claves de la cuenta; la lectura
 * posterior no revierte la reserva, aunque falle.
 */
export async function GET(request: Request) {
  const admission = await admitAccountApiRequest(request);
  if (admission.decision === 'missing_key' || admission.decision === 'invalid_key') {
    return NextResponse.json({ error: admission.decision }, { status: 401 });
  }
  if (admission.decision === 'ip_limited' || admission.decision === 'account_limited') {
    return NextResponse.json(
      { error: 'rate_limited' },
      {
        status: 429,
        headers: { 'Retry-After': String(admission.retryAfterSeconds) },
      },
    );
  }
  if (admission.decision !== 'allowed') {
    return NextResponse.json({ error: 'service_unavailable' }, { status: 503 });
  }

  try {
    const admin = createAdminClient();
    const { data, error } = await admin
      .from('accounts')
      .select('id, name, slug, type')
      .eq('id', admission.accountId)
      .single();
    if (!error && data) return NextResponse.json(data);
  } catch {
    // Transport failures have the same public contract as database lookup failures.
  }
  logger.error(
    { action: 'api_v1.account', tenantId: admission.accountId },
    'Account lookup failed',
  );
  return NextResponse.json({ error: 'internal_error' }, { status: 500 });
}
