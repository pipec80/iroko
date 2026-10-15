import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  run: vi.fn(),
  env: {
    WEBHOOK_WORKER_SECRET: 'fixture-worker-secret-32-characters-minimum' as string | undefined,
  },
}));
vi.mock('@/env', () => ({ env: mocks.env }));
vi.mock('@/lib/logger', () => ({ logger: { error: vi.fn() } }));
vi.mock('@/lib/webhooks/worker', () => ({ runWebhookWorker: mocks.run }));
import { POST } from '../route';
function request(body: unknown = {}, secret = 'fixture-worker-secret-32-characters-minimum') {
  return new Request('https://iroko.test/api/internal/webhooks/worker', {
    method: 'POST',
    body: JSON.stringify(body),
    headers: { authorization: 'Bearer ' + secret },
  });
}
describe('internal webhook worker route', () => {
  beforeEach(() => {
    vi.resetAllMocks();
    mocks.env.WEBHOOK_WORKER_SECRET = 'fixture-worker-secret-32-characters-minimum';
    mocks.run.mockResolvedValue({
      claimed: 0,
      succeeded: 0,
      retryable: 0,
      rejected: 0,
      completionFailed: 0,
    });
  });
  it('fails closed when unconfigured or the dedicated secret does not match', async () => {
    expect((await POST(request({}, 'wrong'))).status).toBe(401);
    mocks.env.WEBHOOK_WORKER_SECRET = undefined;
    expect((await POST(request())).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it('rejects the legacy header and malformed bearer authorization', async () => {
    const legacy = new Request('https://iroko.test/api/internal/webhooks/worker', {
      method: 'POST',
      body: '{}',
      headers: { 'x-webhook-worker-secret': 'fixture-worker-secret-32-characters-minimum' },
    });
    expect((await POST(legacy)).status).toBe(401);
    const malformed = new Request('https://iroko.test/api/internal/webhooks/worker', {
      method: 'POST',
      body: '{}',
      headers: { authorization: 'Basic fixture-worker-secret-32-characters-minimum' },
    });
    expect((await POST(malformed)).status).toBe(401);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it('rejects destinations supplied by the caller', async () => {
    expect((await POST(request({ url: 'https://private.internal' }))).status).toBe(400);
    expect(mocks.run).not.toHaveBeenCalled();
  });
  it('returns counts only after an authenticated empty wakeup', async () => {
    const response = await POST(request());
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({
      claimed: 0,
      succeeded: 0,
      retryable: 0,
      rejected: 0,
      completionFailed: 0,
    });
  });
  it('does not expose exception details', async () => {
    mocks.run.mockRejectedValue(new Error('secret URL and credentials'));
    const response = await POST(request());
    expect(response.status).toBe(500);
    expect(await response.json()).toEqual({ error: 'worker_failed' });
  });
});
