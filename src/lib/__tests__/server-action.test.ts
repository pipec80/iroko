import { describe, it, expect, vi, beforeEach } from 'vitest';

const mocks = vi.hoisted(() => ({
  captureException: vi.fn(),
  withScope: vi.fn((cb: (scope: { setTag: ReturnType<typeof vi.fn> }) => void) => {
    cb({ setTag: vi.fn() });
  }) as ReturnType<typeof vi.fn>,
}));

vi.mock('@sentry/nextjs', () => ({
  withScope: mocks.withScope,
  captureException: mocks.captureException,
}));

import { withServerAction } from '../server-action';

const PREV = {};

describe('withServerAction', () => {
  beforeEach(() => vi.clearAllMocks());

  it('returns result when action succeeds', async () => {
    const action = vi.fn().mockResolvedValue({ success: 'profile_updated' });
    const wrapped = withServerAction(action);
    const result = await wrapped(PREV, new FormData());
    expect(result).toEqual({ success: 'profile_updated' });
    expect(action).toHaveBeenCalledWith(PREV, expect.any(FormData));
  });

  it('re-throws and captures unexpected exceptions in Sentry', async () => {
    const err = new Error('Unexpected DB crash');
    const wrapped = withServerAction(async function myAction() {
      throw err;
    });
    await expect(wrapped()).rejects.toThrow('Unexpected DB crash');
    expect(mocks.withScope).toHaveBeenCalledOnce();
  });

  it('tags the action name in the Sentry scope', async () => {
    const setTag = vi.fn();
    mocks.withScope.mockImplementationOnce((cb: (scope: unknown) => void) => cb({ setTag }));

    const wrapped = withServerAction(async function updateProfileAction(): Promise<void> {
      throw new Error('fail');
    });
    await expect(wrapped()).rejects.toThrow();
    expect(setTag).toHaveBeenCalledWith('server_action', 'updateProfileAction');
  });

  it('re-throws Next.js redirect errors WITHOUT sending to Sentry', async () => {
    const redirectErr = Object.assign(new Error('redirect'), {
      digest: 'NEXT_REDIRECT:replace:/es/dashboard',
    });
    const wrapped = withServerAction(async () => {
      throw redirectErr;
    });
    await expect(wrapped()).rejects.toThrow('redirect');
    expect(mocks.withScope).not.toHaveBeenCalled();
  });

  it('re-throws Next.js notFound errors WITHOUT sending to Sentry', async () => {
    const notFoundErr = Object.assign(new Error('not found'), {
      digest: 'NEXT_NOT_FOUND',
    });
    const wrapped = withServerAction(async () => {
      throw notFoundErr;
    });
    await expect(wrapped()).rejects.toThrow();
    expect(mocks.withScope).not.toHaveBeenCalled();
  });

  it('does NOT intercept returned error states — those are business logic', async () => {
    const action = vi.fn().mockResolvedValue({ error: 'not_authenticated' });
    const wrapped = withServerAction(action);
    const result = await wrapped();
    expect(result).toEqual({ error: 'not_authenticated' });
    expect(mocks.withScope).not.toHaveBeenCalled();
  });
});
