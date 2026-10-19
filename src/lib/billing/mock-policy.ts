/** Mock access is independent of whichever real provider is configured as default. */
export function isMockBillingAllowed(input: {
  nodeEnv?: string;
  allowMockBilling?: string;
}): boolean {
  return input.nodeEnv !== 'production' || input.allowMockBilling === 'true';
}

export function assertMockBillingAllowed(input: {
  nodeEnv?: string;
  allowMockBilling?: string;
}): void {
  if (!isMockBillingAllowed(input)) throw new Error('mock_billing_disabled');
}
