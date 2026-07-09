import { NextResponse } from 'next/server';

import { handleProviderWebhook } from '@/lib/billing/webhook-handler';

/** Recibe webhooks de proveedores de pago: /api/webhooks/{mock|stripe|…} (F2-2A). */
export async function POST(request: Request, ctx: { params: Promise<{ provider: string }> }) {
  const { provider } = await ctx.params;
  const rawBody = await request.text();
  const signature = request.headers.get('x-webhook-signature') ?? 'mock';
  const { status, body } = await handleProviderWebhook(provider, rawBody, signature);
  return NextResponse.json(body, { status });
}
