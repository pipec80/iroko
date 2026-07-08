import { NextResponse } from 'next/server';

import { authenticateApiKey } from '@/lib/api-keys';
import { logger } from '@/lib/logger';
import { createAdminClient } from '@/lib/supabase/admin';

/**
 * Endpoint de ejemplo de la API pública autenticada por API key (F2-2D).
 * Patrón de referencia para agregar más rutas /api/v1/*: autenticar con
 * authenticateApiKey y operar con el admin client scoped al accountId.
 */
export async function GET(request: Request) {
  const auth = await authenticateApiKey(request);
  if ('error' in auth) {
    return NextResponse.json({ error: auth.error }, { status: 401 });
  }

  const admin = createAdminClient();
  const { data, error } = await admin
    .from('accounts')
    .select('id, name, slug, type')
    .eq('id', auth.accountId)
    .single();

  if (error) {
    logger.error({ action: 'api_v1.account', tenantId: auth.accountId }, 'account lookup failed');
    return NextResponse.json({ error: 'internal_error' }, { status: 500 });
  }

  return NextResponse.json(data);
}
