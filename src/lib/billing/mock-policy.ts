import { isUnhostedLoopbackEnvironment } from '@/lib/local-validation';

type MockBillingConfig = {
  nodeEnv?: string;
  allowMockBilling?: string;
};

export function isMockBillingOptedIn(input: MockBillingConfig): boolean {
  return input.nodeEnv !== 'production' || input.allowMockBilling === 'true';
}

/** A configured mock default may boot on hosting, but no bearer may be issued or consumed there. */
export function isMockBillingAllowed(input: MockBillingConfig): boolean {
  return (
    process.env.MOCK_BILLING_FIXTURE === 'true' &&
    isMockBillingOptedIn(input) &&
    isUnhostedLoopbackEnvironment(process.env)
  );
}

export function assertMockBillingAllowed(input: MockBillingConfig): void {
  if (!isMockBillingAllowed(input)) throw new Error('mock_billing_disabled');
}
