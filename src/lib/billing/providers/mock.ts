import { env } from '@/env';

import { signMockPayload, verifyMockPayload } from '../signing';
import type { NormalizedBillingEvent } from '../events';
import type { CheckoutParams, PaymentProvider } from '../types';

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
  capabilities: {
    customerPortal: false,
    cancelImmediately: true,
    cancelAtPeriodEnd: true,
    updatePaymentMethod: false,
    changePlan: false,
    pauseSubscription: false,
  },

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

  async cancelSubscription(): Promise<void> {
    // No-op: la cancelación del mock se materializa vía webhook (ver actions).
  },

  async verifyWebhook(rawBody: string, signature: string): Promise<NormalizedBillingEvent | null> {
    // El mock firma el body completo como token; signature es redundante pero
    // se mantiene por paridad con la interfaz. Validamos el token del body.
    const event = await verifyMockPayload<NormalizedBillingEvent>(rawBody);
    if (!event || signature !== 'mock') return null;
    return event;
  },
};
