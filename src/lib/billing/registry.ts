import { env } from '@/env';
import {
  providerCredentialKeys,
  type IntegrationCredentials,
} from '@/lib/config/integration-requirements';

import { mercadopagoProvider } from './providers/mercadopago';
import { mockProvider } from './providers/mock';
import { stripeProvider } from './providers/stripe';
import type { PaymentProvider } from './types';
import { assertMockBillingAllowed, isMockBillingAllowed } from './mock-policy';

/**
 * Registro de proveedores de pago. Cada uno se registra solo si sus credenciales
 * están en env. La selección exige credenciales sin cambiar a otro proveedor.
 */
const registry = new Map<string, PaymentProvider>();

/** Returns whether a provider has both the API and webhook credentials it needs. */
export function hasProviderCredentials(
  provider: keyof typeof providerCredentialKeys,
  credentials: IntegrationCredentials,
): boolean {
  return providerCredentialKeys[provider].every((key) => Boolean(credentials[key]));
}

if (hasProviderCredentials('mock', env)) registry.set(mockProvider.name, mockProvider);
if (hasProviderCredentials('stripe', env)) registry.set(stripeProvider.name, stripeProvider);
if (hasProviderCredentials('mercadopago', env))
  registry.set(mercadopagoProvider.name, mercadopagoProvider);

export function availableProviders(): string[] {
  return [...registry.keys()].filter(
    (name) =>
      name !== 'mock' ||
      isMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING }),
  );
}

/** Devuelve el proveedor pedido o el default (env.BILLING_DEFAULT_PROVIDER). */
export function getPaymentProvider(name: string = env.BILLING_DEFAULT_PROVIDER): PaymentProvider {
  if (name === 'mock')
    assertMockBillingAllowed({ nodeEnv: env.NODE_ENV, allowMockBilling: env.ALLOW_MOCK_BILLING });
  const provider = registry.get(name);
  if (!provider) throw new Error('provider_not_configured');
  if (
    (name === 'mock' || name === 'stripe' || name === 'mercadopago') &&
    !hasProviderCredentials(name, env)
  )
    throw new Error('provider_not_configured');
  return provider;
}
