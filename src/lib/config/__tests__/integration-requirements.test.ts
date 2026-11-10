import { describe, expect, it } from 'vitest';
import { missingIntegrationRequirements } from '../integration-requirements';

const mailpit = { FROM_EMAIL: 'dev@example.com', MAILPIT_URL: 'http://localhost:54324' };

describe('missingIntegrationRequirements', () => {
  it('allows a new no-billing Mailpit installation without payment or Resend secrets', () => {
    expect(
      missingIntegrationRequirements({
        billingEnabled: false,
        provider: 'mock',
        mailTransport: 'mailpit',
        credentials: mailpit,
      }),
    ).toEqual([]);
  });
  it('requires the selected mock secret only when billing is enabled', () => {
    expect(
      missingIntegrationRequirements({
        billingEnabled: true,
        provider: 'mock',
        mailTransport: 'mailpit',
        credentials: mailpit,
      }),
    ).toEqual(['MOCK_BILLING_SECRET']);
  });
  it('requires Resend credentials for Resend delivery', () => {
    expect(
      missingIntegrationRequirements({
        billingEnabled: false,
        provider: 'mock',
        mailTransport: 'resend',
        credentials: { FROM_EMAIL: 'dev@example.com' },
      }),
    ).toEqual(['RESEND_API_KEY']);
  });
  it('requires Stripe webhook authentication as well as the API key', () => {
    expect(
      missingIntegrationRequirements({
        billingEnabled: true,
        provider: 'stripe',
        mailTransport: 'mailpit',
        credentials: { ...mailpit, STRIPE_SECRET_KEY: 'sk_test_x' },
      }),
    ).toEqual(['STRIPE_WEBHOOK_SECRET']);
  });
  it('requires the Mercado Pago notification URL', () => {
    expect(
      missingIntegrationRequirements({
        billingEnabled: true,
        provider: 'mercadopago',
        mailTransport: 'mailpit',
        credentials: {
          ...mailpit,
          MERCADOPAGO_ACCESS_TOKEN: 'test',
          MERCADOPAGO_WEBHOOK_SECRET: 'test',
        },
      }),
    ).toEqual(['MERCADOPAGO_WEBHOOK_URL']);
  });
  it('accepts complete credentials and always requires a sender', () => {
    expect(
      missingIntegrationRequirements({
        billingEnabled: true,
        provider: 'mock',
        mailTransport: 'resend',
        credentials: {
          FROM_EMAIL: 'dev@example.com',
          RESEND_API_KEY: 'test',
          MOCK_BILLING_SECRET: 'cd'.repeat(32),
        },
      }),
    ).toEqual([]);
    expect(
      missingIntegrationRequirements({
        billingEnabled: false,
        provider: 'mock',
        mailTransport: 'mailpit',
        credentials: {},
      }),
    ).toEqual(['FROM_EMAIL', 'MAILPIT_URL']);
  });
});
