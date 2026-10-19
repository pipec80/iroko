import { env } from '@/env';

import { signMockPayload, verifyMockPayload } from '../signing';
import { assertMockBillingAllowed } from '../mock-policy';
import { mockCheckoutSchema, mockEventSchema } from '../mock-schemas';
import type { CheckoutParams, PaymentProvider } from '../types';

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
    assertMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING });
    const token = await signMockPayload(
      mockCheckoutSchema.parse({
        accountId: params.accountId,
        planSlug: params.planSlug,
        interval: params.interval,
        successUrl: params.successUrl,
        cancelUrl: params.cancelUrl,
      }),
    );
    const base = new URL('/es/billing/mock-checkout', env.SITE_URL ?? 'http://localhost:3000');
    base.searchParams.set('data', token);
    return { url: base.toString() };
  },

  async cancelSubscription(): Promise<void> {
    assertMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING });
    // No-op: la cancelación del mock se materializa vía webhook (ver actions).
  },

  async verifyWebhook(rawBody: string, signature: string) {
    // El mock firma el body completo como token; signature es redundante pero
    // se mantiene por paridad con la interfaz. Validamos el token del body.
    if (signature !== 'mock') return null;
    const event = mockEventSchema.safeParse(await verifyMockPayload(rawBody));
    return event.success ? event.data : null;
  },
};
