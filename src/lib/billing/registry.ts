import { env } from '@/env';

import { mercadopagoProvider } from './providers/mercadopago';
import { mockProvider } from './providers/mock';
import { stripeProvider } from './providers/stripe';
import type { PaymentProvider } from './types';

/**
 * Registro de proveedores de pago. Cada uno se registra solo si sus credenciales
 * están en env — así "si la pasarela existe, se agrega". `mock` siempre está.
 */
const registry = new Map<string, PaymentProvider>();

type ProviderCredentialEnvironment = {
  STRIPE_SECRET_KEY?: string;
  STRIPE_WEBHOOK_SECRET?: string;
  MERCADOPAGO_ACCESS_TOKEN?: string;
  MERCADOPAGO_WEBHOOK_SECRET?: string;
  MERCADOPAGO_WEBHOOK_URL?: string;
};

/** Returns whether a provider has both the API and webhook credentials it needs. */
export function hasProviderCredentials(
  provider: 'stripe' | 'mercadopago',
  credentials: ProviderCredentialEnvironment,
): boolean {
  if (provider === 'stripe') {
    return Boolean(credentials.STRIPE_SECRET_KEY && credentials.STRIPE_WEBHOOK_SECRET);
  }

  return Boolean(
    credentials.MERCADOPAGO_ACCESS_TOKEN &&
    credentials.MERCADOPAGO_WEBHOOK_SECRET &&
    credentials.MERCADOPAGO_WEBHOOK_URL,
  );
}

registry.set(mockProvider.name, mockProvider);
if (hasProviderCredentials('stripe', env)) registry.set(stripeProvider.name, stripeProvider);
if (hasProviderCredentials('mercadopago', env))
  registry.set(mercadopagoProvider.name, mercadopagoProvider);

export function availableProviders(): string[] {
  return [...registry.keys()];
}

/** Devuelve el proveedor pedido o el default (env.BILLING_DEFAULT_PROVIDER). */
export function getPaymentProvider(name: string = env.BILLING_DEFAULT_PROVIDER): PaymentProvider {
  const provider = registry.get(name);
  if (!provider) throw new Error('provider_not_configured');
  return provider;
}
