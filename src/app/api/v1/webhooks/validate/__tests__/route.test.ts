import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({ prepare: vi.fn() }));
vi.mock('@/lib/webhooks/registration', () => ({
  prepareWebhookUrlValidation: mocks.prepare,
  webhookRegistrationErrorCode: (error: unknown) =>
    error instanceof Error ? error.message : 'validation_failed',
}));
import { POST } from '../route';
const input = {
  accountId: '11111111-1111-4111-8111-111111111111',
  operation: 'create',
  url: 'https://example.com/hook',
};
function request(body: unknown = input, authorization?: string) {
  return new Request('https://iroko.test/api/v1/webhooks/validate', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { 'content-type': 'application/json', ...(authorization ? { authorization } : {}) },
  });
}
describe('authenticated destination validation route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.prepare.mockResolvedValue({ url: input.url, ticket: 'opaque-ticket', version: null });
  });
  it('returns only the URL-bound ticket and uses cookie authentication without bearer', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      url: input.url,
      ticket: 'opaque-ticket',
      version: null,
    });
    expect(mocks.prepare).toHaveBeenCalledWith(input, undefined);
    expect(response.headers.get('cache-control')).toBe('no-store');
  });
  it('passes bearer JWT to the SDK-verifying registration boundary', async () => {
    expect((await POST(request(input, 'Bearer signed.jwt.token'))).status).toBe(200);
    expect(mocks.prepare).toHaveBeenCalledWith(input, 'signed.jwt.token');
  });
  it('rejects malformed authorization rather than falling back to cookies', async () => {
    expect((await POST(request(input, 'Basic credentials'))).status).toBe(401);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it('rejects invalid bearer claims without returning tickets', async () => {
    mocks.prepare.mockRejectedValue(new Error('not_authenticated'));
    const response = await POST(request(input, 'Bearer invalid.jwt.token'));
    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'not_authenticated' });
  });
  it('denies actor injection and oversized bodies before privileged work', async () => {
    expect((await POST(request({ ...input, actorId: 'forged' }))).status).toBe(400);
    expect((await POST(request({ ...input, url: 'x'.repeat(5000) }))).status).toBe(400);
    expect(mocks.prepare).not.toHaveBeenCalled();
  });
  it.each([
    ['not_authorized', 403],
    ['webhook_validation_rate_limited', 429],
    ['unsafe_destination', 400],
  ])('classifies controlled %s without returning DNS answers', async (code, status) => {
    mocks.prepare.mockRejectedValue(new Error(code));
    const response = await POST(request());
    expect(response.status).toBe(status);
    expect(await response.json()).toEqual({ error: code });
  });
});
