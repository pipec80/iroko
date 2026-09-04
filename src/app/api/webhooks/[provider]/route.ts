import { NextResponse } from 'next/server';

import { handleProviderWebhook } from '@/lib/billing/webhook-handler';

const SIGNATURE_HEADER_BY_PROVIDER: Record<string, string> = {
  stripe: 'stripe-signature',
  mercadopago: 'x-signature',
};

function notificationIdFromRawBody(rawBody: string): string | undefined {
  try {
    const value: unknown = JSON.parse(rawBody);
    if (typeof value !== 'object' || value === null || !('id' in value)) return undefined;
    const id = value.id;
    if (typeof id === 'string' && id.trim().length > 0) return id;
    if (typeof id === 'number' && Number.isSafeInteger(id) && id >= 0) return String(id);
  } catch {
    // The provider verifier owns malformed-body rejection.
  }
  return undefined;
}

/** Recibe webhooks de proveedores de pago: /api/webhooks/{mock|stripe|mercadopago} (F2-2A). */
export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const rawBody = await request.text();
  const signatureHeader = SIGNATURE_HEADER_BY_PROVIDER[provider] ?? 'x-webhook-signature';
  let signature = request.headers.get(signatureHeader) ?? 'mock';
  // Mercado Pago manda ts/v1 en x-signature y x-request-id en otro header;
  // ambos componen el manifest HMAC. El data.id firmado y el id de entrega se
  // pasan en el contexto de verificación para no alterar otros proveedores.
  if (provider === 'mercadopago') {
    const requestId = request.headers.get('x-request-id') ?? '';
    signature = `${signature};x-request-id=${requestId}`;
  }
  const context =
    provider === 'mercadopago' ?
      {
        dataId: new URL(request.url).searchParams.get('data.id') ?? undefined,
        webhookId: notificationIdFromRawBody(rawBody),
      }
    : undefined;
  const result =
    context === undefined ?
      await handleProviderWebhook(provider, rawBody, signature)
    : await handleProviderWebhook(provider, rawBody, signature, context);
  const { status, body } = result;
  return NextResponse.json(body, { status });
}
