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
registry.set(mockProvider.name, mockProvider);
if (env.STRIPE_SECRET_KEY) registry.set(stripeProvider.name, stripeProvider);
if (env.MERCADOPAGO_ACCESS_TOKEN) registry.set(mercadopagoProvider.name, mercadopagoProvider);

export function availableProviders(): string[] {
  return [...registry.keys()];
}

/** Devuelve el proveedor pedido o el default (env.BILLING_DEFAULT_PROVIDER). */
export function getPaymentProvider(name: string = env.BILLING_DEFAULT_PROVIDER): PaymentProvider {
  const provider = registry.get(name);
  if (!provider) throw new Error('provider_not_configured');
  return provider;
}
