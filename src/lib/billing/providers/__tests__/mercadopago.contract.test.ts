import { describe, it, expect, vi } from 'vitest';

// The rest of mercadopago.test.ts computes its expected signature with the
// SAME crypto.subtle HMAC call verifyManifest() uses internally — a bug in
// that shared algorithm would pass there undetected. This file instead uses
// a signature hex computed ONCE, out-of-band, with Node's node:crypto
// (a different implementation than the app's Web Crypto call), and hardcodes
// the result as a literal below. A real regression in verifyManifest's
// manifest format or HMAC computation would fail this test.
//
// Reproduce with:
//   node -e "const c=require('node:crypto');
//     console.log(c.createHmac('sha256','test_mp_secret_fixture')
//       .update('id:123456789;request-id:req-abc-123;ts:1700000000000;')
//       .digest('hex'))"
const FIXTURE_DATA_ID = '123456789';
const FIXTURE_REQUEST_ID = 'req-abc-123';
const FIXTURE_TS = '1700000000000';
const FIXTURE_HEX = '328684b423e0fd7dc8c74d5c0df2d83696dd1600e235da6dc07b474f4b980bd5';
const FIXTURE_SIGNATURE = `ts=${FIXTURE_TS},v1=${FIXTURE_HEX};x-request-id=${FIXTURE_REQUEST_ID}`;

const { FIXTURE_SECRET } = vi.hoisted(() => ({ FIXTURE_SECRET: 'test_mp_secret_fixture' }));

vi.mock('@/env', () => ({
  env: { MERCADOPAGO_ACCESS_TOKEN: 'TEST-token', MERCADOPAGO_WEBHOOK_SECRET: FIXTURE_SECRET },
}));

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

vi.mock('@/lib/supabase/server', () => ({ createClient: vi.fn() }));
vi.mock('../../webhook-handler', () => ({ handleProviderWebhook: vi.fn() }));

import { mercadopagoProvider } from '../mercadopago';

describe('mercadopagoProvider.verifyWebhook — fixed HMAC vector', () => {
  it('accepts a signature matching the hand-computed hex for the exact manifest', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: async () => ({
        id: FIXTURE_DATA_ID,
        status: 'authorized',
        external_reference: 'acc_fixture_mp',
        next_payment_date: '2026-02-01T00:00:00Z',
      }),
    });

    const body = JSON.stringify({
      type: 'subscription_preapproval',
      data: { id: FIXTURE_DATA_ID },
    });
    const result = await mercadopagoProvider.verifyWebhook(body, FIXTURE_SIGNATURE);

    expect(result).toEqual(
      expect.objectContaining({
        type: 'subscription_updated',
        accountId: 'acc_fixture_mp',
        status: 'active',
        externalSubscriptionId: FIXTURE_DATA_ID,
      }),
    );
    expect(result).not.toHaveProperty('externalPriceId');
  });

  it('rejects the same fixed hex when any manifest component changes (different data.id)', async () => {
    const body = JSON.stringify({
      type: 'subscription_preapproval',
      data: { id: 'a-different-id' },
    });
    const result = await mercadopagoProvider.verifyWebhook(body, FIXTURE_SIGNATURE);

    expect(result).toBeNull();
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
