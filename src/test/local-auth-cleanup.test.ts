import { describe, expect, it, vi } from 'vitest';
import { withAuthCleanup, requireUserUuid } from './local-auth-cleanup';
describe('authenticated fixture lifecycle', () => {
  it('removes account and user after setup failure while preserving the setup error', async () => {
    const failure = new Error('setup failed');
    const account = vi.fn();
    const user = vi.fn();
    await expect(
      withAuthCleanup(
        async () => {
          throw failure;
        },
        account,
        user,
        vi.fn(),
      ),
    ).rejects.toBe(failure);
    expect(account).toHaveBeenCalledOnce();
    expect(user).toHaveBeenCalledOnce();
  });
  it('attempts Auth removal after SQL failure and reports both without hiding primary failure', async () => {
    const primary = new Error('browser failed');
    const report = vi.fn();
    const user = vi.fn().mockRejectedValue(new Error('auth failed'));
    await expect(
      withAuthCleanup(
        async () => {
          throw primary;
        },
        async () => {
          throw new Error('sql failed');
        },
        user,
        report,
      ),
    ).rejects.toBe(primary);
    expect(user).toHaveBeenCalledOnce();
    expect(report).toHaveBeenCalledOnce();
  });
  it('fails a successful test when cleanup fails', async () => {
    await expect(
      withAuthCleanup(
        async () => {},
        async () => {
          throw new Error('sql failed');
        },
        async () => {},
        vi.fn(),
      ),
    ).rejects.toThrow('fixture cleanup failed');
  });
  it('rejects SQL injection and malformed API user IDs', () => {
    expect(() => requireUserUuid("x'; DELETE FROM public.accounts; --")).toThrow();
    expect(() => requireUserUuid('not-a-uuid')).toThrow();
    expect(requireUserUuid('71e8bd57-7431-411a-af85-1e453490df0f')).toBe(
      '71e8bd57-7431-411a-af85-1e453490df0f',
    );
  });
});
