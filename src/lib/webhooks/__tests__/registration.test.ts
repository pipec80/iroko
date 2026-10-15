import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  claims: vi.fn(),
  rpc: vi.fn(),
  resolve: vi.fn(),
  endpoint: vi.fn(),
}));
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(async () => ({ auth: { getClaims: mocks.claims } })),
}));
vi.mock('@/lib/supabase/admin', () => ({
  createAdminClient: vi.fn(() => ({
    rpc: mocks.rpc,
    from: () => ({
      select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.endpoint }) }) }),
    }),
  })),
}));
vi.mock('../destination', () => ({
  canonicalizeWebhookUrl: (url: string) => new URL(url),
  resolveWebhookDestination: mocks.resolve,
}));

import { prepareWebhookUrlValidation } from '../registration';

const accountId = '11111111-1111-4111-8111-111111111111';
const actor = '22222222-2222-4222-8222-222222222222';
const ticket = '33333333-3333-4333-8333-333333333333';
describe('webhook registration authorization boundary', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.claims.mockResolvedValue({ data: { claims: { sub: actor } }, error: null });
    mocks.rpc.mockResolvedValue({ data: ticket, error: null });
    mocks.resolve.mockResolvedValue({ address: '8.8.8.8', family: 4 });
  });
  it('rejects an invalid session before privileged access or DNS', async () => {
    mocks.claims.mockResolvedValue({ data: null, error: { message: 'expired' } });
    await expect(
      prepareWebhookUrlValidation({ accountId, operation: 'create', url: 'https://example.com/x' }),
    ).rejects.toMatchObject({ code: 'not_authenticated' });
    expect(mocks.rpc).not.toHaveBeenCalled();
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
  it('verifies a supplied bearer token through getClaims rather than trusting caller claims', async () => {
    await prepareWebhookUrlValidation(
      { accountId, operation: 'create', url: 'https://example.com' },
      'signed.jwt.token',
    );
    expect(mocks.claims).toHaveBeenCalledWith('signed.jwt.token');
  });
  it('does not use a valid cookie session when bearer verification fails', async () => {
    mocks.claims.mockResolvedValue({ data: null, error: { message: 'bad signature' } });
    await expect(
      prepareWebhookUrlValidation(
        { accountId, operation: 'create', url: 'https://example.com' },
        'forged.jwt.token',
      ),
    ).rejects.toMatchObject({ code: 'not_authenticated' });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
  it('reserves authorized durable budget before DNS, then issues a URL-bound ticket', async () => {
    mocks.resolve.mockImplementation(async () => {
      expect(mocks.rpc).toHaveBeenCalledWith(
        'reserve_webhook_url_validation',
        expect.objectContaining({
          p_actor_id: actor,
          p_account_id: accountId,
          p_canonical_url: 'https://example.com/x',
        }),
      );
    });
    await expect(
      prepareWebhookUrlValidation({ accountId, operation: 'create', url: 'https://EXAMPLE.com/x' }),
    ).resolves.toEqual({ url: 'https://example.com/x', ticket, version: null });
    expect(mocks.rpc).toHaveBeenLastCalledWith('issue_webhook_url_validation', {
      p_reservation_id: ticket,
    });
  });
  it('does not resolve DNS or issue a ticket when SQL rejects the role', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: '42501', message: 'not_authorized' },
    });
    await expect(
      prepareWebhookUrlValidation({ accountId, operation: 'create', url: 'https://example.com' }),
    ).rejects.toMatchObject({ code: 'not_authorized' });
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('does not perform DNS or issue a ticket when endpoint capacity is exhausted', async () => {
    mocks.rpc.mockResolvedValue({
      data: null,
      error: { code: 'P0001', message: 'endpoint_limit_reached' },
    });
    await expect(
      prepareWebhookUrlValidation({
        accountId,
        operation: 'create',
        url: 'https://example.com/capacity',
      }),
    ).rejects.toMatchObject({ code: 'endpoint_limit_reached' });
    expect(mocks.resolve).not.toHaveBeenCalled();
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
    expect(mocks.rpc).not.toHaveBeenCalledWith('issue_webhook_url_validation', expect.anything());
  });
  it('never issues a ticket after unsafe DNS', async () => {
    mocks.resolve.mockRejectedValue(
      Object.assign(new Error('unsafe_destination'), { code: 'unsafe_destination' }),
    );
    await expect(
      prepareWebhookUrlValidation({ accountId, operation: 'create', url: 'https://example.com' }),
    ).rejects.toMatchObject({ code: 'unsafe_destination' });
    expect(mocks.rpc).toHaveBeenCalledTimes(1);
  });
  it('binds update reservations to the current version and requested account', async () => {
    mocks.endpoint.mockResolvedValue({ data: { account_id: accountId, version: 7 }, error: null });
    const result = await prepareWebhookUrlValidation({
      accountId,
      operation: 'update',
      endpointId: ticket,
      url: 'https://example.com',
    });
    expect(result.version).toBe(7);
    expect(mocks.rpc).toHaveBeenCalledWith(
      'reserve_webhook_url_validation',
      expect.objectContaining({ p_endpoint_id: ticket, p_expected_version: 7 }),
    );
  });
  it('does not resolve a cross-account endpoint or disclose its version', async () => {
    mocks.endpoint.mockResolvedValue({ data: { account_id: actor, version: 7 }, error: null });
    await expect(
      prepareWebhookUrlValidation({
        accountId,
        operation: 'update',
        endpointId: ticket,
        url: 'https://example.com',
      }),
    ).rejects.toMatchObject({ code: 'not_authorized' });
    expect(mocks.resolve).not.toHaveBeenCalled();
  });
});
