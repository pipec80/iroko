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
  let signature = request.headers.get(signatureHeader) ?? 'mock';
  // MercadoPago manda ts/v1 en x-signature y el id de la request en un header
  // aparte (x-request-id); el adapter necesita ambos para armar el manifest,
  // así que se concatenan acá — el contrato PaymentProvider.verifyWebhook solo
  // acepta un string de firma.
  if (provider === 'mercadopago') {
    const requestId = request.headers.get('x-request-id') ?? '';
    signature = `${signature};x-request-id=${requestId}`;
  }
  const { status, body } = await handleProviderWebhook(provider, rawBody, signature);
  return NextResponse.json(body, { status });
}
