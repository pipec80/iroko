import { NextResponse } from 'next/server';

import { handleProviderWebhook } from '@/lib/billing/webhook-handler';

const SIGNATURE_HEADER_BY_PROVIDER: Record<string, string> = {
  stripe: 'stripe-signature',
  mercadopago: 'x-signature',
};

/** Recibe webhooks de proveedores de pago: /api/webhooks/{mock|stripe|mercadopago} (F2-2A). */
export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const rawBody = await request.text();
  const signatureHeader = SIGNATURE_HEADER_BY_PROVIDER[provider] ?? 'x-webhook-signature';
  const signature = request.headers.get(signatureHeader) ?? 'mock';
  const { status, body } = await handleProviderWebhook(provider, rawBody, signature);
  return NextResponse.json(body, { status });
}
