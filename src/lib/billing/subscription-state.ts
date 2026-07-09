import type { NormalizedEvent, SubscriptionStatus } from './types';

export interface SubscriptionSnapshot {
  status: SubscriptionStatus;
  cancelAtPeriodEnd: boolean;
}

/**
 * Decide el estado resultante de una suscripción tras un evento del proveedor.
 * Función pura, sin I/O — es la lógica más delicada de portar a proveedores reales.
 */
export function applyEvent(
  current: SubscriptionSnapshot | null,
  event: NormalizedEvent,
): SubscriptionSnapshot {
  switch (event.type) {
    case 'subscription_created':
      return { status: event.status ?? 'active', cancelAtPeriodEnd: false };
    case 'subscription_updated':
      return {
        status: event.status ?? current?.status ?? 'active',
        cancelAtPeriodEnd: event.cancelAtPeriodEnd ?? current?.cancelAtPeriodEnd ?? false,
      };
    case 'subscription_canceled':
      return { status: 'canceled', cancelAtPeriodEnd: false };
    case 'invoice_paid':
      return { status: 'active', cancelAtPeriodEnd: current?.cancelAtPeriodEnd ?? false };
  }
}
