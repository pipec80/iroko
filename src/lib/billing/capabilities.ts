/** Operations a payment provider can support natively and safely. */
export interface ProviderCapabilities {
  customerPortal: boolean;
  cancelImmediately: boolean;
  cancelAtPeriodEnd: boolean;
  updatePaymentMethod: boolean;
  changePlan: boolean;
  pauseSubscription: boolean;
}

/** Throws before an unsupported provider operation can be attempted. */
export function assertProviderCapability(
  capabilities: ProviderCapabilities,
  capability: keyof ProviderCapabilities,
): void {
  if (capabilities[capability]) return;
  throw new Error(`billing_capability_not_supported:${capability}`);
}
