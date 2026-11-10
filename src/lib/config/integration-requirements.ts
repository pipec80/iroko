export type IntegrationCredentials = Partial<
  Record<
    | 'FROM_EMAIL'
    | 'MAILPIT_URL'
    | 'RESEND_API_KEY'
    | 'MOCK_BILLING_SECRET'
    | 'STRIPE_SECRET_KEY'
    | 'STRIPE_WEBHOOK_SECRET'
    | 'MERCADOPAGO_ACCESS_TOKEN'
    | 'MERCADOPAGO_WEBHOOK_SECRET'
    | 'MERCADOPAGO_WEBHOOK_URL',
    string
  >
>;

export type IntegrationRequirementsInput = {
  billingEnabled: boolean;
  provider: 'mock' | 'stripe' | 'mercadopago';
  mailTransport: 'mailpit' | 'resend';
  credentials: IntegrationCredentials;
};

export const providerCredentialKeys = {
  mock: ['MOCK_BILLING_SECRET'],
  stripe: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
  mercadopago: [
    'MERCADOPAGO_ACCESS_TOKEN',
    'MERCADOPAGO_WEBHOOK_SECRET',
    'MERCADOPAGO_WEBHOOK_URL',
  ],
} as const satisfies Record<
  IntegrationRequirementsInput['provider'],
  readonly (keyof IntegrationCredentials)[]
>;

/** Lists missing integration credentials without reading runtime configuration. */
export function missingIntegrationRequirements(input: IntegrationRequirementsInput): string[] {
  const required: (keyof IntegrationCredentials)[] = [
    'FROM_EMAIL',
    input.mailTransport === 'mailpit' ? 'MAILPIT_URL' : 'RESEND_API_KEY',
    ...(input.billingEnabled ? providerCredentialKeys[input.provider] : []),
  ];
  return required.filter((key) => !input.credentials[key]);
}
