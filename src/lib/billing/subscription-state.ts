import type { NormalizedBillingEvent } from './events';
import type { SubscriptionStatus } from './types';

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
  event: NormalizedBillingEvent,
): SubscriptionSnapshot {
  switch (event.type) {
    case 'subscription_created':
      return { status: event.status, cancelAtPeriodEnd: event.cancelAtPeriodEnd };
    case 'subscription_updated':
      return {
        status: event.status,
        cancelAtPeriodEnd: event.cancelAtPeriodEnd,
      };
    case 'subscription_canceled':
      return { status: 'canceled', cancelAtPeriodEnd: false };
    case 'invoice_paid':
    case 'invoice_payment_failed':
    case 'payment_recovered':
      if (current) return current;
      throw new Error(`subscription_snapshot_not_found:${event.type}`);
  }
}
