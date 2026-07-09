import { env } from '@/env';

import { signMockPayload, verifyMockPayload } from '../signing';
import type { CheckoutParams, NormalizedEvent, PaymentProvider, PortalParams } from '../types';

interface MockCheckoutToken {
  accountId: string;
  planSlug: string;
  interval: 'month' | 'year';
  successUrl: string;
  cancelUrl: string;
}

/**
 * Proveedor de pago simulado (F2-2A-core). No usa credenciales: createCheckout
 * redirige a una hosted-page interna firmada; verifyWebhook valida el HMAC del
 * mismo secreto. Ejercita el pipeline completo igual que un proveedor real.
 */
export const mockProvider: PaymentProvider = {
  name: 'mock',

  async createCheckout(params: CheckoutParams): Promise<{ url: string }> {
    const token = await signMockPayload({
      accountId: params.accountId,
      planSlug: params.planSlug,
      interval: params.interval,
      successUrl: params.successUrl,
      cancelUrl: params.cancelUrl,
    } satisfies MockCheckoutToken);
    const base = new URL('/es/billing/mock-checkout', env.SITE_URL ?? 'http://localhost:3000');
    base.searchParams.set('data', token);
    return { url: base.toString() };
  },

  async createPortalSession(params: PortalParams): Promise<{ url: string }> {
    // El mock no tiene portal externo: volver directo a la app.
    return { url: params.returnUrl };
  },

  async cancelSubscription(): Promise<void> {
    // No-op: la cancelación del mock se materializa vía webhook (ver actions).
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedEvent | null> {
    // El mock firma el body completo como token; signature es redundante pero
    // se mantiene por paridad con la interfaz. Validamos el token del body.
    const event = await verifyMockPayload<NormalizedEvent>(rawBody);
    if (!event || signature !== 'mock') return null;
    return event;
  },
};
